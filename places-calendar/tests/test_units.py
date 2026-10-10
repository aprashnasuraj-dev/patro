"""
Checks for the kati conversions: published equivalences must come out exactly.

Run:  python tests/test_units.py   (or python -m pytest tests/)
"""
import sys
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine import units as U  # noqa: E402

G = U.groups()


def conv(g, v, a, b):
    grp = G[g]
    return U.convert(F(v), grp.unit(a), grp.unit(b))


CASES = [
    # land (Nepalese customary units; Survey/Land Management figures)
    ("land", 1, "ropani", "aana", F(16)),
    ("land", 1, "ropani", "paisa", F(64)),
    ("land", 1, "ropani", "daam", F(256)),
    ("land", 1, "ropani", "sqft", F(5476)),
    ("land", 1, "aana", "sqft", F("342.25")),
    ("land", 1, "bigha", "kattha", F(20)),
    ("land", 1, "kattha", "dhur", F(20)),
    ("land", 1, "bigha", "sqft", F(72900)),
    ("land", 1, "kattha", "sqft", F(3645)),
    ("land", 1, "dhur", "sqft", F("182.25")),
    ("land", 10000, "sqm", "hectare", F(1)),
    # gold
    ("gold", 1, "tola", "lal", F(100)),
    ("gold", 1, "tola", "gram", F("11.6638038")),
    # market weight
    ("market-weight", 1, "dharni", "pau", F(12)),
    ("market-weight", 1, "dharni", "bisauli", F(2)),
    # grain
    ("grain", 1, "pathi", "mana", F(8)),
    ("grain", 1, "muri", "pathi", F(20)),
    ("grain", 1, "mana", "mutthi", F(10)),
    # length
    ("length", 1, "haat", "bitta", F(2)),
    ("length", 1, "haat", "angul", F(24)),
    ("length", 1, "haat", "foot", F("1.5")),
    ("length", 1, "inch", "cm", F("2.54")),
    # time
    ("time", 1, "din", "ghadi", F(60)),
    ("time", 1, "ghadi", "pala", F(60)),
    ("time", 1, "pala", "bipala", F(60)),
    ("time", 1, "ghadi", "minute", F(24)),
    ("time", 1, "muhurta", "minute", F(48)),
    ("time", 1, "prahar", "hour", F(3)),
    # numbers
    ("numbers", 1, "lakh", "hajar", F(100)),
    ("numbers", 1, "crore", "lakh", F(100)),
    ("numbers", 1, "crore", "million", F(10)),
    ("numbers", 1, "arab", "billion", F(1)),
    ("numbers", 1, "million", "lakh", F(10)),
    ("numbers", 1, "kharab", "arab", F(100)),
]


def test_conversions():
    for g, v, a, b, want in CASES:
        assert conv(g, v, a, b) == want, (g, v, a, b, conv(g, v, a, b), want)


def test_formatting():
    assert U.fmt(F(10000000)) == "1,00,00,000"
    assert U.fmt(F(10000000), grouping="intl") == "10,000,000"
    assert U.fmt(F(5476), "ne") == "५,४७६"
    assert U.fmt(F("11.6638038")) == "11.6638"
    assert U.vslug(F("2.5")) == "2.5" and U.vslug(F(100)) == "100"


def test_breakdown():
    land = G["land"]
    parts = U.breakdown(F("2.5") * land.unit("ropani").factor, land.chains[0])
    assert U.breakdown_text(parts, "en") == "2 ropani 8 aana"
    parts = U.breakdown(land.unit("bigha").factor, land.chains[0])
    assert U.breakdown_text(parts, "en").startswith("13 ropani 5 aana")


def test_slugs_unique():
    from generator import kati
    kati.index()  # raises on duplicate pair slugs


if __name__ == "__main__":
    bad = 0
    for g, v, a, b, want in CASES:
        got = conv(g, v, a, b)
        ok = got == want
        bad += not ok
        print("PASS" if ok else "FAIL", f"{v} {a} -> {b}: {U.fmt(got)} (want {U.fmt(want)})")
    test_formatting()
    test_breakdown()
    test_slugs_unique()
    print(f"\n{len(CASES) - bad}/{len(CASES)} conversions exact; formatting, breakdown and slug checks passed")
    sys.exit(1 if bad else 0)
