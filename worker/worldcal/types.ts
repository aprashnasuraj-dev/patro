export type Ctx = { site: string; url: URL; path: string; now: Date };

/** A page result. maxAge "midnight" = cache until the next local midnight in `tz` (for "today" pages). */
export type Rendered =
  | { status: 200 | 404; html: string; maxAge: number | "midnight"; tz?: string; indexable: boolean; contentType?: string }
  | { status: 301 | 302; location: string };
