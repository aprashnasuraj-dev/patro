import { StrictMode, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { recordAiReferral } from "./aiReferral";
import { AppChrome } from "./components/AppChrome";
import { CalendarCellEnhancer } from "./components/CalendarCellEnhancer";
import { FeatureLauncher } from "./components/FeatureLauncher";
import { HomepageEnhancer } from "./components/HomepageEnhancer";
const JyotishAssistant = lazy(() => import("./components/JyotishAssistant").then(m => ({ default: m.JyotishAssistant })));
import { NoteTypingEnhancer } from "./components/NoteTypingEnhancer";
const PwaInstallExperience = lazy(() => import("./components/PwaInstallExperience").then(m => ({ default: m.PwaInstallExperience })));
import { PatroRouter } from "./PatroRouter";
const GlobalMediaPlayer = lazy(() => import("./media/GlobalMediaPlayer").then(m => ({ default: m.GlobalMediaPlayer })));
import { MediaProvider } from "./media/MediaProvider";
import { registerPatroServiceWorker } from "./pwa";
import "./design-tokens.css";
import "./app-shell.css";
import "./styles.css";
import "./cosmic.css";
import "./swarm.css";
import "./feature-suite.css";
import "./restructure.css";
import "./launch-polish.css";
import "./utilities.css";
import "./community/community.css";
import "./aafnai.css";
import "./aafnai-enhancements.css";
import "./premium-experience.css";
import "./premium-tool-primitives.css";
import "./feature-launcher.css";
import "./explore-rail.css";
import "./mobile-safe-area.css";
import "./tool-rich-media.css";
import "./semantic-ui-fixes.css";
import "./note-enhancements.css";
import "./calendar-cell-enhancements.css";
import "./fresh-build-surface.css";
import "./final-polish.css";
import "./jyotish-assistant.css";
import "./aafnai-bot.css";
import "./rich-calendar.css";
import "./homepage-regressions.css";
import "./homepage-premium.css";
import "./release-seven.css";
import "./release-seven-mobile-fix.css";
import "./mobile-home.css";

/**
 * Optional global experiences are available after the initial paint instead of
 * blocking the homepage with chat, install-prompt and player UI code. The media
 * provider itself stays mounted synchronously to preserve ongoing playback.
 */
function DeferredGlobalExperiences() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let cancelled = false;
    const start = () => { if (!cancelled) setReady(true); };
    const id = idle.requestIdleCallback?.(start, { timeout: 2200 });
    const timer = id === undefined ? window.setTimeout(start, 900) : undefined;
    return () => {
      cancelled = true;
      if (id !== undefined) idle.cancelIdleCallback?.(id);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
  return ready ? <Suspense fallback={null}>
    <PwaInstallExperience />
    <GlobalMediaPlayer />
    <JyotishAssistant />
  </Suspense> : null;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root container");

registerPatroServiceWorker();
recordAiReferral();

createRoot(root).render(
  <StrictMode>
    <MediaProvider>
      <AppChrome>
        <PatroRouter />
      </AppChrome>
      <CalendarCellEnhancer />
      <HomepageEnhancer />
      <FeatureLauncher />
      <NoteTypingEnhancer />
      <DeferredGlobalExperiences />
    </MediaProvider>
  </StrictMode>
);
