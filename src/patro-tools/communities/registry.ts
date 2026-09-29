import { LHOSAR } from './lhosar/data';
import { THARU } from './tharu/data';
import { MITHILA } from './mithila/data';
import { KIRAT } from './kirat/data';
import { HIJRI } from './hijri/data';
import type { Suite } from './shared/types';

export const SUITES: Record<Suite['id'], Suite> = { lhosar: LHOSAR, tharu: THARU, mithila: MITHILA, kirat: KIRAT, hijri: HIJRI };
export type SuiteId = keyof typeof SUITES;
export { LHOSAR, THARU, MITHILA, KIRAT, HIJRI };
