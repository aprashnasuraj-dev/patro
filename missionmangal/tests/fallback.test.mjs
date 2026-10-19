import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceDossier } from '../v2/fallback.mjs';

test('no-LLM fallback creates a clearly labelled evidence dossier, never an approved article', () => {
  const excerpt = 'NASA documents that this observation was collected by a scientific instrument during a mission and records the date and measurement method.';
  const result = buildEvidenceDossier({
    topic: 'Example research topic',
    row: { id: 'topic-1', route: 'research' },
    registryItem: { id: 'topic-1', type: 'topic', slug: 'example', intent: 'Answer: Example research topic', meta: { title: 'Example research topic', question: 'What does the record show?' } },
    evidence: [
      { id: 's1', url: 'https://www.nasa.gov/example', title: 'Official record', publisher: 'NASA', retrieved_at: '2026-10-19T00:00:00Z', excerpts: [excerpt] },
      { id: 's2', url: 'https://www.usgs.gov/example', title: 'Second record', publisher: 'USGS', excerpts: [excerpt] },
      { id: 's3', url: 'https://www.nasa.gov/example', title: 'Duplicate URL', publisher: 'NASA', excerpts: [excerpt] }
    ]
  });
  assert.ok(result);
  assert.equal(result.status, 'release_candidate');
  assert.equal(result.sources.length, 2, 'canonical URL duplicates are removed');
  assert.equal(result.claims.length, 0, 'quoted evidence is not misrepresented as verified synthesized claims');
  assert.match(result.body_md, /not an approved article/i);
  assert.match(result.body_md, /NASA documents/);
  assert.equal(result.review.mode, 'manual-required');
});

test('no-LLM fallback returns null when there is no usable evidence', () => {
  const result = buildEvidenceDossier({
    topic: 'Unsupported topic',
    row: { id: 'topic-2', route: 'general' },
    registryItem: { id: 'topic-2', intent: 'Unsupported topic', meta: { title: 'Unsupported topic' } },
    evidence: [{ url: 'https://example.com', excerpts: ['too short'] }]
  });
  assert.equal(result, null);
});
