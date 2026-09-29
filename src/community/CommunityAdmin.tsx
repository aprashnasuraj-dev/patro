import { FormEvent, useState } from "react";
import { authAccessToken, authAppRole } from "./preferences";

async function post(path: string, body: unknown) {
  const token = authAccessToken();
  if (!token) throw new Error("पहिले admin account बाट sign in गर्नुहोस्।");
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Save failed");
  return result;
}

export function CommunityAdmin() {
  const [message, setMessage] = useState("");
  const role = authAppRole();
  const [community, setCommunity] = useState({ suite: "lhosar", festival_id: "gyalpo-lhosar", year: String(new Date().getFullYear()), start_ad: "", end_ad: "", note: "" });
  const [ns, setNs] = useState({ ns_year: "1147", festival_id: "bhoto-jatra", start_ad: "", end_ad: "", note: "" });

  async function saveCommunity(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      const r = await post("/api/v1/admin/community-overrides", { ...community, year: Number(community.year), end_ad: community.end_ad || undefined, note: community.note || undefined });
      setMessage("समुदाय मिति सुरक्षित भयो · " + (r.badge || "घोषित"));
    } catch (e) { setMessage((e as Error).message); }
  }
  async function saveNs(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      const r = await post("/api/v1/admin/ns-festival-dates", { ...ns, ns_year: Number(ns.ns_year), note: ns.note || undefined });
      setMessage("नेपाल संवत् मिति सुरक्षित भयो · " + (r.badge || "घोषित"));
    } catch (e) { setMessage((e as Error).message); }
  }

  if (role !== "admin") return (
    <main className="community-control-page">
      <a className="community-back" href="/settings/community">← मेरो समुदाय</a>
      <section className="community-control-card">
        <p className="community-kicker">Admin only</p>
        <h1>आधिकारिक मिति प्रशासन</h1>
        <p>यो form admin account का लागि मात्र उपलब्ध छ। Sign in गरेपछि admin role भएको session बाट खोल्नुहोस्।</p>
      </section>
    </main>
  );

  return (
    <main className="community-control-page">
      <a className="community-back" href="/settings/community">← मेरो समुदाय</a>
      <section className="community-control-card">
        <p className="community-kicker">Admin only · Official announcements</p>
        <h1>घोषित मिति override</h1>
        <p>Engine को गणना/सम्भावित परिणाम हटाइँदैन। आधिकारिक घोषणा आएपछि मात्र override थपिन्छ। API ले admin role नभएको session लाई 403 दिन्छ।</p>
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
