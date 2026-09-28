import { useEffect, useRef, useState } from "react";

interface Props {
  imageUrl: string | null;
  loading: boolean;
}

export function HeroCanvas({ imageUrl, loading }: Props) {
  const [current, setCurrent] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const pointerFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!imageUrl || imageUrl === current) return;
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = imageUrl;
    const commit = () => {
      if (cancelled) return;
      setPrevious(current);
      setCurrent(imageUrl);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPrevious(null), 1100);
    };
    if (image.complete) commit();
    else image.addEventListener("load", commit, { once: true });
    return () => { cancelled = true; image.removeEventListener("load", commit); };
  }, [imageUrl, current]);

  useEffect(() => {
    const root = document.documentElement;
    const move = (event: PointerEvent) => {
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = requestAnimationFrame(() => {
        root.style.setProperty("--cosmic-pointer-x", `${event.clientX}px`);
        root.style.setProperty("--cosmic-pointer-y", `${event.clientY}px`);
        const nx = event.clientX / Math.max(1, window.innerWidth) - 0.5;
        const ny = event.clientY / Math.max(1, window.innerHeight) - 0.5;
        root.style.setProperty("--cosmic-drift-x", `${nx * -14}px`);
        root.style.setProperty("--cosmic-drift-y", `${ny * -10}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    };
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <div className="hero-canvas" aria-hidden="true">
      {previous && <div className="hero-image hero-image--previous" style={{ backgroundImage: "url(" + JSON.stringify(previous) + ")" }} />}
      {current && <div key={current} className="hero-image hero-image--current" style={{ backgroundImage: "url(" + JSON.stringify(current) + ")" }} />}
      {!current && <div className="hero-image hero-image--fallback" />}
      <div className="hero-overlay" />
      <div className="hero-stars hero-stars--far" />
      <div className="hero-stars hero-stars--near" />
      <div className="pointer-nebula" />
      <div className="orbital-glow orbital-glow--one" />
      <div className="orbital-glow orbital-glow--two" />
      {loading && !current && <div className="hero-loading-shimmer" />}
    </div>
  );
}
