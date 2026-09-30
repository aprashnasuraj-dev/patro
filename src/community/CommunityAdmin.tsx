import { FormEvent, useEffect, useState } from "react";

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Request failed");
  return result;
}

async function post(path: string, body: unknown) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function CommunityAdmin() {
  const [message, setMessage] = useState("");
  const [access, setAccess] = useState<"checking"|"allowed"|"denied">("checking");
  const [community, setCommunity] = useState({ suite: "lhosar", festival_id: "gyalpo-lhosar", year: String(new Date().getFullYear()), start_ad: "", end_ad: "", note: "" });
  const [ns, setNs] = useState({ ns_year: "1147", festival_id: "bhoto-jatra", start_ad: "", end_ad: "", note: "" });

  useEffect(() => {
    let active = true;
    api("/api/v1/admin/community-overrides")
      .then(() => { if (active) setAccess("allowed"); })
      .catch(() => { if (active) setAccess("denied"); });
    return () => { active = false; };
  }, []);

  async function saveCommunity(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      await post("/api/v1/admin/community-overrides", { ...community, year: Number(community.year), end_ad: community.end_ad || undefined, note: community.note || undefined });
      setMessage("समुदाय मिति सुरक्षित भयो · घोषित");
    } catch (e) { setMessage((e as Error).message); }
  }
  async function saveNs(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      await post("/api/v1/admin/ns-festival-dates", { ...ns, ns_year: Number(ns.ns_year), note: ns.note || undefined });
      setMessage("नेपाल संवत् मिति सुरक्षित भयो · घोषित");
    } catch (e) { setMessage((e as Error).message); }
  }

  if (access !== "allowed") return (
    <main className="community-control-page">
      <a className="community-back" href="/settings/community">← मेरो समुदाय</a>
      <section className="community-control-card">
        <p className="community-kicker">Admin only</p>
        <h1>आधिकारिक मिति प्रशासन</h1>
        <p>{access === "checking" ? "Google account अनुमति जाँच हुँदैछ…" : "यो पृष्ठ Google sign-in भएको अनुमतिप्राप्त admin account का लागि मात्र उपलब्ध छ।"}</p>
      </section>
    </main>
  );

  return (
    <main className="community-control-page">
      <a className="community-back" href="/settings/community">← मेरो समुदाय</a>
      <section className="community-control-card">
        <p className="community-kicker">Admin only · Official announcements</p>
        <h1>घोषित मिति override</h1>
        <p>Engine को गणना/सम्भावित परिणाम हटाइँदैन। आधिकारिक घोषणा आएपछि मात्र D1 override थपिन्छ। Authorization Google session र Cloudflare admin allow-list बाट server-side verify हुन्छ।</p>
        <div className="community-admin-grid">
          <form onSubmit={saveCommunity}>
            <h2>Community override</h2>
            <label>Suite<select value={community.suite} onChange={(e)=>setCommunity({...community,suite:e.target.value})}><option value="lhosar">Lhosar</option><option value="tharu">Tharu</option><option value="mithila">Mithila</option><option value="kirat">Kirat</option><option value="hijri">Hijri</option></select></label>
            <label>Festival ID<input value={community.festival_id} onChange={(e)=>setCommunity({...community,festival_id:e.target.value})} placeholder="eid-ul-fitr / chhath / gyalpo-lhosar" required /></label>
            <label>AD year<input type="number" value={community.year} onChange={(e)=>setCommunity({...community,year:e.target.value})} required /></label>
            <label>Start AD<input type="date" value={community.start_ad} onChange={(e)=>setCommunity({...community,start_ad:e.target.value})} required /></label>
            <label>End AD (optional)<input type="date" value={community.end_ad} onChange={(e)=>setCommunity({...community,end_ad:e.target.value})} /></label>
            <label>Official note<input value={community.note} onChange={(e)=>setCommunity({...community,note:e.target.value})} /></label>
            <button className="community-button" type="submit">घोषित मिति सुरक्षित गर्नुहोस्</button>
          </form>
          <form onSubmit={saveNs}>
            <h2>Nepal Sambat festival</h2>
            <label>NS year<input type="number" value={ns.ns_year} onChange={(e)=>setNs({...ns,ns_year:e.target.value})} required /></label>
            <label>Festival ID<input value={ns.festival_id} onChange={(e)=>setNs({...ns,festival_id:e.target.value})} placeholder="bhoto-jatra" required /></label>
            <label>Start AD<input type="date" value={ns.start_ad} onChange={(e)=>setNs({...ns,start_ad:e.target.value})} required /></label>
            <label>End AD<input type="date" value={ns.end_ad} onChange={(e)=>setNs({...ns,end_ad:e.target.value})} required /></label>
            <label>Official note<input value={ns.note} onChange={(e)=>setNs({...ns,note:e.target.value})} /></label>
            <button className="community-button" type="submit">घोषित NS मिति सुरक्षित गर्नुहोस्</button>
          </form>
        </div>
        <p className="community-status" role="status">{message}</p>
      </section>
    </main>
  );
}
