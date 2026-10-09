import { useEffect, useState } from "react";
import { compactNepalSambat } from "../nepalSambatCompact";
import { COMMUNITY_OPTIONS, readCommunityPreferences, type CommunityId } from "./preferences";

type HomeItem = { id: CommunityId; title: string; value: string; badge: string; href: string };

export function CommunityHomeLine({ selectedDate }: { selectedDate: string }) {
  const [selected, setSelected] = useState<CommunityId[]>(readCommunityPreferences);
  const [items, setItems] = useState<HomeItem[]>([]);

  useEffect(() => {
    const sync = () => setSelected(readCommunityPreferences());
    window.addEventListener("storage", sync);
    window.addEventListener("patro:communities", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("patro:communities", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!selected.length) { setItems([]); return; }
    const controller = new AbortController();
    const option = (id: CommunityId) => COMMUNITY_OPTIONS.find((x) => x.id === id)!;
    Promise.all(selected.map(async (id): Promise<HomeItem | null> => {
      try {
        if (id === "nepal-sambat") {
          const r = await fetch("/api/v1/nepal-sambat?ad=" + encodeURIComponent(selectedDate), { signal: controller.signal });
          const b = await r.json();
          if (!r.ok || !b?.lunar) return null;
          return { id, title: option(id).dev, value: compactNepalSambat(b.lunar) || selectedDate, badge: "गणना", href: option(id).href };
        }
        if (id === "hijri") {
          const r = await fetch("/api/v1/hijri?date=" + encodeURIComponent(selectedDate) + "&lat=27.7172&lon=85.324&method=karachi&asr=hanafi", { signal: controller.signal });
          const b = await r.json();
          if (!r.ok || !b?.hijri) return null;
          return { id, title: option(id).dev, value: String(b.hijri.day) + " " + (b.hijri.month_name?.dev || b.hijri.month) + " " + b.hijri.year, badge: b.badge || "सम्भावित", href: option(id).href };
        }
        const r = await fetch("/api/v1/communities/" + id + "?from=" + encodeURIComponent(selectedDate) + "&count=1", { signal: controller.signal });
        const b = await r.json();
        const next = b?.items?.[0];
        if (!r.ok || !next) return null;
        return { id, title: option(id).dev, value: next.dev + " · " + next.start, badge: next.review ? "समीक्षाधीन" : (next.badge || "गणना"), href: option(id).href };
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return null;
        return null;
      }
    })).then((rows) => setItems(rows.filter((x): x is HomeItem => !!x)));
    return () => controller.abort();
  }, [selectedDate, selected.join("|")]);

  if (!selected.length || !items.length) return null;
  return (
    <section className="community-home-line glass-panel" aria-label="मेरो समुदाय">
      <div className="community-home-head">
        <div><small>मेरो समुदाय</small><strong>Community Suite</strong></div>
        <a href="/settings/community">सम्पादन</a>
      </div>
      <div className="community-home-grid">
        {items.map((item) => <a href={item.href} key={item.id}><span>{item.title}</span><b>{item.value}</b><small>{item.badge}</small></a>)}
      </div>
    </section>
  );
}
