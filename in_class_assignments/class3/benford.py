#!/usr/bin/env python3
"""Benford's law on the leading digits of three fast-growing sequences.

    python3 benford.py                 # interactive menu
    python3 benford.py 1 1000000       # sequence 1 (Fibonacci), n = 10^6
    python3 benford.py fact 5000 --method limb --show 3 --full

Benford's law: in many naturally growing data sets the leading digit d occurs
with probability log10(1 + 1/d) -- 30.1% ones, 4.6% nines.  The three sequences
here all grow fast enough to sweep across many decades, so their leading digits
equidistribute in log space and converge to Benford:

  1  Fibonacci    F_n ~ phi^n / sqrt(5)     ~0.209*n digits at term n
  2  Powers of 2  2^n                       ~0.301*n digits
  3  Factorials   n! ~ sqrt(2 pi n)(n/e)^n  ~n*log10(n) - 0.434*n digits

Four engines with different scaling stories.  Every engine produces the same
leading digits (see --verify); they differ in what else they can tell you and
in how they behave as n grows:

  limb   Exact, stored as a digit array: a little-endian list of base-10^9
         limbs (nine decimal characters packed per element).  Addition and
         multiply-by-small-int are carry loops; the leading digit is just the
         top limb and the digit count -- hence the exponent for scientific
         notation -- is free.  O(digits) per term, so O(n^2) or worse overall.

  exact  Python big ints.  Same asymptotics as `limb` with C-speed arithmetic,
         and the only engine that can print every digit of a huge term quickly.

  mant   Fixed-point mantissa: the top MANT_DIGITS decimal digits as a plain
         int, plus a separate decimal exponent.  Renormalized by integer
         division each step, so cost per term is constant no matter how large
         the term is.  Truncation error stays under n * 10^-40 -- irrelevant
         for a leading digit -- and it works for all three sequences.

  log    Closed-form logarithm in Decimal, at a precision derived from n:
         log10(F_n) = n*log10(phi) - log10(sqrt 5) + eps_n, log10(2^n) =
         n*log10(2), log10(n!) = sum log10(k).  O(1) per term for the first
         two.  For factorials it needs one high-precision logarithm per term
         (~37 us), which makes it the slowest engine here -- kept because it is
         an independent check on the other three.

`mant` and `log` never materialize the low-order digits, which is exactly why
they survive n in the millions.
"""

from __future__ import annotations

import argparse
import math
import os
import sys
import time
from bisect import bisect_right
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, localcontext
from functools import lru_cache
from typing import Callable, Iterator

GUARD = 6  # extra digits handed to the formatter so rounding ties are decided
           # by the true value, not by where an engine happened to cut off
SIG = 15   # significant digits shown in scientific notation
MANT_DIGITS = 40  # width of the fixed-point mantissa; 25 digits of headroom
                  # above SIG absorbs the per-step truncation error


# --------------------------------------------------------------------------
# Benford reference distribution
# --------------------------------------------------------------------------


@lru_cache(maxsize=1)
def benford_percentages() -> tuple[float, ...]:
    """Expected percentage for leading digits 1..9 (index 0 == digit 1)."""
    return tuple(100.0 * math.log10(1.0 + 1.0 / d) for d in range(1, 10))


@lru_cache(maxsize=4096)
def _pow10(k: int) -> int:
    """Cached powers of ten.

    Consecutive terms usually shift by the same number of digits, so this turns
    nearly every exponentiation in the hot loops into a dict hit.
    """
    return 10 ** k


# --------------------------------------------------------------------------
# Scientific notation
# --------------------------------------------------------------------------


def _format_sci(digits: str, exponent: int, sig: int = SIG) -> str:
    """'123456', 20  ->  '1.23456e+20'.

    Callers hand over a few more digits than `sig` and this rounds, so every
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


# --------------------------------------------------------------------------
# Engine 1: digit arrays ("limbs") -- exact, no big ints
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


def limb_mul_small(a: list[int], m: int) -> list[int]:
    """Multiply a digit array by a small int: O(len(a)).

    Each product fits a machine word as long as m < 2^63 / 10^9 (~9.2e9), which
    covers every factorial this script can realistically enumerate.
    """
    out = []
    carry = 0
    for av in a:
        prod = av * m + carry
        carry, rem = divmod(prod, BASE)
        out.append(rem)
    while carry:
        carry, rem = divmod(carry, BASE)
        out.append(rem)
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


def fib_limbs(n: int) -> Iterator[list[int]]:
    """F_1 .. F_n as digit arrays.  Rolling two-term state, O(1) extra memory."""
    a: list[int] = [0]
    b: list[int] = [1]
    for _ in range(n):
        yield b
        a, b = b, limb_add(a, b)


def pow2_limbs(n: int) -> Iterator[list[int]]:
    """2^1 .. 2^n as digit arrays -- repeated doubling, i.e. x + x."""
    x: list[int] = [1]
    for _ in range(n):
        x = limb_add(x, x)
        yield x


def fact_limbs(n: int) -> Iterator[list[int]]:
    """1! .. n! as digit arrays -- one small-int multiply per term."""
    x: list[int] = [1]
    for k in range(1, n + 1):
        x = limb_mul_small(x, k)
        yield x


# --------------------------------------------------------------------------
# Engine 2: Python big integers
# --------------------------------------------------------------------------


def fib_ints(n: int) -> Iterator[int]:
    """F_1 .. F_n exactly.

    We deliberately do NOT store the whole sequence: n terms hold O(n^2)
    digits (every term up to n = 10^6 is ~10 GB), while a rolling pair needs
    none of it.  Caching goes where it pays -- random access below.
    """
    a, b = 0, 1
    for _ in range(n):
        yield b
        a, b = b, a + b


def pow2_ints(n: int) -> Iterator[int]:
    """2^1 .. 2^n by shifting -- the cheapest exact engine in the script."""
    x = 1
    for _ in range(n):
        x <<= 1
        yield x


def fact_ints(n: int) -> Iterator[int]:
    """1! .. n! as a running product."""
    x = 1
    for k in range(1, n + 1):
        x *= k
        yield x


@lru_cache(maxsize=None)
def _fib_fast(n: int) -> tuple[int, int]:
    """(F_n, F_{n+1}) by memoized fast doubling: O(log n) big multiplies.

    The right tool for one huge term (F_(10^6) in under a millisecond); the
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
# Engine 3: fixed-point mantissa + exponent
# --------------------------------------------------------------------------
#
# Keep only the leading MANT_DIGITS decimal digits as an int, plus how far the
# decimal point was shifted.  Every step multiplies or adds as usual and then
# renormalizes by integer division, so the operands never grow: the cost per
# term is flat even when the true term has 200_000 digits.  Truncation always
# rounds down by less than one unit in the 40th significant digit, so after n
# steps the relative error is below n * 10^-40 -- some 25 orders of magnitude
# below what could disturb the digits we display.

_MANT_LIMIT = 10 ** MANT_DIGITS


def _mant_emit(m: int, exp: int, sig: int) -> tuple[int, str, int]:
    """(leading digit, sci digit string, decimal exponent) for m * 10^exp."""
    digits = str(m)
    return int(digits[0]), digits[: sig + GUARD], exp + len(digits) - 1


def fib_mants(n: int, sig: int = SIG) -> Iterator[tuple[int, str, int]]:
    """F_1 .. F_n as fixed-point mantissas.

    The pair shares one exponent: consecutive Fibonacci numbers are within a
    factor of phi, so no alignment shift is ever needed before adding.
    """
    a, b, exp = 0, 1, 0
    for _ in range(n):
        yield _mant_emit(b, exp, sig)
        a, b = b, a + b
        if b >= _MANT_LIMIT:
            shift = len(str(b)) - MANT_DIGITS
            p = _pow10(shift)
            a //= p
            b //= p
            exp += shift


def pow2_mants(n: int, sig: int = SIG) -> Iterator[tuple[int, str, int]]:
    m, exp = 1, 0
    for _ in range(n):
        m <<= 1
        if m >= _MANT_LIMIT:
            shift = len(str(m)) - MANT_DIGITS
            m //= _pow10(shift)
            exp += shift
        yield _mant_emit(m, exp, sig)


def fact_mants(n: int, sig: int = SIG) -> Iterator[tuple[int, str, int]]:
    m, exp = 1, 0
    for k in range(1, n + 1):
        m *= k
        if m >= _MANT_LIMIT:
            shift = len(str(m)) - MANT_DIGITS
            m //= _pow10(shift)
            exp += shift
        yield _mant_emit(m, exp, sig)


# --------------------------------------------------------------------------
# Engine 4: closed-form logarithms in Decimal
# --------------------------------------------------------------------------


def _log_precision(n: int, int_digits: int = 1) -> int:
    """Decimal digits needed so the fractional part stays trustworthy.

    Multiplying (or summing) n times pushes rounding error up by log10(n)
    digits, and the integer part of the logarithm -- 208_987 for F_(10^6) --
    consumes significant digits that the mantissa never sees.  Ask for both,
    plus a 25-digit guard band.
    """
    return int_digits + len(str(n)) + 25


@lru_cache(maxsize=8)
def _log_constants(prec: int) -> tuple[Decimal, Decimal, Decimal]:
    """(log10(phi), log10(sqrt 5), log10(2)) at `prec` digits, computed once."""
    with localcontext() as ctx:
        ctx.prec = prec + 10
        five = Decimal(5)
        root = five.sqrt()
        return +((1 + root) / 2).log10(), +root.log10(), +Decimal(2).log10()


@lru_cache(maxsize=8)
def _log_thresholds(prec: int) -> tuple[Decimal, ...]:
    """log10(2) .. log10(9) at `prec` digits.

    frac(log10 x) lands between log10(d) and log10(d+1) exactly when x leads
    with digit d, so one bisect replaces the 10**frac exponentiation for every
    term whose digits we are not going to print.
    """
    with localcontext() as ctx:
        ctx.prec = prec
        return tuple(Decimal(d).log10() for d in range(2, 10))


def _split(value: Decimal, one: Decimal) -> tuple[int, Decimal]:
    """log10 x  ->  (decimal exponent, fractional part).

    Splitting here rather than in the formatter matters: subtracting a six-digit
    integer part at display precision would eat six of the mantissa's digits.
    """
    exponent = int(value // one)
    return exponent, value - exponent


FIB_LOG_HEAD = 40  # below this, Binet's neglected term is not yet negligible


def fib_logs(n: int, start: int) -> Iterator[tuple[int, Decimal]]:
    """log10(F_k) = k*log10(phi) - log10(sqrt 5) + log10(1 - (-phi^-2)^k).

    The correction term is under 1e-16 by k = 40, so callers hand k < 40 to an
    exact engine.  One Decimal multiply per term, independent of term size.
    """
    prec = _log_precision(n, _int_digits(n * _LOG10_PHI))
    log_phi, log_sqrt5, _ = _log_constants(prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(k * log_phi - log_sqrt5, one)


def pow2_logs(n: int, start: int) -> Iterator[tuple[int, Decimal]]:
    """log10(2^k) = k * log10(2) -- exact identity, no approximation at all."""
    prec = _log_precision(n, _int_digits(n * _LOG10_2))
    _, _, log2 = _log_constants(prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(k * log2, one)


def fact_logs(n: int, start: int) -> Iterator[tuple[int, Decimal]]:
    """log10(k!) as a running sum of log10(k).

    Unlike the other two this needs a fresh high-precision logarithm per term
    (~37 us), so it is never the automatic choice -- it exists as an
    independent check on the mantissa engine.
    """
    prec = _log_precision(n, _int_digits(_log10_factorial(n)))
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        total = Decimal(0)
        for k in range(1, n + 1):
            total += Decimal(k).log10()
            if k >= start:
                yield _split(total, one)


_LOG10_PHI = math.log10((1 + 5 ** 0.5) / 2)


def _log10_factorial(n: int) -> float:
    """Float estimate of log10(n!), used only to size Decimal precision."""
    return math.lgamma(n + 1) / math.log(10)


def _int_digits(value: float) -> int:
    """Digits in the integer part of a positive float (at least 1)."""
    return max(1, len(str(int(value))))


def log_to_sci(exponent: int, frac: Decimal, sig: int = SIG) -> str:
    """Scientific notation from a split base-10 logarithm."""
    with localcontext() as ctx:
        ctx.prec = sig + GUARD
        mantissa = Decimal(10) ** frac
    return _format_sci(str(mantissa).replace(".", ""), exponent)


# --------------------------------------------------------------------------
# Sequence registry
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Sequence:
    number: int                  # menu number
    key: str                     # CLI name
    label: str                   # "Fibonacci numbers"
    span: str                    # "F_1 .. F_n"
    growth: str                  # digit-count growth, for the menu
    term_name: Callable[[int], str]
    limbs: Callable[[int], Iterator[list[int]]]
    ints: Callable[[int], Iterator[int]]
    mants: Callable[[int], Iterator[tuple[int, str, int]]]
    logs: Callable[[int, int], Iterator[tuple[int, Decimal]]]
    log_head: int                # terms the log engine cannot start from
    log_prec: Callable[[int], int]
    single: Callable[[int], int]  # one term, directly
    limb_max: int                # `auto` uses limbs up to here
    exact_max: int               # ... then big ints up to here, then `mant`


SEQUENCES: tuple[Sequence, ...] = (
    Sequence(
        number=1,
        key="fib",
        label="Fibonacci numbers",
        span="F_1 .. F_n",
        growth="~0.209*n digits at term n",
        term_name=lambda k: f"F_{k}",
        limbs=fib_limbs,
        ints=fib_ints,
        mants=fib_mants,
        logs=fib_logs,
        log_head=FIB_LOG_HEAD,
        log_prec=lambda n: _log_precision(n, _int_digits(n * _LOG10_PHI)),
        single=fib,
        limb_max=20_000,
        exact_max=200_000,
    ),
    Sequence(
        number=2,
        key="pow2",
        label="Powers of two",
        span="2^1 .. 2^n",
        growth="~0.301*n digits at term n",
        term_name=lambda k: f"2^{k}",
        limbs=pow2_limbs,
        ints=pow2_ints,
        mants=pow2_mants,
        logs=pow2_logs,
        log_head=0,
        log_prec=lambda n: _log_precision(n, _int_digits(n * _LOG10_2)),
        single=lambda k: 1 << k,
        limb_max=20_000,
        exact_max=500_000,   # shifting is far cheaper than adding
    ),
    Sequence(
        number=3,
        key="fact",
        label="Factorials",
        span="1! .. n!",
        growth="~n*log10(n) - 0.434*n digits at term n",
        term_name=lambda k: f"{k}!",
        limbs=fact_limbs,
        ints=fact_ints,
        mants=fact_mants,
        logs=fact_logs,
        log_head=0,
        log_prec=lambda n: _log_precision(n, _int_digits(_log10_factorial(n))),
        single=math.factorial,
        limb_max=5_000,      # terms grow n*log(n) digits: quadratic bites sooner
        exact_max=50_000,
    ),
)

BY_KEY = {s.key: s for s in SEQUENCES}
BY_NUMBER = {str(s.number): s for s in SEQUENCES}
METHODS = ("auto", "limb", "exact", "mant", "log")


def resolve_sequence(text: str) -> Sequence:
    """Accept a menu number or a key name."""
    text = text.strip().lower()
    if text in BY_NUMBER:
        return BY_NUMBER[text]
    if text in BY_KEY:
        return BY_KEY[text]
    raise ValueError(
        f"unknown sequence {text!r}; use 1/2/3 or " + "/".join(BY_KEY)
    )


def choose_method(seq: Sequence, n: int) -> str:
    """`auto`: exact digits while that is still cheap, then constant-cost."""
    if n <= seq.limb_max:
        return "limb"    # exact digit arrays, still instant here
    if n <= seq.exact_max:
        return "exact"   # C-speed big ints; digit arrays get slow
    return "mant"        # only constant cost per term survives millions


# --------------------------------------------------------------------------
# Unified term stream
# --------------------------------------------------------------------------


def _always(k: int) -> bool:
    return True


def terms(
    n: int,
    seq: Sequence,
    method: str,
    want_sci: Callable[[int], bool] = _always,
    want_full: bool = True,
) -> Iterator[tuple[int, int, str | None, str | None]]:
    """Yield (k, leading_digit, sci_or_None, full_digits_or_None) for k = 1..n.

    The leading digit is always produced -- that is what the histogram needs.
    The printable forms are built only for the terms `want_sci` selects, so a
    million-term run does not pay to format a million numbers nobody reads.
    """
    if method == "limb":
        for k, x in enumerate(seq.limbs(n), start=1):
            show = want_sci(k)
            yield (
                k,
                limb_leading_digit(x),
                limb_to_sci(x) if show else None,
                limb_to_str(x) if show and want_full else None,
            )

    elif method == "exact":
        for k, x in enumerate(seq.ints(n), start=1):
            yield k, leading_digit_int(x), int_to_sci(x) if want_sci(k) else None, None

    elif method == "mant":
        for k, (digit, digits, exponent) in enumerate(seq.mants(n), start=1):
            yield k, digit, _format_sci(digits, exponent) if want_sci(k) else None, None

    elif method == "log":
        head = min(n, seq.log_head)
        if head:
            for k, x in enumerate(seq.ints(head), start=1):
                show = want_sci(k)
                yield k, leading_digit_int(x), int_to_sci(x) if show else None, None
        if n <= head:
            return
        thresholds = _log_thresholds(seq.log_prec(n))
        for k, (exponent, frac) in enumerate(seq.logs(n, head + 1), start=head + 1):
            # frac lands between log10(d) and log10(d+1) exactly when the term
            # leads with digit d -- cheaper than evaluating 10**frac.
            digit = bisect_right(thresholds, frac) + 1
            yield k, digit, log_to_sci(exponent, frac) if want_sci(k) else None, None

    else:
        raise ValueError(f"unknown method {method!r}")


# --------------------------------------------------------------------------
# Statistics and timing
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


def format_duration(seconds: float) -> str:
    """Human-readable wall time: us / ms / s / m s."""
    if seconds < 1e-3:
        return f"{seconds * 1e6:.1f} us"
    if seconds < 1.0:
        return f"{seconds * 1e3:.1f} ms"
    if seconds < 60.0:
        return f"{seconds:.3f} s"
    minutes, rest = divmod(seconds, 60.0)
    return f"{int(minutes)}m {rest:.1f}s"


def timing_lines(n: int, elapsed: float, formatted: int) -> list[str]:
    """Wall time plus the derived per-term cost.

    Per-term cost is the interesting number: flat for `mant` and `log`, rising
    with n for `limb` and `exact`.  That is the O(n) vs O(n^2) split.
    """
    lines = [
        f"elapsed (generate+count): {format_duration(elapsed)}",
        f"  per term              : {format_duration(elapsed / n)}"
        f"   ({n / elapsed:,.0f} terms/s)",
    ]
    if formatted:
        lines.append(f"  terms formatted       : {formatted} (the rest skip sci notation)")
    return lines


def report(
    seq: Sequence,
    n: int,
    counts: list[int],
    method: str,
    last_sci: str,
    timings: list[str] | None = None,
) -> str:
    total = sum(counts)
    expected = benford_percentages()
    span = seq.span.replace("n", str(n))
    lines = [
        "",
        f"{seq.label} leading digits: {span}   (method: {method})",
        f"positive terms counted  : {total}",
        f"{seq.term_name(n)} = {last_sci}",
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
    if timings:
        lines += ["", *timings]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# The run itself
# --------------------------------------------------------------------------


def run(
    seq: Sequence,
    n: int,
    method: str = "auto",
    show: int = 0,
    full: bool = False,
    csv_path: str | None = None,
) -> list[int]:
    """Generate, count, time and report.  Returns the nine digit counts."""
    if method == "auto":
        method = choose_method(seq, n)
    if full and method != "limb":
        print(f"note: --full needs exact digits; switching method {method} -> limb",
              file=sys.stderr)
        method = "limb"

    show = min(show, n)
    tail_from = n - show

    def wanted(k: int) -> bool:
        return k == n or (show > 0 and (k <= show or k > tail_from))

    counts = [0] * 10
    last_sci = ""
    formatted = 0

    # Time generation + digit extraction + counting only.  Printing shown terms
    # is I/O and would otherwise pollute the measurement, so it is subtracted.
    started = time.perf_counter()
    print_time = 0.0

    for k, digit, sci, full_digits in terms(n, seq, method, wanted, full):
        counts[digit] += 1
        if sci is not None:
            last_sci = sci
            formatted += 1
        if show and (k <= show or k > tail_from):
            io_started = time.perf_counter()
            if k == tail_from + 1 and tail_from > show:
                print(f"  ... {tail_from - show} terms omitted ...")
            print(f"{seq.term_name(k):<12} = {sci:<26} lead={digit}")
            if full and full_digits is not None:
                print(f"            {full_digits}")
            print_time += time.perf_counter() - io_started

    elapsed = time.perf_counter() - started - print_time

    if counts[0]:
        raise AssertionError("a leading digit of 0 should be impossible")
    counts = counts[1:]
    print(report(seq, n, counts, method, last_sci, timing_lines(n, elapsed, formatted)))

    if csv_path:
        total = sum(counts)
        with open(csv_path, "w") as fh:
            fh.write("digit,count,observed_pct,benford_pct\n")
            for d, (c, pct) in enumerate(zip(counts, benford_percentages()), start=1):
                fh.write(f"{d},{c},{100.0 * c / total:.6f},{pct:.6f}\n")
        print(f"\nwrote {csv_path}")
    return counts


def print_single_term(seq: Sequence, k: int) -> int:
    """One term on its own, in full, with both costs timed separately."""
    started = time.perf_counter()
    value = seq.single(k)
    compute = time.perf_counter() - started

    # str(int) is capped at 4300 digits by default; these terms blow past that.
    sys.set_int_max_str_digits(1_000_000_000)
    started = time.perf_counter()
    text = str(value)
    to_decimal = time.perf_counter() - started

    print(f"{seq.term_name(k)} = {int_to_sci(value)}   ({len(text)} digits)")
    print(f"  compute        : {format_duration(compute)}")
    print(f"  int -> digits  : {format_duration(to_decimal)}")
    print(text)
    return 0


def verify(seq: Sequence, m: int) -> int:
    """Cross-check every engine on the same terms, and time each one."""
    streams: dict[str, list] = {}
    for name in ("limb", "exact", "mant", "log"):
        started = time.perf_counter()
        streams[name] = list(terms(m, seq, name, want_full=False))
        print(f"  {name:6s}: {format_duration(time.perf_counter() - started)}"
              f" for {m} terms")

    reference = streams["limb"]
    bad = 0
    for name, rows in streams.items():
        if name == "limb":
            continue
        for (k, d1, s1, _), (_, d2, s2, _) in zip(reference, rows):
            if d1 != d2 or s1 != s2:
                bad += 1
                if bad <= 10:
                    print(f"  mismatch at {seq.term_name(k)}: "
                          f"limb={d1} {s1}  {name}={d2} {s2}")
    print(f"compared {m} terms of {seq.label.lower()} across four engines; "
          f"mismatches: {bad}")
    return 1 if bad else 0


# --------------------------------------------------------------------------
# Interactive menu
# --------------------------------------------------------------------------

MENU_HEADER = "Benford's law explorer -- leading digits of fast-growing sequences"


def _ask(prompt: str) -> str:
    """input() that treats EOF/Ctrl-C as 'quit' rather than a traceback."""
    try:
        return input(prompt)
    except (EOFError, KeyboardInterrupt):
        print()
        raise SystemExit(0)


def interactive() -> int:
    print(MENU_HEADER)
    while True:
        print("\nWhich sequence?")
        for seq in SEQUENCES:
            print(f"  {seq.number}) {seq.label:<20} {seq.span:<12} {seq.growth}")
        print("  q) quit")

        choice = _ask("select [1-3, q]: ").strip().lower()
        if choice in ("q", "quit", "exit"):
            return 0
        try:
            seq = resolve_sequence(choice)
        except ValueError as exc:
            print(f"  {exc}")
            continue

        raw = _ask(f"how many terms of {seq.label.lower()} (n)? ").strip()
        try:
            n = int(raw)
            if n < 1:
                raise ValueError
        except ValueError:
            print("  n must be a positive integer")
            continue

        method = choose_method(seq, n)
        print(f"\ncomputing {seq.span.replace('n', str(n))} "
              f"with the '{method}' engine ...")
        run(seq, n, method=method, show=3)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Leading-digit / Benford analysis of Fibonacci numbers, "
                    "powers of two and factorials.  Run with no arguments for "
                    "an interactive menu.",
    )
    p.add_argument(
        "sequence",
        nargs="?",
        help="1/fib, 2/pow2, or 3/fact (omit for the interactive menu)",
    )
    p.add_argument("n", type=int, nargs="?", help="number of terms to generate")
    p.add_argument("--method", choices=METHODS, default="auto",
                   help="auto picks limb / exact / mant by n (see module docstring)")
    p.add_argument("--show", type=int, default=0, metavar="K",
                   help="print the first K and last K terms in scientific notation")
    p.add_argument("--full", action="store_true",
                   help="with --show, also print every digit (forces an exact engine)")
    p.add_argument("--term", type=int, metavar="K",
                   help="print term K exactly, in full, then exit")
    p.add_argument("--csv", metavar="PATH", help="write digit,count,observed,benford")
    p.add_argument("--verify", type=int, metavar="M",
                   help="cross-check all four engines on the first M terms, then exit")
    args = p.parse_args(argv)

    if args.sequence is None:
        args.seq = None
        return args
    try:
        args.seq = resolve_sequence(args.sequence)
    except ValueError as exc:
        p.error(str(exc))
    if args.n is None and args.term is None and args.verify is None:
        p.error("n is required unless --term or --verify is given")
    if args.n is not None and args.n < 1:
        p.error("n must be >= 1")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.seq is None:
        return interactive()
    if args.term:
        return print_single_term(args.seq, args.term)
    if args.verify:
        return verify(args.seq, args.verify)
    run(args.seq, args.n, args.method, args.show, args.full, args.csv)
    return 0


if __name__ == "__main__":
    try:
        code = main()
        sys.stdout.flush()   # surface a closed pipe here, not at exit time
        sys.exit(code)
    except BrokenPipeError:
        # e.g. `benford.py 3 --term 100000 | head`: the reader went away.
        # Point stdout at /dev/null so the interpreter's exit-time flush of
        # whatever is still buffered does not raise a second time.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        sys.exit(0)
