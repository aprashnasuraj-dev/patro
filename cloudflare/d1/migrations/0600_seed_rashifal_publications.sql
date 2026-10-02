-- Retired legacy Rashifal bootstrap migration.
--
-- Rashifal publications are canonical retained content. They are populated from the
-- checked-in deterministic public snapshot and verified by exact row count. This file
-- intentionally performs no data mutation so applying historical migrations can never
-- delete, replace, or add a synthetic publication to an existing D1 database.
SELECT 1;
