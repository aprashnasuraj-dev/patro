import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { recordAiReferral } from "./aiReferral";
import { AppChrome } from "./components/AppChrome";
import { CalendarCellEnhancer } from "./components/CalendarCellEnhancer";
import { FeatureLauncher } from "./components/FeatureLauncher";
import { JyotishAssistant } from "./components/JyotishAssistant";
import { NoteTypingEnhancer } from "./components/NoteTypingEnhancer";
import { PwaInstallExperience } from "./components/PwaInstallExperience";
import { PatroRouter } from "./PatroRouter";
import { GlobalMediaPlayer } from "./media/GlobalMediaPlayer";
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
import "./rich-calendar.css";
import "./homepage-regressions.css";
import "./homepage-premium.css";
import "./release-seven.css";

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
      <PwaInstallExperience />
      <CalendarCellEnhancer />
      <FeatureLauncher />
      <GlobalMediaPlayer />
      <JyotishAssistant />
      <NoteTypingEnhancer />
    </MediaProvider>
  </StrictMode>
);
