import { useEffect, useMemo, useState } from "react";
import { COMMUNITY_OPTIONS, communityFeedUrl, loadCommunityPreferences, readCommunityPreferences, saveCommunityPreferences, type CommunityId } from "./preferences";

export function CommunityPreferences() {
  const [selected, setSelected] = useState<CommunityId[]>(readCommunityPreferences);
  const [status, setStatus] = useState("यो ब्राउजरमा सुरक्षित हुन्छ। साइन इन भएको अवस्थामा खातामा पनि सिङ्क हुन्छ।");

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
      <a className="community-back" href="/tools">← उपकरण</a>
      <section className="community-control-card">
        <p className="community-kicker">व्यक्तिगत पात्रो</p>
        <h1>मेरो समुदाय</h1>
        <p>तपाईंले छानेका समुदायका मिति, पर्व र सम्झना मुख्य पात्रो तथा समुदाय feed मा देखिन्छन्। कुनै विकल्प नछानेमा सामान्य पात्रो अनुभव यथावत् रहन्छ।</p>
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
          <a className="community-button secondary" href="/samudaya">समुदाय पात्रो खोल्नुहोस्</a>
        </div>
        <p className="community-note">उपलब्ध आधिकारिक रूपमा घोषित मितिलाई प्राथमिकता दिइन्छ। अन्य अवस्थामा पात्रोका नियमअनुसार सम्भावित मिति स्पष्ट रूपमा छुट्याएर देखाइन्छ।</p>
      </section>
    </main>
  );
}