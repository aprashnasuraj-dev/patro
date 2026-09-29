import { useEffect, useMemo, useState } from "react";
import { COMMUNITY_OPTIONS, communityFeedUrl, loadCommunityPreferences, readCommunityPreferences, saveCommunityPreferences, type CommunityId } from "./preferences";

export function CommunityPreferences() {
  const [selected, setSelected] = useState<CommunityId[]>(readCommunityPreferences);
  const [status, setStatus] = useState("यो ब्राउजरमा सुरक्षित हुन्छ। साइन इन भएको अवस्थामा खातामा पनि sync हुन्छ।");

  useEffect(() => {
    let active = true;
    loadCommunityPreferences().then((ids) => { if (active) setSelected(ids); });
    return () => { active = false; };
  }, []);

  async function toggle(id: CommunityId) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    const result = await saveCommunityPreferences(next);
    setStatus(result.saved === "account" ? "खातामा सुरक्षित भयो।" : "यस ब्राउजरमा सुरक्षित भयो।");
  }

  const feed = useMemo(() => communityFeedUrl(selected), [selected]);

  return (
    <main className="community-control-page">
      <a className="community-back" href="/tools">← Tools</a>
      <section className="community-control-card">
        <p className="community-kicker">Settings · व्यक्तिगत पात्रो</p>
        <h1>मेरो समुदाय</h1>
        <p>छानिएका समुदाय मात्रै home date card, community reminder/calendar feed र सम्बन्धित shortcut मा देखिन्छन्। कुनै पनि विकल्प नछानेमा home card खाली रहन्छ।</p>
        <div className="community-check-grid">
          {COMMUNITY_OPTIONS.map((item) => (
            <label className={"community-check " + (selected.includes(item.id) ? "is-selected" : "")} key={item.id}>
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => void toggle(item.id)} />
              <span><strong>{item.dev}</strong><small>{item.en}</small></span>
            </label>
          ))}
        </div>
        <p className="community-status" aria-live="polite">{status}</p>
        <div className="community-actions">
          <a className="community-button" href={feed}>चयनित समुदायको Calendar / Reminder Feed (.ics)</a>
          <a className="community-button secondary" href="/samudaya">Community Suite खोल्नुहोस्</a>
        </div>
        <p className="community-note">Feed ले चयनित समुदायका engine-generated/officially-overridden मितिहरू मात्र समावेश गर्छ। ‘घोषित’ मितिले ‘सम्भावित’ वा ‘गणना’ मितिलाई प्राथमिकता दिन्छ।</p>
      </section>
    </main>
  );
}
