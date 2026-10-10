"""
Regression test: computed festival dates vs dates published by the
Government of Nepal / Nepal Panchanga Nirnayak Samiti.

Sources
  * Public holiday lists 2080 and 2082 (Nepal Gazette, as reported by edusanjal.com)
  * Dashain 2083 dates (Sharesansar, 7 Oct 2026, citing the Samiti)
  * Janmashtami 2023/2024 (Sharesansar market-holiday notices)
  * Laxmi Puja 2081 (Ekantipur, 31 Oct 2024: "Lakshmi Puja is being celebrated today")

Run:  python -m pytest tests/  or  python tests/test_dates.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine import bs, festivals as F  # noqa: E402

# (festival id, BS year of occurrence) -> official BS date (year, month, day)
OFFICIAL = {
    ("ghatasthapana", 2082): (2082, 6, 6),
    ("krishna-janmashtami", 2082): (2082, 4, 31),
    ("janai-purnima", 2082): (2082, 4, 24),
    ("gai-jatra", 2082): (2082, 4, 25),
    ("haritalika-teej", 2082): (2082, 5, 10),
    ("gaura-parva", 2082): (2082, 5, 15),
    ("indra-jatra", 2082): (2082, 5, 21),
    ("laxmi-puja", 2082): (2082, 7, 3),
    ("chhath", 2082): (2082, 7, 10),
    ("udhauli", 2082): (2082, 8, 18),
    ("christmas", 2082): (2082, 9, 10),
    ("tamu-lhosar", 2082): (2082, 9, 15),
    ("maghe-sankranti", 2082): (2082, 10, 1),
    ("sonam-lhosar", 2082): (2082, 10, 5),
    ("shree-panchami", 2082): (2082, 10, 9),
    ("maha-shivaratri", 2082): (2082, 11, 3),
    ("gyalpo-lhosar", 2082): (2082, 11, 6),
    ("holi-hill", 2082): (2082, 11, 18),
    ("ghode-jatra", 2082): (2082, 12, 4),
    ("buddha-jayanti", 2082): (2082, 1, 29),
    ("ubhauli", 2082): (2082, 1, 29),
    ("nepali-new-year", 2082): (2082, 1, 1),
    # Public holiday list 2080 (Nepal Gazette, via edusanjal.com)
    ("ghatasthapana", 2080): (2080, 6, 28),
    ("vijaya-dashami", 2080): (2080, 7, 7),
    ("laxmi-puja", 2080): (2080, 7, 26),
    ("haritalika-teej", 2080): (2080, 6, 1),
    ("indra-jatra", 2080): (2080, 6, 11),
    ("gai-jatra", 2080): (2080, 5, 14),
    ("gaura-parva", 2080): (2080, 5, 7),
    ("chhath", 2080): (2080, 8, 3),
    ("udhauli", 2080): (2080, 9, 10),
    ("tamu-lhosar", 2080): (2080, 9, 15),
    ("sonam-lhosar", 2080): (2080, 10, 27),
    ("shree-panchami", 2080): (2080, 11, 2),
    ("maha-shivaratri", 2080): (2080, 11, 25),
    ("gyalpo-lhosar", 2080): (2080, 11, 28),
    ("holi-hill", 2080): (2080, 12, 11),
    ("holi-terai", 2080): (2080, 12, 12),
    ("ghode-jatra", 2080): (2080, 12, 26),
    ("buddha-jayanti", 2080): (2080, 1, 22),
    ("jitiya", 2080): (2080, 6, 20),
    ("yomari-punhi", 2080): (2080, 9, 10),
    ("yomari-punhi", 2082): (2082, 8, 18),
    # Sithi Nakha 2082 (Diplomat Nepal, 1 June 2025)
    ("sithi-nakha", 2082): (2082, 2, 18),
    # Krishna Janmashtami holidays (Sharesansar NEPSE closure notices)
    ("krishna-janmashtami", 2081): (2081, 5, 10),   # Mon 26 Aug 2024
    ("krishna-janmashtami", 2080): (2080, 5, 20),   # Wed 6 Sep 2023
    # Dashain 2083 (Samiti)
    ("ghatasthapana", 2083): (2083, 6, 25),
    ("fulpati", 2083): (2083, 6, 31),
    ("maha-ashtami", 2083): (2083, 7, 1),
    ("maha-navami", 2083): (2083, 7, 3),
    ("vijaya-dashami", 2083): (2083, 7, 4),
    # Laxmi Puja 2081 (Ekantipur)
    ("laxmi-puja", 2081): (2081, 7, 15),
}


def check():
    rows, bad = [], 0
    for (fid, y), (by, bm, bd) in OFFICIAL.items():
        o = F.occurrence(fid, y)
        want = bs.bs_to_ad(by, bm, bd)
        got = o.computed_date if o else None
        ok = got == want
        bad += not ok
        rows.append((ok, fid, y, want, got))
    return rows, bad


def test_official_dates():
    rows, bad = check()
    misses = [r for r in rows if not r[0]]
    assert not misses, misses


if __name__ == "__main__":
    rows, bad = check()
    for ok, fid, y, want, got in rows:
        print(("PASS" if ok else "FAIL"), f"{fid:24s} {y}  official {want}  computed {got}")
    print(f"\n{len(rows) - bad}/{len(rows)} match")
    sys.exit(1 if bad else 0)
