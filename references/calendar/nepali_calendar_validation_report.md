# Independent Validation Report — Nepali Calendar Master

**Status: PASS** — 30/31 checks passed; 0 errors; 1 warnings.

## Dataset

- **rows:** 22281
- **columns:** 87
- **coverage_ad:** ['1976-04-13', '2037-04-13']
- **coverage_bs:** ['2033-01-01', '2093-12-30']
- **months:** 732
- **festivals:** 1573

## Checks

| Check | Result | Detail |
|---|---|---|
| row_count_22281 | PASS | 22,281 rows |
| column_count_87 | PASS | 87 columns |
| unique_ad_dates | PASS | 22,281 unique / 22,281 |
| unique_bs_dates | PASS | 22,281 unique / 22,281 |
| ad_range | PASS | 1976-04-13 → 2037-04-13 |
| ad_daily_continuity | PASS | 0 gaps/duplicates |
| jdn_continuity | PASS | 0 discontinuities |
| weekday_matches_gregorian | PASS | 0 mismatches |
| month_count_732 | PASS | 732 BS months |
| bs_year_coverage | PASS | 2033–2093 (61 years) |
| all_12_months_each_year | PASS | 732 month keys |
| month_length_and_day_sequence | PASS | 0 bad months |
| month_year_boundary_flags | PASS | 0 flag mismatches |
| bs_daily_continuity | PASS | 0 sequence errors |
| month_names_stable | PASS | English issues=0, Nepali issues=0 |
| required_fields_complete | PASS |  |
| astronomy_numeric_ranges | PASS | 0 rows with out-of-range values |
| sunrise_sunset_daylight_consistency | PASS | 0 inconsistencies |
| festival_count_matches_names | PASS | 0 mismatches |
| weekly_holiday_flag | PASS | 0 mismatches |
| sankranti_count | PASS | 732 sankranti days |
| sankranti_name_presence | PASS | 0 mismatches |
| reconciliation_divergence_count | PASS | 225 divergence rows |
| gate1_delta_divergences_match | PASS | delta distribution={-1: 5, 0: 507, 1: 220} |
| sqlite_table_counts | PASS | {'days': 22281, 'bs_months': 732, 'festivals': 1573, 'sankranti': 732, 'meta': 11} |
| csv_sqlite_date_mapping_hash_match | PASS | sha256=6d782d2a7b1c71a2… |
| festival_primary_count_matches_master | PASS | master primary sum=1527, sqlite primary=1527; alternate/non-primary=46 |
| sqlite_month_lengths_match_csv | PASS | 0 mismatches |
| all_22281_mapping_roundtrips | PASS | 22,281/22,281 |
| month_length_conversion_algorithm_all_pairs | PASS | 22,281/22,281 exact in both directions |
| controlled_vocab_localization_review | WARN | 1 localization candidates; data structure remains valid |

## Notes

- Mapping SHA-256: `6d782d2a7b1c71a20d99b7726e26d71c1ca25a642f2e31d6289cc56a99476345`
- Gate-1 delta distribution: `{-1: 5, 0: 507, 1: 220}`
- Localization review candidates:
  - `moon_phase_ne`: पूर्ण जून (appears to be a literal/mistranslation candidate; review recommended)
