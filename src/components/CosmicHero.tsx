import { useMemo, useRef, useState } from "react";
import type { ApodPayload, CosmicDayPayload, SyncPayload, TithiPayload } from "../types";

interface Props {
  sync: SyncPayload | null;
  tithi: TithiPayload | null;
  cosmic: CosmicDayPayload | null;
  apod: ApodPayload | null;
  health: "checking" | "online" | "offline";
  selectedDate: string;
  today: string;
  loading: boolean;
  onDateChange: (date: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

function dateText(sync: SyncPayload | null, selectedDate: string) {
  return {
    ad: sync?.calendars.gregorian_ad || selectedDate,
    bs: sync?.calendars.bikram_sambat || "BS unavailable",
    ns: sync?.calendars.nepal_sambat || "NS unavailable"
  };
}

function solarTone(level: string | undefined) {
  switch (level) {
    case "Elevated": return 92;
    case "Moderate": return 78;
    case "Low": return 66;
    default: return 56;
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
}

export function CosmicHero({
  sync,
  tithi,
  cosmic,
  apod,
  health,
  selectedDate,
  today,
  loading,
  onDateChange,
  onPreviousDay,
  onNextDay,
  onToday
}: Props) {
  const [soundOn, setSoundOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const dates = dateText(sync, selectedDate);

  const context = useMemo(() => {
    const moon = tithi ? `${tithi.illumination_percent.toFixed(1)}% Moon illumination` : "Moon data loading";
    const close = cosmic?.neo?.close_count_005_au ?? 0;
    const neo = cosmic?.neo?.status === "ok"
      ? `${close} NEO${close === 1 ? "" : "s"} within 0.05 AU`
      : "NEO feed unavailable";
    const solar = cosmic?.solar?.level ? `Solar activity: ${cosmic.solar.level}` : "Solar activity loading";
    return `${moon} • ${neo} • ${solar}`;
  }, [tithi, cosmic]);

  async function toggleAmbient() {
    if (soundOn) {
      await audioRef.current?.close();
      audioRef.current = null;
      setSoundOn(false);
      return;
    }

    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;

    const ctx = new Context();
    const master = ctx.createGain();
    master.gain.value = 0.02;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.6;
    filter.connect(master);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    const base = solarTone(cosmic?.solar?.level);
    const moonFactor = 1 + ((tithi?.illumination_percent ?? 50) / 100) * 0.12;
    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.value = base * moonFactor;
    oscB.frequency.value = base * 1.501 * moonFactor;

    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 4;
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 0.8;
    gainB.gain.value = 0.22;

    oscA.connect(gainA).connect(filter);
    oscB.connect(gainB).connect(filter);
    oscA.start();
    oscB.start();
    lfo.start();

    audioRef.current = ctx;
    setSoundOn(true);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen is a progressive enhancement.
    }
  }

  async function shareCosmicCard() {
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(0.52, "#0f172a");
      gradient.addColorStop(1, "#071a2b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let seed = selectedDate.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      function random() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }
      for (let i = 0; i < 170; i++) {
        const alpha = 0.18 + random() * 0.72;
        const radius = 0.4 + random() * 1.8;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(random() * 1200, random() * 630, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(950, 130, 20, 950, 130, 260);
      glow.addColorStop(0, "rgba(56,189,248,.25)");
      glow.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(690, 0, 510, 420);

      ctx.fillStyle = "#7dd3fc";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.fillText("PATRO · COSMIC DAY", 72, 78);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "800 54px system-ui, sans-serif";
      ctx.fillText(dates.ad, 72, 154);
      ctx.font = "700 31px system-ui, sans-serif";
      ctx.fillText(dates.bs, 72, 212);
      ctx.fillText(dates.ns, 72, 257);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 24px system-ui, sans-serif";
      const facts = [
        tithi ? `${tithi.tithi_name_ne} · ${tithi.illumination_percent.toFixed(1)}% illuminated` : "Lunar data unavailable",
        cosmic?.neo?.status === "ok" ? `${cosmic.neo.count} near-Earth objects tracked` : "NEO feed unavailable",
        cosmic?.solar?.level ? `Solar activity · ${cosmic.solar.level}` : "Solar activity unavailable"
      ];
      facts.forEach((fact, index) => ctx.fillText(fact, 72, 344 + index * 42));

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 20px system-ui, sans-serif";
      ctx.fillText(apod?.title || "NASA-connected astronomical calendar", 72, 506);
      ctx.fillText("patro-blush.vercel.app/astro", 72, 558);

      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const file = new File([blob], `patro-cosmic-${selectedDate}.png`, { type: "image/png" });
      const shareData: ShareData = {
        title: `Patro Cosmic Day · ${selectedDate}`,
        text: context,
        url: `${location.origin}/astro?date=${selectedDate}`
      };

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <header className="cosmic-hero glass-panel">
      <div className="cosmic-hero__topline">
        <div>
          <p className="eyebrow">Living astronomical instrument · Nepal</p>
          <h1>Patro Sky Calendar</h1>
          <p className="cosmic-hero__apod">{apod?.title || "Synchronizing with NASA and the selected sky…"}</p>
        </div>
        <div className={"health-pill health-pill--" + health}>
          <span className="health-dot" aria-hidden="true" />
          <span>{health === "online" ? "Edge online" : health === "offline" ? "Edge unavailable" : "Checking edge"}</span>
        </div>
      </div>

      <div className="cosmic-hero__dates" aria-live="polite">
        <div className="cosmic-date"><span>Gregorian · AD</span><strong>{dates.ad}</strong></div>
        <div className="cosmic-date"><span>Bikram Sambat · BS</span><strong>{dates.bs}</strong></div>
        <div className="cosmic-date"><span>Nepal Sambat · NS</span><strong>{dates.ns}</strong></div>
      </div>

      <div className="cosmic-context">
        <span className="cosmic-context__pulse" aria-hidden="true" />
        <strong>Cosmic Context</strong>
        <span>{loading ? "Reading this sky…" : context}</span>
      </div>

      <div className="cosmic-hero__toolbar">
        <button className="icon-button" onClick={onPreviousDay} aria-label="Previous day">←</button>
        <label className="date-input-wrap cosmic-date-input">
          <span>Selected Earth date</span>
          <input
            type="date"
            value={selectedDate}
            min="1826-04-11"
            max="2037-04-13"
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
          />
        </label>
        <button className="icon-button" onClick={onNextDay} aria-label="Next day">→</button>
        <button className="secondary-button" onClick={onToday} disabled={selectedDate === today}>Today</button>
        <button className="secondary-button" onClick={toggleAmbient} aria-pressed={soundOn}>
          {soundOn ? "🔊 Ambient on" : "🔈 Ambient"}
        </button>
        <button className="secondary-button" onClick={toggleFullscreen}>✦ Stand under this sky</button>
        <button className="secondary-button" onClick={shareCosmicCard} disabled={sharing}>
          {sharing ? "Creating card…" : "↗ Cosmic Card"}
        </button>
      </div>
    </header>
  );
}
