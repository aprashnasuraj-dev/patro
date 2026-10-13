/**
 * Static index bucket naming — shared by scripts/dictionary/build-dictionary.ts (writer), worker/dictionary.ts and
 * staticClient.ts (reader). Two leading characters per bucket.
 */
export const latinBucket = (romanKey: string): string => romanKey.slice(0, 2);

export const devBucket = (devKey: string): string =>
  [...devKey]
    .slice(0, 2)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('_');
