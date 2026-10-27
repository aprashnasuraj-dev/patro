// TEST_PENDING — prepared for later integration; intentionally not executed in staging.
import { describe, it, expect } from 'vitest';
import * as core from '../src/core';

describe('TOOL-0139 Image DPI Changer (72 to 300 DPI)', () => {
  it.todo('matches the known-answer fixture');
  it.todo('rejects malformed and oversized input');
  it.todo('handles unsupported cases with an explicit warning');
  it.todo('sanitizes filenames and generated text/markup');
  it.todo('keeps output bounded under pathological input');
  it.todo('produces deterministic output formatting where applicable');
});
