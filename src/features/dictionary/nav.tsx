/**
 * Minimal routing primitives for the dictionary, built on Aafnai Patro's own router
 * (src/PatroRouter.tsx: history.pushState + the "patro:navigation" event). Same names
 * as react-router so the pages read naturally, but no extra dependency.
 */
import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

export const NAV_EVENT = 'patro:navigation';

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const u = new URL(to, location.href);
  const url = u.pathname + u.search + u.hash;
  if (url === location.pathname + location.search + location.hash) return;
  if (opts.replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  window.dispatchEvent(new Event(NAV_EVENT));
  if (!opts.replace && !u.hash) scrollTo({ top: 0 });
}

function useLocationKey(): string {
  const read = () => location.pathname + location.search;
  const [k, setK] = useState(read);
  useEffect(() => {
    const f = () => setK(read());
    addEventListener('popstate', f);
    addEventListener(NAV_EVENT, f);
    return () => {
      removeEventListener('popstate', f);
      removeEventListener(NAV_EVENT, f);
    };
  }, []);
  return k;
}

export function usePathname(): string {
  useLocationKey();
  return location.pathname.replace(/\/+$/, '') || '/';
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void] {
  const key = useLocationKey();
  const params = new URLSearchParams(key.includes('?') ? key.slice(key.indexOf('?')) : '');
  const set = useCallback((next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => {
    const p = typeof next === 'function' ? next(new URLSearchParams(location.search)) : next;
    const qs = p.toString();
    navigate(location.pathname + (qs ? `?${qs}` : ''));
  }, []);
  return [params, set];
}

export const useNavigate = () => navigate;

const ParamsCtx = createContext<Record<string, string | undefined>>({});
export const ParamsProvider = ParamsCtx.Provider;
export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useContext(ParamsCtx) as T;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; replace?: boolean };

function onLinkClick(e: MouseEvent<HTMLAnchorElement>, to: string, replace?: boolean, target?: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (target && target !== '_self')) return;
  const u = new URL(to, location.href);
  if (u.origin !== location.origin) return;
  e.preventDefault();
  navigate(to, { replace });
}

export function Link({ to, replace, onClick, target, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      target={target}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        onLinkClick(e, to, replace, target);
      }}
    />
  );
}

export function NavLink({ to, end, className, children, ...rest }: Omit<LinkProps, 'className' | 'children'> & { end?: boolean; className?: string | ((s: { isActive: boolean }) => string | undefined); children?: ReactNode }) {
  const path = usePathname();
  const target = new URL(to, location.href).pathname.replace(/\/+$/, '');
  const isActive = end ? decodeURIComponent(path) === decodeURIComponent(target) : decodeURIComponent(path).startsWith(decodeURIComponent(target));
  return (
    <Link to={to} className={typeof className === 'function' ? className({ isActive }) : className} aria-current={isActive ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  );
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  useEffect(() => navigate(to, { replace }), [to, replace]);
  return null;
}
