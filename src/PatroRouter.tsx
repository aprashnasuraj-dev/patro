import { useEffect, useState } from "react";
import App from "./App";
import { MediaSuite } from "./media/MediaSuite";
import { JanmaPatroSuite } from "./jyotish/JanmaPatroSuite";
import { UtilitySuite } from "./utilities/UtilitySuite";

const NATIVE_PATHS = new Set(["/astro", "/fm", "/tv", "/tools", "/jyotish/janma-patro", "/jyotish/matchmaking"]);

function isNativePath(path: string) {
  return NATIVE_PATHS.has(path) || path.startsWith("/tools/");
}

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function PatroRouter() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const normalized = url.pathname.replace(/\/+$/, "") || "/";
      if (!isNativePath(normalized)) return;
      event.preventDefault();
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
      setPath(normalized);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (path === "/fm") return <MediaSuite kind="radio" />;
  if (path === "/tv") return <MediaSuite kind="tv" />;
  if (path === "/tools" || path.startsWith("/tools/")) return <UtilitySuite key={path} />;
  if (path === "/jyotish/janma-patro" || path === "/jyotish/matchmaking") return <JanmaPatroSuite />;
  return <App />;
}
