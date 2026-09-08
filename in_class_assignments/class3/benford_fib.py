#!/usr/bin/env python3
"""Benford's law on the leading digits of the Fibonacci sequence.

    python3 benford_fib.py N [--method auto|limb|exact|log] [options]

Benford's law: in many naturally growing data sets the leading digit d occurs
with probability log10(1 + 1/d) -- 30.1% ones, 4.6% nines.  Fibonacci numbers
grow geometrically (F_n ~ phi^n / sqrt(5)), and the leading digits of a
geometric sequence whose ratio is not a rational power of 10 are equidistributed
in log space, so they obey Benford exactly in the limit.  This script measures
the convergence, prints the terms themselves in scientific notation, and shows
where each implementation strategy falls over as N grows.

Three engines, each with a different scaling story:

  limb   Exact, stored as a digit array: a little-endian list of base-10^9
         limbs (nine decimal characters packed per element).  Addition is a
         carry loop, the leading digit is just the top limb, and the digit
         count -- hence the exponent for scientific notation -- is free.
         O(digits) per term => O(N^2) total, so good to ~10^5 terms.

  exact  Python big ints (arbitrary precision comes for free).  Same O(N^2)
         asymptotics as `limb`, but with C-speed addition; used as ground
         truth, and `fib()` gives O(log N) random access to a single term.

  log    No integers at all: log10(F_n) = n*log10(phi) - log10(sqrt 5) + eps_n
         in Decimal, at a precision derived from N.  O(1) work and O(1) memory
         per term -- the only engine that reaches N in the millions.  Gives
         mantissa and exponent directly, i.e. scientific notation, but cannot
         show you the low-order digits.
"""

from __future__ import annotations

import argparse
import math
import sys
from bisect import bisect_right
from decimal import ROUND_HALF_UP, Decimal, localcontext
from functools import lru_cache
from typing import Iterator

# --------------------------------------------------------------------------
# Benford reference distribution
# --------------------------------------------------------------------------

GUARD = 6  # extra digits handed to the formatter so rounding ties are decided
           # by the true value, not by where an engine happened to cut off
SIG = 15  # significant digits shown in scientific notation (log engine is
          # good to ~12; 15 leaves room and still fits a float's worth of info)


@lru_cache(maxsize=1)
def benford_percentages() -> tuple[float, ...]:
    """Expected percentage for leading digits 1..9 (index 0 == digit 1)."""
    return tuple(100.0 * math.log10(1.0 + 1.0 / d) for d in range(1, 10))


# --------------------------------------------------------------------------
# Engine 1: digit-array ("limb") Fibonacci -- exact, no big ints
# --------------------------------------------------------------------------
#
# A number is a list of ints, little-endian, each holding 9 decimal digits:
#
#     12_345_678_901_234  ->  [678901234, 12345]
#
# A literal char array (one digit per byte) works the same way and is easier to
# read, but wastes 9x the memory traffic and 9x the loop iterations; packing to
# base 10^9 keeps every limb inside a machine word while staying decimal, so
# printing and leading-digit extraction need no division by 10.

LIMB_DIGITS = 9
BASE = 10 ** LIMB_DIGITS


def limb_add(a: list[int], b: list[int]) -> list[int]:
    """Schoolbook addition on digit arrays: O(max(len(a), len(b)))."""
    if len(a) < len(b):
        a, b = b, a
    out = []
    carry = 0
    for i, av in enumerate(a):
        s = av + carry + (b[i] if i < len(b) else 0)
        if s >= BASE:
            out.append(s - BASE)
            carry = 1
        else:
            out.append(s)
            carry = 0
    if carry:
        out.append(carry)
    return out


def limb_digit_count(x: list[int]) -> int:
    return (len(x) - 1) * LIMB_DIGITS + len(str(x[-1]))


def limb_leading_digit(x: list[int]) -> int:
    """Top decimal digit -- read straight off the most significant limb."""
    top = x[-1]
    while top >= 10:
        top //= 10
    return top


def limb_to_str(x: list[int]) -> str:
    """Full decimal expansion."""
    head = str(x[-1])
    return head + "".join(str(limb).zfill(LIMB_DIGITS) for limb in reversed(x[:-1]))


def limb_to_sci(x: list[int], sig: int = SIG) -> str:
    """Scientific notation without expanding the whole number.

    Only the top few limbs are touched, so this stays O(1) even when the term
    has hundreds of thousands of digits.
    """
    needed = (sig + GUARD) // LIMB_DIGITS + 2
    chunk = str(x[-1]) + "".join(
        str(limb).zfill(LIMB_DIGITS) for limb in reversed(x[max(0, len(x) - needed):-1])
    )
    return _format_sci(chunk[: sig + GUARD], limb_digit_count(x) - 1)


def _format_sci(digits: str, exponent: int, sig: int = SIG) -> str:
    """'123456', 20  ->  '1.23456e+20'.

    Callers hand over a few more digits than `sig` and this rounds -- so every
    engine formats the same value identically instead of one truncating where
    another rounds.  Decimal also handles the 9.99...9 -> 10 carry.
    """
    with localcontext() as ctx:
        ctx.prec = sig
        ctx.rounding = ROUND_HALF_UP
        mantissa = +Decimal(digits[0] + "." + digits[1:] if len(digits) > 1 else digits)
        if mantissa >= 10:
            mantissa /= 10
            exponent += 1
    return f"{format(mantissa.normalize(), 'f')}e{exponent:+d}"


def fib_limbs(n: int) -> Iterator[list[int]]:
    """Yield F_1 .. F_n as digit arrays.  Two-term rolling state, O(1) extra."""
    a: list[int] = [0]
    b: list[int] = [1]
    for _ in range(n):
        yield b
        a, b = b, limb_add(a, b)


# --------------------------------------------------------------------------
# Engine 2: exact big-integer Fibonacci
# --------------------------------------------------------------------------


def fib_ints(n: int) -> Iterator[int]:
    """Yield F_1 .. F_n exactly.

    We deliberately do NOT store the whole sequence: N Fibonacci numbers hold
    O(N^2) digits (all terms up to N=100_000 is already gigabytes), while a
    rolling pair needs none of it.  Caching goes where it actually pays --
    random access below, and the constants further down.
    """
    a, b = 0, 1
    for _ in range(n):
        yield b
        a, b = b, a + b


@lru_cache(maxsize=None)
def _fib_fast(n: int) -> tuple[int, int]:
    """(F_n, F_{n+1}) by memoized fast doubling: O(log n) big multiplies.

    The right tool for one huge term (`fib(10**6)` returns in seconds); the
    wrong tool for enumerating every term, where plain addition wins.
    """
    if n == 0:
        return 0, 1
    a, b = _fib_fast(n >> 1)
    c = a * (2 * b - a)      # F_2k
    d = a * a + b * b        # F_2k+1
    return (c, d) if not n & 1 else (d, c + d)


def fib(n: int) -> int:
    return _fib_fast(n)[0]


_LOG10_2 = math.log10(2)


@lru_cache(maxsize=4096)
def _pow10(k: int) -> int:
    """Cached powers of ten.

    Consecutive Fibonacci numbers have the same digit count or one more, so
    this turns nearly every exponentiation in the hot loop into a dict hit.
    """
    return 10 ** k


def leading_digit_int(x: int) -> int:
    """First decimal digit of a positive int, without stringifying it.

    `str(x)[0]` is the obvious move and a trap: CPython caps int->str at 4300
    digits (ValueError: Exceeds the limit for integer string conversion) and
    the conversion is quadratic besides.  Estimate the digit count from
    bit_length -- off by at most one -- then shift the top digits down.
    """
    if x <= 0:
        raise ValueError("leading digit is only defined for positive integers")
    if x < 10:
        return x
    ndigits = int(x.bit_length() * _LOG10_2) + 1
    if ndigits > 2:
        x //= _pow10(ndigits - 2)
    while x >= 10:
        x //= 10
    return x


def int_to_sci(x: int, sig: int = SIG) -> str:
    ndigits = int(x.bit_length() * _LOG10_2) + 1
    shifted = max(0, ndigits - sig - GUARD - 2)
    if shifted:
        x //= _pow10(shifted)
    digits = str(x)
    return _format_sci(digits[: sig + GUARD], len(digits) - 1 + shifted)


# --------------------------------------------------------------------------
# Engine 3: logarithmic / Decimal Fibonacci
# --------------------------------------------------------------------------


def _log_precision(n: int) -> int:
    """Decimal digits needed for frac(n * log10(phi)) to stay trustworthy.

    Multiplying by n pushes the error up by log10(n) digits; we want ~12 good
    digits in the fractional part, plus a guard band.
    """
    return len(str(n)) + 25


@lru_cache(maxsize=8)
def _log_constants(prec: int) -> tuple[Decimal, Decimal]:
    """(log10(phi), log10(sqrt 5)) at `prec` digits -- computed once per prec."""
    with localcontext() as ctx:
        ctx.prec = prec + 10
        five = Decimal(5)
        root = five.sqrt()
        return +((1 + root) / 2).log10(), +root.log10()


def fib_logs(n: int, start: int = 1) -> Iterator[tuple[int, Decimal]]:
    """Yield (exponent, fraction) of log10(F_k) for k = start..n, via Binet.

    log10(F_n) = n*log10(phi) - log10(sqrt 5) + log10(1 - (-phi^-2)^n)

    The correction term is under 1e-16 by n = 40, so this engine is only used
    from there up.  One Decimal multiply per term, independent of how many
    digits F_n has.  Splitting the logarithm here rather than in the formatter
    matters: the integer part is the decimal exponent (208_987 for n = 10^6)
    and subtracting it at display precision would eat six of the fractional
    digits we need for the mantissa.
    """
    prec = _log_precision(n)
    log_phi, log_sqrt5 = _log_constants(prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            value = k * log_phi - log_sqrt5
            exponent = int(value // one)
            yield exponent, value - exponent


@lru_cache(maxsize=8)
def _log_thresholds(prec: int) -> tuple[Decimal, ...]:
    """log10(2) .. log10(9) at `prec` digits.

    frac(log10 x) falls between log10(d) and log10(d+1) exactly when x leads
    with digit d, so one bisect replaces the 10**frac exponentiation for every
    term whose digits we are not going to print.  This is the difference
    between ~20 us and ~4 us per term at n = 10^6.
    """
    with localcontext() as ctx:
        ctx.prec = prec
        return tuple(Decimal(d).log10() for d in range(2, 10))


LOG_EXACT_BELOW = 40  # below this, Binet's neglected term is not yet negligible


def log_to_sci(exponent: int, frac: Decimal, sig: int = SIG) -> str:
    """Scientific notation from a split base-10 logarithm: 10**frac, e**exponent."""
    with localcontext() as ctx:
        # Compute with guard digits, then round to exactly `sig` significant
        # digits.  Truncating instead would show 1.65580141 as 1.6558014099.
        ctx.prec = sig + GUARD
        mantissa = Decimal(10) ** frac
    return _format_sci(str(mantissa).replace(".", ""), exponent)


# --------------------------------------------------------------------------
# Unified term stream
# --------------------------------------------------------------------------


def _always(k: int) -> bool:
    return True


def terms(
    n: int,
    method: str,
    want_sci=_always,
    want_full: bool = True,
) -> Iterator[tuple[int, int, str | None, str | None]]:
    """Yield (k, leading_digit, sci_or_None, full_digits_or_None) for F_1..F_n.

    The leading digit is always produced -- that is what the histogram needs.
    The printable forms are built only for the terms `want_sci(k)` selects, so
    a million-term run does not pay to format a million numbers nobody reads.
    """
    if method == "limb":
        for k, x in enumerate(fib_limbs(n), start=1):
            show = want_sci(k)
            yield (
                k,
                limb_leading_digit(x),
                limb_to_sci(x) if show else None,
                limb_to_str(x) if show and want_full else None,
            )
    elif method == "exact":
        for k, x in enumerate(fib_ints(n), start=1):
            yield k, leading_digit_int(x), int_to_sci(x) if want_sci(k) else None, None
    elif method == "log":
        head = min(n, LOG_EXACT_BELOW)
        for k, x in enumerate(fib_ints(head), start=1):
            show = want_sci(k)
            yield k, leading_digit_int(x), int_to_sci(x) if show else None, str(x) if show else None
        thresholds = _log_thresholds(_log_precision(n))
        for k, (exponent, frac) in enumerate(fib_logs(n, start=head + 1), start=head + 1):
            digit = bisect_right(thresholds, frac) + 1
            yield k, digit, log_to_sci(exponent, frac) if want_sci(k) else None, None
    else:
        raise ValueError(f"unknown method {method!r}")


def choose_method(n: int) -> str:
    if n <= 20_000:
        return "limb"        # exact digit arrays, still instant here
    if n <= 200_000:
        return "exact"       # C-speed big ints; digit arrays get slow
    return "log"             # only O(1)/term survives millions of terms


# --------------------------------------------------------------------------
# Statistics and reporting
# --------------------------------------------------------------------------


def chi_square(counts: list[int]) -> float:
    """Pearson chi-square against Benford, 8 degrees of freedom.

    Critical values: 15.51 (p=0.05), 20.09 (p=0.01).
    """
    total = sum(counts)
    stat = 0.0
    for observed, pct in zip(counts, benford_percentages()):
        expected = total * pct / 100.0
        stat += (observed - expected) ** 2 / expected
    return stat


def report(n: int, counts: list[int], method: str, last_sci: str) -> str:
    total = sum(counts)
    expected = benford_percentages()
    lines = [
        "",
        f"Fibonacci leading digits: F_1 .. F_{n}   (method: {method})",
        f"positive terms counted  : {total}",
        f"F_{n} = {last_sci}",
        "",
        "digit      count     observed %    Benford %       diff",
        "-" * 57,
    ]
    worst = 0.0
    for digit, (count, pct) in enumerate(zip(counts, expected), start=1):
        obs = 100.0 * count / total
        diff = obs - pct
        worst = max(worst, abs(diff))
        lines.append(f"  {digit}   {count:11d}      {obs:6.2f}%      {pct:6.2f}%   {diff:+9.4f}")
    lines += [
        "-" * 57,
        f"max absolute deviation : {worst:.4f} percentage points",
        f"chi-square (8 dof)     : {chi_square(counts):.4f}"
        "   [15.51 = p0.05, 20.09 = p0.01]",
    ]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Test Benford's law on the leading digits of F_1..F_n.",
    )
    p.add_argument(
        "n",
        type=int,
        nargs="?",
        help="number of Fibonacci terms to generate",
    )
    p.add_argument(
        "--method",
        choices=("auto", "limb", "exact", "log"),
        default="auto",
        help="auto: limb <=20k terms, big ints <=200k, logarithmic above",
    )
    p.add_argument(
        "--show",
        type=int,
        default=0,
        metavar="K",
        help="print the first K and last K terms in scientific notation",
    )
    p.add_argument(
        "--full",
        action="store_true",
        help="with --show, also print every digit (needs an exact method)",
    )
    p.add_argument(
        "--term",
        type=int,
        metavar="K",
        help="print F_K exactly, in full and in scientific notation, then exit",
    )
    p.add_argument("--csv", metavar="PATH", help="write digit,count,observed,benford")
    p.add_argument(
        "--verify",
        type=int,
        metavar="M",
        help="cross-check all three engines on the first M terms, then exit",
    )
    args = p.parse_args(argv)
    if args.n is None:
        if args.term is None and args.verify is None:
            p.error("n is required unless --term or --verify is given")
    elif args.n < 1:
        p.error("n must be >= 1")
    return args


def _print_single_term(k: int) -> int:
    """F_K on its own, via fast doubling."""
    value = fib(k)
    # str(int) is capped at 4300 digits by default; F_1e6 has ~209k.
    sys.set_int_max_str_digits(max(4300, int(k * 0.21) + 1000))
    print(f"F_{k} = {int_to_sci(value)}   ({len(str(value))} digits)")
    print(str(value))
    return 0


def _verify(m: int) -> int:
    streams = {name: list(terms(m, name, want_full=False)) for name in ("limb", "exact", "log")}
    ref = streams["limb"]
    bad = 0
    for name, rows in streams.items():
        if name == "limb":
            continue
        for (k, d1, s1, _), (_, d2, s2, _) in zip(ref, rows):
            # Compare leading digits always, and mantissas to 12 places.
            if d1 != d2 or s1 != s2:
                bad += 1
                if bad <= 10:
                    print(f"  mismatch at F_{k}: limb={d1} {s1}  {name}={d2} {s2}")
    print(f"compared {m} terms across limb/exact/log; mismatches: {bad}")
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.term:
        return _print_single_term(args.term)
    if args.verify:
        return _verify(args.verify)

    method = choose_method(args.n) if args.method == "auto" else args.method
    if args.full and method != "limb":
        print(f"note: --full needs exact digits; switching method {method} -> limb",
              file=sys.stderr)
        method = "limb"

    show = min(args.show, args.n)
    tail_from = args.n - show
    n = args.n

    def wanted(k: int) -> bool:
        return k == n or (show > 0 and (k <= show or k > tail_from))

    counts = [0] * 10
    last_sci = ""

    for k, digit, sci, full in terms(n, method, wanted, args.full):
        counts[digit] += 1
        if sci is not None:
            last_sci = sci
        if show and (k <= show or k > tail_from):
            if k == tail_from + 1 and tail_from > show:
                print(f"  ... {tail_from - show} terms omitted ...")
            print(f"F_{k:<9} = {sci:<26} lead={digit}")
            if args.full and full is not None:
                print(f"            {full}")

    if counts[0]:
        raise AssertionError("a leading digit of 0 should be impossible")
    counts = counts[1:]
    print(report(args.n, counts, method, last_sci))

    if args.csv:
        total = sum(counts)
        with open(args.csv, "w") as fh:
            fh.write("digit,count,observed_pct,benford_pct\n")
            for d, (c, pct) in enumerate(zip(counts, benford_percentages()), start=1):
                fh.write(f"{d},{c},{100.0 * c / total:.6f},{pct:.6f}\n")
        print(f"\nwrote {args.csv}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:
        # e.g. `benford_fib.py --term 1000000 | head`: the reader went away.
        sys.stderr.close()
        sys.exit(0)
