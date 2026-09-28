import { useEffect, useState } from "react";
import App from "./App";
import { JanmaPatroSuite } from "./jyotish/JanmaPatroSuite";
import { MediaSuite } from "./media/MediaSuite";

const SPA_ROUTES = new Set(["/", "/fm", "/tv", "/jyotish/janma-patro", "/jyotish/matchmaking"]);

function normalizePath(pathname: string) {
  const clean = pathname.replace(/\/+$/, "");
  return clean || "/";
}

export function SwarmApp() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      const next = normalizePath(url.pathname);
      if (url.origin !== window.location.origin || !SPA_ROUTES.has(next)) return;
      event.preventDefault();
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
      setPath(next);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (path === "/fm") document.title = "FM Radio · Nepali Patro";
    else if (path === "/tv") document.title = "Live TV · Nepali Patro";
    else if (path.startsWith("/jyotish/")) document.title = "Janma Patro & Guna Milan · Nepali Patro";
  }, [path]);

  if (path === "/fm") return <MediaSuite kind="radio" />;
  if (path === "/tv") return <MediaSuite kind="tv" />;
  if (path === "/jyotish/janma-patro" || path === "/jyotish/matchmaking") return <JanmaPatroSuite />;
  return <App />;
}
