import { neNumber } from "../nepaliDate";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ApodPayload, CosmicDayPayload, SyncPayload, TithiPayload } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  sync: SyncPayload | null;
  tithi: TithiPayload | null;
  cosmic: CosmicDayPayload | null;
  apod: ApodPayload | null;
}

function distanceText(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return "—";
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} मिलियन किमी`;
  return `${neNumber(km)} किमी`;
}

function solarLabel(level: string | undefined) {
  if (level === "Elevated") return "उच्च";
  if (level === "Moderate") return "मध्यम";
  if (level === "Low") return "कम";
  if (level === "Quiet") return "शान्त";
  return "—";
}

function makeParticles(seedText: string) {
  let seed = seedText.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 76 }, (_, index) => ({
    id: index,
    left: random() * 100,
    top: random() * 100,
    size: 1 + random() * 2.2,
    opacity: 0.24 + random() * 0.7,
    delay: random() * -12,
    duration: 7 + random() * 11
  }));
}

export function StandUnderThisSky({
  open,
  onClose,
  selectedDate,
  sync,
  tithi,
  cosmic,
  apod
}: Props) {
  const reduceMotion = useReducedMotion();
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const wasFullscreen = useRef(false);
  const particles = useMemo(() => makeParticles(selectedDate), [selectedDate]);

  const epic = cosmic?.earth.epic.items?.[0] ?? null;
  const preferEpic = Boolean(apod?.is_fallback && epic?.image_url);
  const backgroundUrl = preferEpic
    ? epic?.image_url
    : (apod?.hdurl || apod?.url || epic?.image_url || "");
  const backgroundLabel = preferEpic
    ? `पृथ्वी अवलोकन · ${cosmic?.earth.epic.image_date || selectedDate}`
    : apod?.title || (epic ? "पृथ्वी अवलोकन" : "खगोलीय आकाश");

  const nearestNeo = cosmic?.neo.items?.[0] ?? null;
  const ad = sync?.calendars.gregorian_ad || selectedDate;
  const bs = sync?.calendars.bikram_sambat || "—";
  const ns = sync?.calendars.nepal_sambat || "—";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    wasFullscreen.current = Boolean(document.fullscreenElement);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
    };
    const onFullscreen = () => {
      if (document.fullscreenElement) {
        wasFullscreen.current = true;
      } else if (wasFullscreen.current) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    if (audioRef.current) {
      void audioRef.current.close();
      audioRef.current = null;
    }
    setSoundOn(false);
  }, [open]);

  async function stopAmbient() {
    if (audioRef.current) {
      await audioRef.current.close();
      audioRef.current = null;
    }
    setSoundOn(false);
  }

  async function toggleAmbient() {
    if (soundOn) {
      await stopAmbient();
      return;
    }

    const Context = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;

    const ctx = new Context();
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    master.gain.value = 0.018;
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);

    const solarBase =
      cosmic?.solar.level === "Elevated" ? 96 :
      cosmic?.solar.level === "Moderate" ? 82 :
      cosmic?.solar.level === "Low" ? 70 : 58;
    const moonFactor = 1 + ((tithi?.illumination_percent ?? 50) / 100) * 0.1;

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gainA = ctx.createGain();
    const gainB = ctx.createGain();

    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.value = solarBase * moonFactor;
    oscB.frequency.value = solarBase * 1.498 * moonFactor;
    gainA.gain.value = 0.75;
    gainB.gain.value = 0.18;
    lfo.type = "sine";
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 3.2;

    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    oscA.connect(gainA).connect(filter);
    oscB.connect(gainB).connect(filter);
    oscA.start();
    oscB.start();
    lfo.start();

    audioRef.current = ctx;
    setSoundOn(true);
  }

  async function closeSky() {
    await stopAmbient();
    onClose();
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // The overlay still closes if the browser refuses fullscreen exit.
      }
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="sky-mode"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedDate} को आकाश दृश्य`}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div
            className="sky-mode__background"
            style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
            aria-hidden="true"
          />
          <div className="sky-mode__veil" aria-hidden="true" />
          <div className="sky-mode__aurora" aria-hidden="true" />

          <div className="sky-mode__particles" aria-hidden="true">
            {particles.map((particle) => (
              <i
                className="sky-particle"
                key={particle.id}
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  width: particle.size,
                  height: particle.size,
                  opacity: particle.opacity,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: reduceMotion ? "0s" : `${particle.duration}s`
                }}
              />
            ))}
          </div>

          <div className="sky-mode__topbar">
            <div>
              <span className="eyebrow">यस मितिको आकाश</span>
              <strong>{backgroundLabel}</strong>
            </div>
            <div className="sky-mode__actions">
              <button className="sky-mode__sound" onClick={toggleAmbient} aria-pressed={soundOn}>
                {soundOn ? "🔊 ध्वनि चालु" : "🔈 आकाश ध्वनि"}
              </button>
              <button className="sky-mode__close" onClick={closeSky} aria-label="आकाश दृश्य बन्द गर्नुहोस्">×</button>
            </div>
          </div>

          <motion.div
            className="sky-mode__content"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.18, duration: 0.55 }}
          >
            <div className="sky-mode__date-stack">
              <span>ई.सं. मिति</span>
              <h2>{ad}</h2>
              <strong>{bs}</strong>
              <strong>{ns}</strong>
            </div>

            <div className="sky-mode__facts">
              <div>
                <span>चन्द्र</span>
                <strong>{tithi ? `${tithi.illumination_percent.toFixed(1)}% प्रकाश` : "—"}</strong>
                <small>{tithi ? `${tithi.tithi_name_ne} · ${tithi.tithi_name}` : "चन्द्र विवरण उपलब्ध छैन"}</small>
              </div>
              <div>
                <span>सौर गतिविधि</span>
                <strong>{solarLabel(cosmic?.solar.level)}</strong>
                <small>{cosmic ? `${cosmic.solar.counts.flares} सौर ज्वाला · ${cosmic.solar.counts.cmes} उत्सर्जन` : "विवरण उपलब्ध छैन"}</small>
              </div>
              <div>
                <span>नजिकको ट्र्याक गरिएको वस्तु</span>
                <strong>{nearestNeo?.name || "—"}</strong>
                <small>{nearestNeo ? distanceText(nearestNeo.miss_distance_km) : "विवरण उपलब्ध छैन"}</small>
              </div>
              <div>
                <span>पृथ्वी दृश्य</span>
                <strong>{cosmic?.earth.epic.fallback_used ? "नजिकको उपलब्ध चित्र" : epic ? "पृथ्वी चित्र" : "विश्व दृश्य"}</strong>
                <small>{cosmic?.earth.epic.image_date || selectedDate}</small>
              </div>
            </div>
          </motion.div>

          <div className="sky-mode__hint">
            <span>खगोलीय स्रोतका उपलब्ध विवरण चयन गरिएको मितिसँग मिलाइएका छन्।</span>
            <span>फर्कन Esc वा × थिच्नुहोस्।</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
