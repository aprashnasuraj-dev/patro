import { useEffect, useRef, useState } from "react";

interface Props {
  imageUrl: string | null;
  loading: boolean;
}

export function HeroCanvas({ imageUrl, loading }: Props) {
  const [current, setCurrent] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!imageUrl || imageUrl === current) return;

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;

    const commit = () => {
      if (cancelled) return;
      setPrevious(current);
      setCurrent(imageUrl);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPrevious(null), 900);
    };

    if (image.complete) commit();
    else image.addEventListener("load", commit, { once: true });

    return () => {
      cancelled = true;
      image.removeEventListener("load", commit);
    };
  }, [imageUrl, current]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <div className="hero-canvas" aria-hidden="true">
      {previous && (
        <div
          className="hero-image hero-image--previous"
          style={{ backgroundImage: "url(" + JSON.stringify(previous) + ")" }}
        />
      )}
      {current && (
        <div
          key={current}
          className="hero-image hero-image--current"
          style={{ backgroundImage: "url(" + JSON.stringify(current) + ")" }}
        />
      )}
      {!current && <div className="hero-image hero-image--fallback" />}
      <div className="hero-overlay" />
      <div className="hero-stars" />
      {loading && !current && <div className="hero-loading-shimmer" />}
    </div>
  );
}
