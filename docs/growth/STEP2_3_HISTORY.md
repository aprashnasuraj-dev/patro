# Step 2.3: static history

Both homepage history renderers read the existing generated month shard, applying the identical published filter and ordering. Their existing rendering and rotation remain intact. Missing/corrupt assets fall back to the original API. /data/* bypasses the Worker, and includes the immutable client calendar shards. Tests compare all records with the original Worker for January 1, June 15 and October 8, plus fallback.

Rollback: revert the history-client imports and !/data/* config entry. No API or archive is removed.
