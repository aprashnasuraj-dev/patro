# J1 — Three birthdays and computed alignment

New /janmadin has an AD/BS input, optional time/place, independent inclusive mode
and explicit local save/delete. Existing Akhbar gets the section only with
?birthday=1, so its default output stays identical. Private inputs never enter
URLs/metadata. New storage read/write: patro.birthday.v1; optional saved place
reads patro.place.v1. Existing life/account sync is not used.

AD, BS and sunrise-tithi dates are compared for ten civil years from immutable
static archive shards, with lunar month naming as a labelled computed supplement.
Alignment means exact same/adjacent dates, never a hard-coded 19-year cycle.
Missing archive coverage/tithi stays unavailable. Feb 29 and short BS month
policies are explicitly labelled. Shards are produced at build time, not D1/R2.

## Preserved behaviours
- [x] All 22,902 old URLs, old Akhbar/JanmaPatro default content and controls.
- [x] Old storage, account sync, archive data and CSP untouched.

## Validation and rollback
TypeScript and 20 fixed-seed archive birthday cases pass, including actual
alignment comparison and leap day. Revert this item; new birthday key is isolated.
