import { useState } from "react";
import type { ApodPayload } from "../types";

interface Props {
  data: ApodPayload | null;
  loading: boolean;
  error: string | null;
}

export function NasaDrawer({ data, loading, error }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={"nasa-drawer" + (open ? " nasa-drawer--open" : "")}>
      <button
        className="nasa-drawer__handle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="nasa-narrative"
      >
        <span className="nasa-mark">NASA</span>
        <span className="nasa-handle-copy">
          <strong>{loading && !data ? "Loading daily sky…" : data?.title || "NASA narrative"}</strong>
          <small>{data?.date || "Astronomy Picture of the Day"}</small>
        </span>
        {data?.is_fallback && <span className="fallback-pill">SVS fallback</span>}
        <span className="drawer-chevron" aria-hidden="true">{open ? "⌄" : "⌃"}</span>
      </button>

      <div id="nasa-narrative" className="nasa-drawer__content">
        {error ? (
          <div className="inline-error" role="alert">{error}</div>
        ) : loading && !data ? (
          <div className="drawer-skeleton">
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </div>
        ) : data ? (
          <>
            <div className="narrative-heading">
              <div>
                <p className="eyebrow">Astronomy Picture of the Day</p>
                <h2>{data.title}</h2>
              </div>
              <div className="narrative-meta">
                <span>{data.copyright}</span>
                {data.source_media_type === "video" && <span>Video thumbnail</span>}
                {data.is_fallback && <span>Fallback active</span>}
              </div>
            </div>
            <p className="narrative-copy">{data.explanation}</p>
          </>
        ) : null}
      </div>
    </aside>
  );
}
