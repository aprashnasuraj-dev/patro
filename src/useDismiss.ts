import { useEffect } from "react";

/**
 * Close a popup/menu when the user navigates inside the app (the SPA never reloads, so
 * open state otherwise survives page changes), uses Back/Forward, or presses Escape.
 */
export function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("patro:navigate", close);
    window.addEventListener("popstate", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("patro:navigate", close);
      window.removeEventListener("popstate", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
}

/**
 * <details> menus (e.g. the header "थप" menu) stay open after an SPA navigation.
 * Close them when an item inside is chosen, on outside click, on navigation and on Escape.
 */
export function useDetailsMenuDismiss(selector: string) {
  useEffect(() => {
    const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>(selector));
    const closeAll = (keep?: Element | null) => menus().forEach((menu) => { if (menu.open && menu !== keep) menu.open = false; });
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const menu = target?.closest?.(selector) || null;
      if (menu && target?.closest("a,button:not(summary *)")) { closeAll(); return; } // item chosen
      closeAll(menu); // outside click (or another menu's summary) closes the rest
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = menus().find((menu) => menu.open);
      if (open) { open.open = false; open.querySelector("summary")?.focus(); }
    };
    const onNavigate = () => closeAll();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("patro:navigate", onNavigate);
    window.addEventListener("popstate", onNavigate);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("patro:navigate", onNavigate);
      window.removeEventListener("popstate", onNavigate);
    };
  }, [selector]);
}
