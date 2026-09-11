#!/usr/bin/env python3
"""Benford's law on the leading digits of fast-growing integer sequences.

    python3 benford.py                    # list every sequence and its words
    python3 benford.py fibonacci 1000000  # any word from the library selects one
    python3 benford.py power2 1000000 --show 3
    python3 benford.py factorial 1000000 --html chart.html
    python3 benford.py --file numbers.txt # real data, same analysis

Every run prints the observed percentages beside the theoretical Benford ones,
as a table and as a bar chart; --html writes the same comparison as a
standalone HTML/SVG chart.  Everything is driven by arguments, nothing prompts.  Each sequence answers to
several words (`fib`, `fibonacci`, `f`, `1` all mean the same thing); the full
word library is in the registry below and `python3 benford.py --list` prints
it.

Benford's law: in many naturally growing data sets the leading digit d occurs
with probability log10(1 + 1/d) -- 30.1% ones, 4.6% nines.  A sequence obeys it
when frac(log10 x_k) equidistributes on [0,1), which happens when the sequence
sweeps across decades without ever settling into step with powers of ten.

Ten sequences ship here, in two groups.  Eight grow geometrically or faster and
converge to Benford; two grow polynomially and provably do not, which makes them
the control group -- if your test cannot tell these apart, it is not testing
anything.  Any file of numbers can be run through the same counting and
reporting with --file.

Four engines, all producing identical leading digits (see --verify), differing
in what else they can show and how they scale:

  limb   Exact, stored as a digit array: a little-endian list of base-10^9
         limbs (nine decimal characters packed per element).  Add, multiply by
         a small int and divide by a small int are carry loops; the leading
         digit is just the top limb and the digit count -- hence the exponent
         for scientific notation -- is free.  O(digits) per term.

  exact  Python big ints.  Same asymptotics as `limb` with C-speed arithmetic,
         and the only engine that can print every digit of a huge term quickly.

  mant   Fixed-point mantissa: the top MANT_DIGITS decimal digits as a plain
         int, plus a separate decimal exponent, renormalized by integer
         division each step.  Constant cost per term no matter how large the
         term is, and truncation error stays under n * 10^-40.  This is what
         reaches n in the millions.

  log    Closed-form or running-sum logarithm in Decimal, at a precision
         derived from n.  Constant cost per term for the geometric sequences;
         for factorial-like ones it needs a fresh high-precision logarithm per
         term (~37 us), so it serves as an independent check rather than the
         fast path.

`mant` and `log` never materialize the low-order digits, which is exactly why
they survive large n -- see the "what breaks" notes at the bottom of --help.
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import time
from bisect import bisect_right
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, localcontext
from difflib import get_close_matches
from functools import lru_cache
from typing import Callable, Iterator, Sequence as Seq

GUARD = 6  # extra digits handed to the formatter so rounding ties are decided
           # by the true value, not by where an engine happened to cut off
SIG = 15   # significant digits shown in scientific notation
MANT_DIGITS = 40  # width of the fixed-point mantissa; 25 digits of headroom
                  # above SIG absorbs the per-step truncation error

LN10 = math.log(10)
_LOG10_2 = math.log10(2)
_LOG10_PHI = math.log10((1 + 5 ** 0.5) / 2)


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
# Digit arrays ("limbs")
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

    Each product stays inside a machine word while m < 2^63 / 10^9 (~9.2e9),
    which covers every multiplier these sequences generate.
    """
    out = []
    carry = 0
    for av in a:
        carry, rem = divmod(av * m + carry, BASE)
        out.append(rem)
    while carry:
        carry, rem = divmod(carry, BASE)
        out.append(rem)
    return out


def limb_div_small(a: list[int], m: int) -> list[int]:
    """Divide a digit array by a small int, top limb first: O(len(a)).

    Used only where the division is exact (Catalan and binomial recurrences),
    so the discarded remainder is always zero.
    """
    out = [0] * len(a)
    rem = 0
    for i in range(len(a) - 1, -1, -1):
        cur = rem * BASE + a[i]
        out[i], rem = divmod(cur, m)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def limb_from_int(x: int) -> list[int]:
    """Convert a (small) int to a digit array -- used by the formula family."""
    if x == 0:
        return [0]
    out = []
    while x:
        x, rem = divmod(x, BASE)
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


# --------------------------------------------------------------------------
# Big-int helpers
# --------------------------------------------------------------------------


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


def lucas(n: int) -> int:
    """L_n = 2*F_(n+1) - F_n."""
    a, b = _fib_fast(n)
    return 2 * b - a


@lru_cache(maxsize=4)
def first_primes(count: int) -> list[int]:
    """The first `count` primes, by sieve of Eratosthenes.

    Sized from the p_n < n(ln n + ln ln n) bound with 5% slack.  For n = 10^6
    that is a ~16 MB bytearray -- the one place in this script where memory,
    not time, is the binding constraint.
    """
    if count < 6:
        bound = 15
    else:
        bound = int(count * (math.log(count) + math.log(math.log(count))) * 1.05) + 10
    sieve = bytearray([1]) * (bound + 1)
    sieve[0:2] = b"\x00\x00"
    for i in range(2, int(bound ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i :: i] = bytearray(len(range(i * i, bound + 1, i)))
    primes = [i for i, is_prime in enumerate(sieve) if is_prime]
    if len(primes) < count:  # bound was optimistic; retry with more room
        return first_primes(int(count * 1.2) + 100)[:count]
    return primes[:count]


def primorial(n: int) -> int:
    return math.prod(first_primes(n))


def catalan(n: int) -> int:
    return math.comb(2 * n, n) // (n + 1)


# --------------------------------------------------------------------------
# Fixed-point mantissa helpers
# --------------------------------------------------------------------------
#
# Keep only the leading MANT_DIGITS decimal digits as an int, plus how far the
# decimal point was shifted.  Every step does its arithmetic as usual and then
# renormalizes by integer division, so the operands never grow: cost per term
# is flat even when the true term has 200_000 digits.  Truncation always rounds
# down by less than one unit in the 40th significant digit, so after n steps
# the relative error is below n * 10^-40 -- some 25 orders of magnitude below
# anything that could disturb the digits we display.

_MANT_LIMIT = 10 ** MANT_DIGITS


def _mant_emit(m: int, exp: int, sig: int = SIG) -> tuple[int, str, int]:
    """(leading digit, sci digit string, decimal exponent) for m * 10^exp."""
    digits = str(m)
    return int(digits[0]), digits[: sig + GUARD], exp + len(digits) - 1


# --------------------------------------------------------------------------
# Sequence families
# --------------------------------------------------------------------------
#
# Rather than four hand-written engines per sequence, each sequence declares
# which of three shapes it has, and the engines are derived from that:
#
#   ADD      x_k = x_(k-1) + x_(k-2)          Fibonacci, Lucas
#   RATIO    x_k = x_(k-1) * num(k) / den(k)  factorial, Catalan, primorial, 2^k
#   FORMULA  x_k = f(k)                       triangular numbers, squares
#
# Adding a sequence is then a registry entry, not a new set of loops.

ADD, RATIO, FORMULA = "add", "ratio", "formula"


@dataclass(frozen=True)
class Ratio:
    """x_k = x_(k-1) * num(k) // den(k), with the division always exact."""
    num: Callable[[int], int]
    den: Callable[[int], int] | None = None


# ---- ADD family ----------------------------------------------------------


def add_limbs(a0: int, b0: int, n: int) -> Iterator[list[int]]:
    """Rolling two-term state as digit arrays, O(1) extra memory."""
    a, b = limb_from_int(a0), limb_from_int(b0)
    for _ in range(n):
        yield b
        a, b = b, limb_add(a, b)


def add_ints(a0: int, b0: int, n: int) -> Iterator[int]:
    """Rolling two-term state as big ints.

    We deliberately do NOT store the whole sequence: n terms hold O(n^2)
    digits (every Fibonacci term up to n = 10^6 is ~10 GB), while a rolling
    pair needs none of it.
    """
    a, b = a0, b0
    for _ in range(n):
        yield b
        a, b = b, a + b


def add_mants(a0: int, b0: int, n: int) -> Iterator[tuple[int, str, int]]:
    """Fixed-point version.

    The pair shares one exponent: consecutive terms are within a factor of phi
    of each other, so no alignment shift is ever needed before adding.
    """
    a, b, exp = a0, b0, 0
    for _ in range(n):
        yield _mant_emit(b, exp)
        a, b = b, a + b
        if b >= _MANT_LIMIT:
            shift = len(str(b)) - MANT_DIGITS
            p = _pow10(shift)
            a //= p
            b //= p
            exp += shift


# ---- RATIO family --------------------------------------------------------


def ratio_limbs(spec: Ratio, n: int) -> Iterator[list[int]]:
    x = [1]
    num, den = spec.num, spec.den
    for k in range(1, n + 1):
        x = limb_mul_small(x, num(k))
        if den is not None:
            x = limb_div_small(x, den(k))
        yield x


def ratio_ints(spec: Ratio, n: int) -> Iterator[int]:
    x = 1
    num, den = spec.num, spec.den
    for k in range(1, n + 1):
        x *= num(k)
        if den is not None:
            x //= den(k)
        yield x


def ratio_mants(spec: Ratio, n: int) -> Iterator[tuple[int, str, int]]:
    m, exp = 1, 0
    num, den = spec.num, spec.den
    for k in range(1, n + 1):
        m *= num(k)
        if den is not None:
            m //= den(k)     # truncation costs <1 unit in the 40th digit
        if m >= _MANT_LIMIT:
            shift = len(str(m)) - MANT_DIGITS
            m //= _pow10(shift)
            exp += shift
        yield _mant_emit(m, exp)


def ratio_logs(spec: Ratio, n: int, start: int, prec: int) -> Iterator[tuple[int, Decimal]]:
    """Running sum of log10(num(k)) - log10(den(k)).

    Two high-precision logarithms per term is the price of generality; the
    geometric sequences override this with a closed form.
    """
    num, den = spec.num, spec.den
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        total = Decimal(0)
        for k in range(1, n + 1):
            total += Decimal(num(k)).log10()
            if den is not None:
                total -= Decimal(den(k)).log10()
            if k >= start:
                yield _split(total, one)


# ---- FORMULA family -----------------------------------------------------


def formula_limbs(f: Callable[[int], int], n: int) -> Iterator[list[int]]:
    for k in range(1, n + 1):
        yield limb_from_int(f(k))


def formula_ints(f: Callable[[int], int], n: int) -> Iterator[int]:
    for k in range(1, n + 1):
        yield f(k)


def formula_mants(f: Callable[[int], int], n: int) -> Iterator[tuple[int, str, int]]:
    for k in range(1, n + 1):
        yield _mant_emit(f(k), 0)


def formula_logs(f: Callable[[int], int], n: int, start: int,
                 prec: int) -> Iterator[tuple[int, Decimal]]:
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(Decimal(f(k)).log10(), one)


# --------------------------------------------------------------------------
# Closed-form logarithms
# --------------------------------------------------------------------------


def _log_precision(n: int, size_log10: float) -> int:
    """Decimal digits needed so the fractional part stays trustworthy.

    Multiplying (or summing) n times pushes rounding error up by log10(n)
    digits, and the integer part of the logarithm -- 208_987 for F_(10^6) --
    consumes significant digits the mantissa never sees.  Ask for both, plus a
    25-digit guard band.
    """
    int_digits = max(1, len(str(int(abs(size_log10)))))
    return int_digits + len(str(n)) + 25


@lru_cache(maxsize=8)
def _log_constants(prec: int) -> tuple[Decimal, Decimal]:
    """(log10(phi), log10(sqrt 5)) at `prec` digits, computed once per prec."""
    with localcontext() as ctx:
        ctx.prec = prec + 10
        root = Decimal(5).sqrt()
        return +((1 + root) / 2).log10(), +root.log10()


@lru_cache(maxsize=16)
def _log_base(base: int, prec: int) -> Decimal:
    with localcontext() as ctx:
        ctx.prec = prec + 10
        return +Decimal(base).log10()


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


# frac(log10 x) never lands this close to a digit boundary by accident: the
# log engines carry >=25 good fractional digits, so a hit means an exact tie.
BOUNDARY_EPS = Decimal("1e-18")

BINET_HEAD = 40  # below this, the neglected phi^-k term is not yet negligible


def fibonacci_logs(n: int, start: int, prec: int) -> Iterator[tuple[int, Decimal]]:
    """log10(F_k) = k*log10(phi) - log10(sqrt 5) + log10(1 - (-phi^-2)^k).

    The correction term is under 1e-16 by k = 40, so callers hand k < 40 to an
    exact engine.  One Decimal multiply per term, independent of term size.
    """
    log_phi, log_sqrt5 = _log_constants(prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(k * log_phi - log_sqrt5, one)


def lucas_logs(n: int, start: int, prec: int) -> Iterator[tuple[int, Decimal]]:
    """log10(L_k) = k*log10(phi) + log10(1 + (-phi^-2)^k) -- same cutoff as Binet."""
    log_phi, _ = _log_constants(prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(k * log_phi, one)


def power_logs(base: int, n: int, start: int, prec: int) -> Iterator[tuple[int, Decimal]]:
    """log10(b^k) = k * log10(b) -- an exact identity, no approximation at all."""
    log_b = _log_base(base, prec)
    with localcontext() as ctx:
        ctx.prec = prec
        one = Decimal(1)
        for k in range(start, n + 1):
            yield _split(k * log_b, one)


# --------------------------------------------------------------------------
# Sequence registry
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Sequence:
    number: int                       # menu number
    key: str                          # CLI name
    label: str                        # "Lucas numbers"
    aliases: tuple[str, ...]          # every word that selects this sequence
    span: str                         # template, e.g. "L_1 .. L_{n}"
    growth: str                       # digit-count growth, for the menu
    term_name: Callable[[int], str]
    family: str
    single: Callable[[int], int]      # one term, computed directly
    size_log10: Callable[[int], float]  # float estimate of log10(x_n)
    # `auto` uses limbs up to limb_max, big ints up to exact_max, then `mant`.
    # Both are tuned so an auto run stays around a few seconds.  For factorials
    # and primorials the two are equal, i.e. big ints are skipped entirely:
    # pulling the leading digit out of a big int costs a full division, which
    # the digit array gets for free, so `exact` loses to `limb` there.
    limb_max: int
    exact_max: int
    benford: bool = True              # does it converge to Benford at all?
    note: str = ""                    # one-line analysis hint
    # family payloads
    seeds: tuple[int, int] = (0, 1)   # ADD
    ratio: Callable[[int], Ratio] | None = None   # RATIO (built per n)
    formula: Callable[[int], int] | None = None   # FORMULA
    log_closed: Callable[[int, int, int], Iterator[tuple[int, Decimal]]] | None = None
    log_head: int = 0                 # terms the log engine cannot start from

    def span_text(self, n: int | str = "n") -> str:
        """'F_1 .. F_1000', or 'F_1 .. F_n' for the menu."""
        return self.span.format(n=n, n2=2 * n if isinstance(n, int) else "2n")

    # -- engines ----------------------------------------------------------
    def limb_terms(self, n: int) -> Iterator[list[int]]:
        if self.family == ADD:
            return add_limbs(*self.seeds, n)
        if self.family == RATIO:
            return ratio_limbs(self.ratio(n), n)
        return formula_limbs(self.formula, n)

    def int_terms(self, n: int) -> Iterator[int]:
        if self.family == ADD:
            return add_ints(*self.seeds, n)
        if self.family == RATIO:
            return ratio_ints(self.ratio(n), n)
        return formula_ints(self.formula, n)

    def mant_terms(self, n: int) -> Iterator[tuple[int, str, int]]:
        if self.family == ADD:
            return add_mants(*self.seeds, n)
        if self.family == RATIO:
            return ratio_mants(self.ratio(n), n)
        return formula_mants(self.formula, n)

    def log_terms(self, n: int, start: int) -> Iterator[tuple[int, Decimal]]:
        prec = self.log_prec(n)
        if self.log_closed is not None:
            return self.log_closed(n, start, prec)
        if self.family == RATIO:
            return ratio_logs(self.ratio(n), n, start, prec)
        return formula_logs(self.formula, n, start, prec)

    def log_prec(self, n: int) -> int:
        return _log_precision(n, self.size_log10(n))


def _primorial_ratio(n: int) -> Ratio:
    """Multiply by the k-th prime; the sieve is built once per n and cached."""
    primes = first_primes(n)
    return Ratio(num=lambda k: primes[k - 1])


def _lgamma10(x: float) -> float:
    """log10(Gamma(x)) -- for sizing precision, never for digits."""
    return math.lgamma(x) / LN10


SEQUENCES: tuple[Sequence, ...] = (
    Sequence(
        number=1, key="fib", label="Fibonacci numbers", span="F_1 .. F_{n}",
        aliases=("fib", "fibs", "fibonacci", "f"),
        growth="~0.209*n digits", term_name=lambda k: f"F_{k}",
        family=ADD, seeds=(0, 1), single=fib,
        log_closed=fibonacci_logs, log_head=BINET_HEAD,
        size_log10=lambda n: n * _LOG10_PHI,
        limb_max=20_000, exact_max=200_000,
        note="geometric ratio phi; converges like O(log n / n)",
    ),
    Sequence(
        number=2, key="pow2", label="Powers of two", span="2^1 .. 2^{n}",
        aliases=("pow2", "power2", "powers2", "poweroftwo", "powersoftwo", "2^n"),
        growth="~0.301*n digits", term_name=lambda k: f"2^{k}",
        family=RATIO, ratio=lambda n: Ratio(num=lambda k: 2), single=lambda k: 1 << k,
        log_closed=lambda n, start, prec: power_logs(2, n, start, prec),
        size_log10=lambda n: n * _LOG10_2,
        limb_max=20_000, exact_max=60_000,
        note="the textbook case: frac(k*log10 2) equidistributes",
    ),
    Sequence(
        number=3, key="fact", label="Factorials", span="1! .. {n}!",
        aliases=("fact", "factorial", "factorials", "n!"),
        growth="~n*log10(n) digits", term_name=lambda k: f"{k}!",
        family=RATIO, ratio=lambda n: Ratio(num=lambda k: k), single=math.factorial,
        size_log10=lambda n: _lgamma10(n + 1),
        limb_max=5_000, exact_max=5_000,
        note="growing log-step: converges far more slowly than the geometric ones",
    ),
    Sequence(
        number=4, key="lucas", label="Lucas numbers", span="L_1 .. L_{n}",
        aliases=("lucas", "luc", "lucasnumbers", "l"),
        growth="~0.209*n digits", term_name=lambda k: f"L_{k}",
        family=ADD, seeds=(2, 1), single=lucas,
        log_closed=lucas_logs, log_head=BINET_HEAD,
        size_log10=lambda n: n * _LOG10_PHI,
        limb_max=20_000, exact_max=200_000,
        note="same ratio phi as Fibonacci, different seed: same digit law",
    ),
    Sequence(
        number=5, key="catalan", label="Catalan numbers", span="C_1 .. C_{n}",
        aliases=("catalan", "catalans", "cat"),
        growth="~0.602*n digits", term_name=lambda k: f"C_{k}",
        family=RATIO,
        # C_k = C_(k-1) * 2(2k-1) / (k+1); every division is exact
        ratio=lambda n: Ratio(num=lambda k: 2 * (2 * k - 1), den=lambda k: k + 1),
        single=catalan,
        size_log10=lambda n: n * 2 * _LOG10_2,
        limb_max=10_000, exact_max=30_000,
        note="4^n over a polynomial: still geometric, so still Benford",
    ),
    Sequence(
        number=6, key="binom", label="Central binomials", span="C(2,1) .. C({n2},{n})",
        aliases=("binom", "binomial", "binomials", "centralbinomial",
                 "centralbinomials", "choose"),
        growth="~0.602*n digits", term_name=lambda k: f"C({2 * k},{k})",
        family=RATIO,
        ratio=lambda n: Ratio(num=lambda k: 2 * (2 * k - 1), den=lambda k: k),
        single=lambda k: math.comb(2 * k, k),
        size_log10=lambda n: n * 2 * _LOG10_2,
        limb_max=10_000, exact_max=30_000,
        note="Catalan times (k+1): a shared factor cannot change the digit law",
    ),
    Sequence(
        number=7, key="primorial", label="Primorials", span="p_1# .. p_{n}#",
        aliases=("primorial", "primorials", "prime", "primes", "p#"),
        growth="~n*log10(n) digits", term_name=lambda k: f"p_{k}#",
        family=RATIO, ratio=_primorial_ratio, single=primorial,
        size_log10=lambda n: sum(math.log10(p) for p in first_primes(n)),
        limb_max=5_000, exact_max=5_000,
        note="product of the first n primes; needs a sieve, then behaves like n!",
    ),
    Sequence(
        number=8, key="pow3", label="Powers of three", span="3^1 .. 3^{n}",
        aliases=("pow3", "power3", "powers3", "powerofthree", "powersofthree", "3^n"),
        growth="~0.477*n digits", term_name=lambda k: f"3^{k}",
        family=RATIO, ratio=lambda n: Ratio(num=lambda k: 3), single=lambda k: 3 ** k,
        log_closed=lambda n, start, prec: power_logs(3, n, start, prec),
        size_log10=lambda n: n * math.log10(3),
        limb_max=20_000, exact_max=40_000,
        note="control on the ratio: a different irrational step, same limit law",
    ),
    Sequence(
        number=9, key="triangular", label="Triangular numbers", span="T_1 .. T_{n}",
        aliases=("triangular", "triangle", "triangles", "tri", "t"),
        growth="~2*log10(n) digits", term_name=lambda k: f"T_{k}",
        family=FORMULA, formula=lambda k: k * (k + 1) // 2,
        single=lambda k: k * (k + 1) // 2,
        size_log10=lambda n: math.log10(n * (n + 1) / 2),
        limb_max=10 ** 9, exact_max=10 ** 9,
        benford=False,
        note="polynomial growth: leading digits depend on where you stop, so no limit",
    ),
    Sequence(
        number=10, key="squares", label="Squares", span="1^2 .. {n}^2",
        aliases=("squares", "square", "sq", "n^2"),
        growth="~2*log10(n) digits", term_name=lambda k: f"{k}^2",
        family=FORMULA, formula=lambda k: k * k, single=lambda k: k * k,
        size_log10=lambda n: 2 * math.log10(n),
        limb_max=10 ** 9, exact_max=10 ** 9,
        benford=False,
        note="same failure as triangular numbers; the control group for the test",
    ),
)

BY_KEY = {s.key: s for s in SEQUENCES}
METHODS = ("auto", "limb", "exact", "mant", "log")


def normalize_word(text: str) -> str:
    """Fold a command-line word to its lookup form.

    Separators and case carry no meaning here, so `Powers-of-Two`,
    `powers_of_two` and `powersoftwo` are the same request.  Symbols that ARE
    the name (`n!`, `2^n`, `p#`) survive.
    """
    return text.strip().lower().translate(str.maketrans("", "", " -_."))


def _build_word_library() -> dict[str, Sequence]:
    """word -> sequence, from the menu number, the key and every alias.

    Collisions are a registry bug, not a user error, so they fail at import.
    """
    library: dict[str, Sequence] = {}
    for seq in SEQUENCES:
        for word in (str(seq.number), seq.key, *seq.aliases):
            word = normalize_word(word)
            if word in library and library[word] is not seq:
                raise AssertionError(
                    f"word {word!r} claimed by both {library[word].key} and {seq.key}"
                )
            library[word] = seq
    return library


WORDS = _build_word_library()


def resolve_sequence(text: str) -> Sequence:
    """Look one word up in the library, with a suggestion when it misses."""
    word = normalize_word(text)
    if word in WORDS:
        return WORDS[word]
    close = get_close_matches(word, sorted(WORDS), n=3, cutoff=0.6)
    hint = (f"closest words: {', '.join(close)}" if close
            else "run with --list to see every word")
    raise ValueError(f"unknown sequence {text!r}; {hint}")


def words_for(seq: Sequence) -> str:
    """Every word that selects `seq`, in the order a reader wants them."""
    return ", ".join(dict.fromkeys((str(seq.number), seq.key, *seq.aliases)))


def choose_method(seq: Sequence, n: int) -> str:
    """`auto`: exact digits while that is still cheap, then constant cost."""
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
        for k, x in enumerate(seq.limb_terms(n), start=1):
            show = want_sci(k)
            yield (
                k,
                limb_leading_digit(x),
                limb_to_sci(x) if show else None,
                limb_to_str(x) if show and want_full else None,
            )

    elif method == "exact":
        for k, x in enumerate(seq.int_terms(n), start=1):
            show = want_sci(k)
            yield k, leading_digit_int(x), int_to_sci(x) if show else None, None

    elif method == "mant":
        for k, (digit, digits, exponent) in enumerate(seq.mant_terms(n), start=1):
            yield k, digit, _format_sci(digits, exponent) if want_sci(k) else None, None

    elif method == "log":
        head = min(n, seq.log_head)
        if head:
            for k, x in enumerate(seq.int_terms(head), start=1):
                show = want_sci(k)
                yield k, leading_digit_int(x), int_to_sci(x) if show else None, None
        if n <= head:
            return
        thresholds = _log_thresholds(seq.log_prec(n))
        for k, (exponent, frac) in enumerate(seq.log_terms(n, head + 1), start=head + 1):
            # frac lands between log10(d) and log10(d+1) exactly when the term
            # leads with digit d -- cheaper than evaluating 10**frac.
            i = bisect_right(thresholds, frac)
            if (i < 8 and thresholds[i] - frac < BOUNDARY_EPS) or (
                    i > 0 and frac - thresholds[i - 1] < BOUNDARY_EPS):
                # A term that is one digit followed by zeros -- C(8,4) = 70,
                # 2^1 = 2 -- sits exactly ON a threshold, where the last bit of
                # rounding decides the bisect.  Rounding the mantissa to SIG
                # digits is stable there, so pay for it in this rare case.
                digit = int(log_to_sci(0, frac)[0])
            else:
                digit = i + 1
            yield k, digit, log_to_sci(exponent, frac) if want_sci(k) else None, None

    else:
        raise ValueError(f"unknown method {method!r}")


def log_to_sci(exponent: int, frac: Decimal, sig: int = SIG) -> str:
    """Scientific notation from a split base-10 logarithm."""
    with localcontext() as ctx:
        ctx.prec = sig + GUARD
        mantissa = Decimal(10) ** frac
    return _format_sci(str(mantissa).replace(".", ""), exponent)


# --------------------------------------------------------------------------
# Statistics and timing
# --------------------------------------------------------------------------


def chi_square(counts: Seq[int]) -> float:
    """Pearson chi-square against Benford, 8 degrees of freedom.

    Critical values: 15.51 (p=0.05), 20.09 (p=0.01).  Meaningful for a sample
    of real data; for a deterministic sequence it is only a distance measure --
    see the note printed with the control sequences.
    """
    total = sum(counts)
    stat = 0.0
    for observed, pct in zip(counts, benford_percentages()):
        expected = total * pct / 100.0
        stat += (observed - expected) ** 2 / expected
    return stat


def mean_abs_deviation(counts: Seq[int]) -> float:
    """Mean absolute deviation in percentage points (Nigrini's MAD)."""
    total = sum(counts)
    return sum(
        abs(100.0 * c / total - pct) for c, pct in zip(counts, benford_percentages())
    ) / 9.0


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


def timing_lines(n: int, elapsed: float, formatted: int = 0) -> list[str]:
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


# --------------------------------------------------------------------------
# Visualization: terminal bar chart
# --------------------------------------------------------------------------
#
# Two bars per digit -- observed against the Benford reference -- so the shape of
# the distribution is readable without parsing nine pairs of numbers.  Both
# series share one axis and one scale; the bars are drawn in eighth-of-a-cell
# steps so a 0.1 pp difference is still visible at 46 columns wide.

CHART_WIDTH = 46
_BLOCK_PARTIALS = " \u258f\u258e\u258d\u258c\u258b\u258a\u2589"  # 1/8 .. 7/8 block


@lru_cache(maxsize=1)
def _bar_glyphs() -> tuple[str, str]:
    """(full cell, partial cells) -- Unicode blocks where the terminal takes them.

    A redirected or non-UTF-8 stdout would otherwise raise UnicodeEncodeError
    halfway through a chart, so fall back to ASCII instead of crashing.
    """
    encoding = getattr(sys.stdout, "encoding", None) or "ascii"
    try:
        ("\u2588" + _BLOCK_PARTIALS).encode(encoding)
    except (UnicodeEncodeError, LookupError):
        return "#", ""
    return "\u2588", _BLOCK_PARTIALS


def bar(value: float, scale_max: float, width: int = CHART_WIDTH) -> str:
    """One horizontal bar, `width` cells representing `scale_max`."""
    full_glyph, partials = _bar_glyphs()
    cells = max(0.0, value) / scale_max * width
    whole = int(cells)
    bar_text = full_glyph * whole
    if partials:
        eighths = int((cells - whole) * 8)
        if eighths:
            bar_text += partials[eighths]
    elif cells - whole >= 0.5:
        bar_text += full_glyph
    return bar_text


def chart_lines(counts: Seq[int], width: int = CHART_WIDTH) -> list[str]:
    """Grouped bar chart of observed vs Benford percentages, for digits 1-9."""
    total = sum(counts)
    expected = benford_percentages()
    observed = [100.0 * c / total for c in counts]
    scale_max = max(max(observed), max(expected))

    # The 10-space indent matches the "  d  obs |" row prefix, so the axis
    # endpoints sit over the ends of the bars.
    lines = [
        "observed vs Benford  (obs = this run, ben = log10(1 + 1/d))",
        f"{'':10}0{f'{scale_max:.0f}%':>{width - 1}}",
    ]
    for digit, (obs, exp) in enumerate(zip(observed, expected), start=1):
        lines.append(f"  {digit}  obs |{bar(obs, scale_max, width):<{width}} {obs:6.2f}%")
        lines.append(f"     ben |{bar(exp, scale_max, width):<{width}} {exp:6.2f}%")
    return lines


# --------------------------------------------------------------------------
# Visualization: standalone HTML / SVG bar chart
# --------------------------------------------------------------------------
#
# One self-contained file -- no libraries, no network -- so it opens anywhere and
# can be handed in alongside the script.  Design choices worth stating:
#
#   * grouped bars, two series on ONE axis and one scale (a second y-axis would
#     invent a relationship that is not in the data),
#   * the two categorical hues are slots 1 and 2 of a pre-validated palette,
#     used unmodified, with steps chosen per mode rather than flipped,
#   * a 2px surface gap between adjacent bars instead of borders, 4px rounded
#     data-ends anchored to the baseline, hairline solid gridlines,
#   * a legend is always present, the extreme pair is direct-labelled, and every
#     value is also in the table below, so nothing is reachable only by hover.

# Categorical slots 1 (observed) and 2 (Benford reference), light and dark steps.
SERIES_LIGHT = ("#2a78d6", "#eb6834")
SERIES_DARK = ("#3987e5", "#d95926")

HTML_STYLE = """
:root {
  color-scheme: light;
  --surface: #fcfcfb; --card: #ffffff; --grid: #e6e5e1; --axis: #d6d5d0;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #78766f;
  --series-1: #2a78d6; --series-2: #eb6834;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #141413; --card: #1a1a19; --grid: #2e2e2c; --axis: #3a3a37;
    --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #9a988e;
    --series-1: #3987e5; --series-2: #d95926;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #141413; --card: #1a1a19; --grid: #2e2e2c; --axis: #3a3a37;
  --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #9a988e;
  --series-1: #3987e5; --series-2: #d95926;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 32px 24px; background: var(--surface);
  color: var(--text-primary);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
}
main { max-width: 820px; margin: 0 auto; }
h1 { font-size: 19px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
p.sub { margin: 0 0 20px; color: var(--text-secondary); }
.card {
  background: var(--card); border: 1px solid var(--grid); border-radius: 10px;
  padding: 18px 18px 8px; margin-bottom: 20px;
}
.legend { display: flex; gap: 18px; align-items: center; margin: 0 0 10px 4px;
          color: var(--text-secondary); }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.swatch { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
.grid-line { stroke: var(--grid); stroke-width: 1; }
.axis-line { stroke: var(--axis); stroke-width: 1; }
.tick { fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.digit { fill: var(--text-secondary); font-size: 13px; }
.axis-title { fill: var(--text-muted); font-size: 11px; }
.value-label { fill: var(--text-secondary); font-size: 11px;
               font-variant-numeric: tabular-nums; }
.bar { transition: opacity 120ms ease; cursor: default; }
.bar:hover, .bar:focus-visible { opacity: 0.78; outline: none; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
caption { text-align: left; color: var(--text-secondary); padding: 0 0 8px; }
th, td { text-align: right; padding: 5px 10px; border-bottom: 1px solid var(--grid); }
th:first-child, td:first-child { text-align: left; }
thead th { color: var(--text-muted); font-weight: 500; font-size: 12px; }
tbody tr:last-child td { border-bottom: none; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 0 0 4px; }
dt { color: var(--text-muted); } dd { margin: 0; font-variant-numeric: tabular-nums; }
#tip {
  position: fixed; transform: translate(-50%, -100%); pointer-events: none;
  background: var(--text-primary); color: var(--surface); padding: 5px 9px;
  border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 10;
}
"""

HTML_SCRIPT = """
const tip = document.getElementById('tip');
for (const mark of document.querySelectorAll('[data-label]')) {
  const show = () => {
    const box = mark.getBoundingClientRect();
    tip.textContent = mark.dataset.label;
    tip.style.left = (box.left + box.width / 2) + 'px';
    tip.style.top = (box.top - 8) + 'px';
    tip.hidden = false;
  };
  const hide = () => { tip.hidden = true; };
  mark.addEventListener('mouseenter', show);
  mark.addEventListener('focus', show);
  mark.addEventListener('mouseleave', hide);
  mark.addEventListener('blur', hide);
}
"""


def _rounded_bar(x: float, y: float, w: float, base: float, radius: float = 4.0) -> str:
    """A bar path with rounded top corners only -- the baseline end stays square."""
    r = min(radius, w / 2, max(0.0, base - y))
    return (f"M{x:.1f} {base:.1f}V{y + r:.1f}Q{x:.1f} {y:.1f} {x + r:.1f} {y:.1f}"
            f"H{x + w - r:.1f}Q{x + w:.1f} {y:.1f} {x + w:.1f} {y + r:.1f}"
            f"V{base:.1f}Z")


def svg_chart(counts: Seq[int]) -> str:
    """Grouped bar chart: observed vs Benford percentage for digits 1-9."""
    total = sum(counts)
    expected = benford_percentages()
    observed = [100.0 * c / total for c in counts]

    width, height = 760, 320
    left, right, top, bottom = 46, 12, 14, 44
    plot_w = width - left - right
    plot_h = height - top - bottom
    base = top + plot_h

    y_max = max(5 * math.ceil(max(max(observed), max(expected)) / 5), 5)
    def y_of(pct: float) -> float:
        return base - pct / y_max * plot_h

    group_w = plot_w / 9
    gap = 2.0                                   # surface gap between the pair
    bar_w = min(30.0, (group_w - gap) / 2 - 6)

    # Direct-label only the extreme: the digit that deviates most.
    extreme = max(range(9), key=lambda i: abs(observed[i] - expected[i]))

    parts = [f'<svg viewBox="0 0 {width} {height}" role="img" '
             f'aria-label="Observed versus Benford first-digit percentages">']
    for tick in range(0, y_max + 1, 5):
        y = y_of(tick)
        parts.append(f'<line class="grid-line" x1="{left}" y1="{y:.1f}" '
                     f'x2="{left + plot_w}" y2="{y:.1f}"/>')
        parts.append(f'<text class="tick" x="{left - 8}" y="{y + 4:.1f}" '
                     f'text-anchor="end">{tick}%</text>')
    parts.append(f'<line class="axis-line" x1="{left}" y1="{base}" '
                 f'x2="{left + plot_w}" y2="{base}"/>')

    for i, (obs, exp) in enumerate(zip(observed, expected)):
        centre = left + group_w * (i + 0.5)
        for series, (value, colour, name) in enumerate((
                (obs, "var(--series-1)", "observed"),
                (exp, "var(--series-2)", "Benford"))):
            x = centre - gap / 2 - bar_w + series * (bar_w + gap)
            label = f"digit {i + 1} · {name} {value:.2f}%"
            parts.append(
                f'<path class="bar" d="{_rounded_bar(x, y_of(value), bar_w, base)}" '
                f'fill="{colour}" tabindex="0" data-label="{label}" '
                f'aria-label="{label}"><title>{label}</title></path>')
            if i == extreme:
                parts.append(
                    f'<text class="value-label" x="{x + bar_w / 2:.1f}" '
                    f'y="{y_of(value) - 6:.1f}" text-anchor="middle">'
                    f'{value:.1f}</text>')
        parts.append(f'<text class="digit" x="{centre:.1f}" y="{base + 20}" '
                     f'text-anchor="middle">{i + 1}</text>')

    parts.append(f'<text class="axis-title" x="{left + plot_w / 2:.1f}" '
                 f'y="{base + 38}" text-anchor="middle">leading digit</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def write_html_chart(path: str, title: str, subtitle: str,
                     counts: Seq[int], facts: Seq[str]) -> None:
    """Write the whole visualization -- chart, summary and table -- to one file."""
    total = sum(counts)
    expected = benford_percentages()
    rows = "\n".join(
        f"      <tr><td>{d}</td><td>{c}</td><td>{100.0 * c / total:.3f}</td>"
        f"<td>{pct:.3f}</td><td>{100.0 * c / total - pct:+.3f}</td></tr>"
        for d, (c, pct) in enumerate(zip(counts, expected), start=1))
    summary = "\n".join(f"      <dt>{fact.split(':', 1)[0].strip()}</dt>"
                        f"<dd>{fact.split(':', 1)[1].strip()}</dd>"
                        for fact in facts if ":" in fact)
    document = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>{HTML_STYLE}</style>
</head>
<body>
<main>
  <h1>{title}</h1>
  <p class="sub">{subtitle}</p>

  <div class="card">
    <div class="legend">
      <span><i class="swatch" style="background:var(--series-1)"></i>observed</span>
      <span><i class="swatch" style="background:var(--series-2)"></i>Benford, log10(1 + 1/d)</span>
    </div>
{svg_chart(counts)}
  </div>

  <div class="card">
    <dl>
{summary}
      <dt>mean absolute deviation</dt><dd>{mean_abs_deviation(counts):.4f} pp</dd>
      <dt>chi-square (8 dof)</dt><dd>{chi_square(counts):.4f}</dd>
    </dl>
  </div>

  <div class="card">
    <table>
      <caption>Every value in the chart, for reading without colour or hover.</caption>
      <thead><tr><th>digit</th><th>count</th><th>observed %</th>
        <th>Benford %</th><th>diff (pp)</th></tr></thead>
      <tbody>
{rows}
      </tbody>
    </table>
  </div>
</main>
<div id="tip" hidden></div>
<script>{HTML_SCRIPT}</script>
</body>
</html>
"""
    with open(path, "w") as fh:
        fh.write(document)
    print(f"\nwrote {path}")


def report(
    title: str,
    facts: list[str],
    counts: Seq[int],
    timings: list[str] | None = None,
    note: str = "",
    chart: bool = True,
) -> str:
    """The shared histogram / chart / deviation / chi-square block."""
    total = sum(counts)
    expected = benford_percentages()
    lines = ["", title, *facts, "",
             "digit      count     observed %    Benford %       diff",
             "-" * 57]
    worst = 0.0
    for digit, (count, pct) in enumerate(zip(counts, expected), start=1):
        obs = 100.0 * count / total
        diff = obs - pct
        worst = max(worst, abs(diff))
        lines.append(f"  {digit}   {count:11d}      {obs:6.2f}%      {pct:6.2f}%   {diff:+9.4f}")
    lines += ["-" * 57]
    if chart:
        lines += ["", *chart_lines(counts), ""]
    lines += [
        f"max absolute deviation : {worst:.4f} percentage points",
        f"mean absolute deviation: {mean_abs_deviation(counts):.4f} pp"
        "   [Nigrini: <0.6 close, >1.5 nonconforming]",
        f"chi-square (8 dof)     : {chi_square(counts):.4f}"
        "   [15.51 = p0.05, 20.09 = p0.01]",
    ]
    if note:
        lines.append(f"note                   : {note}")
    if timings:
        lines += ["", *timings]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# Runs
# --------------------------------------------------------------------------


def write_csv(path: str, counts: Seq[int]) -> None:
    total = sum(counts)
    with open(path, "w") as fh:  # OSError here is caught by main()
        fh.write("digit,count,observed_pct,benford_pct\n")
        for d, (c, pct) in enumerate(zip(counts, benford_percentages()), start=1):
            fh.write(f"{d},{c},{100.0 * c / total:.6f},{pct:.6f}\n")
    print(f"\nwrote {path}")


def run(
    seq: Sequence,
    n: int,
    method: str = "auto",
    show: int = 0,
    full: bool = False,
    csv_path: str | None = None,
    chart: bool = True,
    html_path: str | None = None,
) -> list[int]:
    """Generate, count, time and report one sequence.  Returns digit counts."""
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
            print(f"{seq.term_name(k):<14} = {sci:<26} lead={digit}")
            if full and full_digits is not None:
                print(f"              {full_digits}")
            print_time += time.perf_counter() - io_started

    elapsed = time.perf_counter() - started - print_time

    if counts[0]:
        raise AssertionError("a leading digit of 0 should be impossible")
    counts = counts[1:]

    facts = [f"positive terms counted  : {sum(counts)}",
             f"{seq.term_name(n)} = {last_sci}"]
    print(report(
        f"{seq.label} leading digits: {seq.span_text(n)}   (method: {method})",
        facts,
        counts,
        timing_lines(n, elapsed, formatted),
        seq.note if seq.benford else "NOT expected to follow Benford -- " + seq.note,
        chart,
    ))
    if csv_path:
        write_csv(csv_path, counts)
    if html_path:
        write_html_chart(
            html_path,
            f"{seq.label}: first-digit distribution",
            f"{seq.span_text(n)} &middot; {n:,} terms &middot; {method} engine "
            f"&middot; {seq.term_name(n)} = {last_sci}",
            counts, facts)
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
# Real data from a file
# --------------------------------------------------------------------------


# A comma between digits with exactly three digits after it is a thousands
# separator, not a field delimiter: strip those, then split on the rest.
_THOUSANDS = re.compile(r"(?<=\d),(?=\d{3}(?:\D|$))")
_DELIMITERS = re.compile(r"[\s,;|]+")


def tokenize(line: str) -> list[str]:
    """Split one line of a data file into candidate numbers."""
    return _DELIMITERS.split(_THOUSANDS.sub("", line).strip())


def leading_digit_text(token: str) -> int | None:
    """First significant digit of a number written as text.

    Handles ints, decimals, scientific notation, thousands separators, currency
    symbols and a leading sign.  Returns None for anything that is not a number
    or is zero -- Benford has nothing to say about either.
    """
    cleaned = token.strip().strip("\"'").replace(",", "").replace("_", "")
    cleaned = cleaned.lstrip("$£€+-")
    if not cleaned:
        return None
    try:
        value = abs(float(cleaned))
    except ValueError:
        return None
    if value == 0.0 or math.isinf(value) or math.isnan(value):
        return None
    # Work from the formatted mantissa so 0.00734 and 7.34e6 both give 7.
    digits = f"{value:.17e}"
    return int(digits[0])


def run_file(path: str, csv_path: str | None = None, show: int = 0,
             chart: bool = True, html_path: str | None = None) -> list[int]:
    """Same counting and reporting, on numbers read from a file.

    This is the original application of Benford's law: one column of real
    measurements -- populations, invoice totals, file sizes -- where the test is
    a genuine statistical test rather than a statement about a limit.
    """
    counts = [0] * 10
    skipped = 0
    shown = 0
    started = time.perf_counter()
    print_time = 0.0

    with open(path) as fh:
        for line in fh:
            for token in tokenize(line):
                digit = leading_digit_text(token)
                if digit is None:
                    skipped += 1
                    continue
                counts[digit] += 1
                if shown < show:
                    io_started = time.perf_counter()
                    print(f"  {token:>24}   lead={digit}")
                    print_time += time.perf_counter() - io_started
                    shown += 1

    elapsed = time.perf_counter() - started - print_time
    total = sum(counts[1:])
    if total == 0:
        print(f"no usable numbers found in {path}", file=sys.stderr)
        return counts[1:]

    counts = counts[1:]
    facts = [f"values counted          : {total}",
             f"tokens skipped          : {skipped} (non-numeric or zero)"]
    print(report(
        f"Leading digits of numbers in {path}",
        facts,
        counts,
        timing_lines(total, elapsed),
        "real sample -- here chi-square and MAD are genuine tests, not just distances",
        chart,
    ))
    if csv_path:
        write_csv(csv_path, counts)
    if html_path:
        write_html_chart(html_path, "First-digit distribution",
                         f"{total:,} values read from {os.path.basename(path)}",
                         counts, facts)
    return counts


# --------------------------------------------------------------------------
# The word library
# --------------------------------------------------------------------------

BANNER = "Benford's law explorer -- leading digits of fast-growing sequences"

EXAMPLES = """\
examples:
  python3 benford.py fibonacci 1000000
  python3 benford.py power2 1000000 --show 3
  python3 benford.py factorial 1000000 --csv digits.csv
  python3 benford.py factorial 1000000 --html chart.html
  python3 benford.py catalan 20000 --method limb --show 2 --full
  python3 benford.py primorial --term 5000
  python3 benford.py squares 1000000          # a control: does NOT fit Benford
  python3 benford.py fib --verify 2000        # cross-check all four engines
  python3 benford.py --file invoices.csv      # real data, same analysis\
"""


def print_library(stream=sys.stdout) -> None:
    """Print every sequence with the words that select it.

    This is the whole user interface: there is no menu and nothing prompts, so
    the library has to say plainly which word runs which computation.
    """
    print(BANNER, file=stream)
    print("\nusage: benford.py WORD N [options]   (benford.py --help for options)",
          file=stream)

    for heading, wanted in (
        ("\nsequences that converge to Benford's law:", True),
        ("\npolynomial-growth controls -- these do NOT converge:", False),
    ):
        print(heading, file=stream)
        for seq in SEQUENCES:
            if seq.benford is not wanted:
                continue
            print(f"  {seq.number:>2}  {seq.label:<20} {seq.span_text():<18} "
                  f"{seq.growth}", file=stream)
            print(f"      words: {words_for(seq)}", file=stream)

    print("\ndata files:", file=stream)
    print("  --file PATH          leading digits of every number in a file",
          file=stream)
    print(f"\n{EXAMPLES}", file=stream)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

EPILOG = """\
what breaks as n grows:
  * str(x)[0] raises above 4300 digits (CPython's int->str cap) -- the exact
    engines extract the leading digit by shifting instead
  * float(x) overflows at ~1.8e308, i.e. F_1476 and 2^1024, so anything built
    on math.log10(float(...)) or a double-precision Binet dies there
  * enumerating every term is O(n^2) digits or worse: the exact engines slow
    down per term as the terms lengthen, while `mant` and `log` stay flat
  * Decimal precision has to scale with n, since multiplying or summing n times
    pushes rounding error up by log10(n) digits
  * storing the sequence would cost O(n^2) digits (~10 GB of Fibonacci at
    n = 10^6), so every engine here keeps only a rolling state
"""


def positive_int(text: str) -> int:
    """argparse type: a whole number >= 1, reported in the user's own words."""
    try:
        value = int(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f"{text!r} is not a whole number")
    if value < 1:
        raise argparse.ArgumentTypeError(f"{value} is not >= 1")
    return value


def non_negative_int(text: str) -> int:
    try:
        value = int(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f"{text!r} is not a whole number")
    if value < 0:
        raise argparse.ArgumentTypeError(f"{value} is negative")
    return value


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Leading-digit / Benford analysis of ten integer sequences, "
                    "or of any file of numbers.  Every run is driven by "
                    "arguments; nothing prompts.  Run with no arguments (or "
                    "--list) to print the library of words and what each one "
                    "computes.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("sequence", nargs="?",
                   help="which sequence to run -- any word from the library, "
                        "e.g. fibonacci, power2, factorial, catalan, 1, 2, 3")
    p.add_argument("n", type=positive_int, nargs="?",
                   help="number of terms to generate (>= 1)")
    p.add_argument("--file", metavar="PATH",
                   help="analyse numbers from a file instead of a sequence")
    p.add_argument("--method", choices=METHODS, default="auto",
                   help="auto picks limb / exact / mant by n (see module docstring)")
    p.add_argument("--show", type=non_negative_int, default=0, metavar="K",
                   help="print the first K and last K terms in scientific notation")
    p.add_argument("--full", action="store_true",
                   help="with --show, also print every digit (forces an exact engine)")
    p.add_argument("--term", type=positive_int, metavar="K",
                   help="print term K exactly, in full, then exit")
    p.add_argument("--csv", metavar="PATH", help="write digit,count,observed,benford")
    p.add_argument("--html", metavar="PATH",
                   help="write a standalone HTML bar chart of the two distributions")
    p.add_argument("--no-chart", dest="chart", action="store_false",
                   help="suppress the terminal bar chart (keep the numeric table)")
    p.add_argument("--verify", type=positive_int, metavar="M",
                   help="cross-check all four engines on the first M terms, then exit")
    p.add_argument("--list", action="store_true",
                   help="print every sequence with the words that select it, then exit")
    args = p.parse_args(argv)

    if args.list:
        args.seq = None
        return args

    if args.file:
        args.seq = None
        return args
    if args.sequence is None:
        # No word given: show the library rather than guessing or prompting.
        args.list = True
        args.seq = None
        return args
    try:
        args.seq = resolve_sequence(args.sequence)
    except ValueError as exc:
        p.error(str(exc))
    if args.n is None and args.term is None and args.verify is None:
        p.error("n is required unless --term or --verify is given")
    return args


def main(argv: list[str] | None = None) -> int:
    try:
        return dispatch(parse_args(argv))
    except OSError as exc:
        # A bad path for --file, --csv or --html is user error, not a crash.
        print(f"file error: {exc}", file=sys.stderr)
        return 1


def check_writable(path: str | None) -> None:
    """Fail on an unusable output path now, not after a ten-minute run."""
    if path is None:
        return
    directory = os.path.dirname(os.path.abspath(path))
    if not os.path.isdir(directory):
        raise OSError(f"no such directory: {directory}")
    if not os.access(directory, os.W_OK):
        raise OSError(f"directory is not writable: {directory}")


def dispatch(args: argparse.Namespace) -> int:
    if args.list:
        print_library()
        return 0
    check_writable(args.csv)
    check_writable(args.html)

    if args.file:
        run_file(args.file, args.csv, args.show, args.chart, args.html)
        return 0
    if args.term:
        return print_single_term(args.seq, args.term)
    if args.verify:
        return verify(args.seq, args.verify)
    run(args.seq, args.n, args.method, args.show, args.full, args.csv,
        args.chart, args.html)
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
