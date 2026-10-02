import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { recordAiReferral } from "./aiReferral";
import { AppChrome } from "./components/AppChrome";
import { CalendarCellEnhancer } from "./components/CalendarCellEnhancer";
import { FeatureLauncher } from "./components/FeatureLauncher";
import { HomeExperience } from "./components/HomeExperience";
import { MobilePrimaryNav } from "./components/MobilePrimaryNav";
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
import "./home-experience.css";
import "./note-enhancements.css";
import "./mobile-primary-nav.css";
import "./calendar-cell-enhancements.css";
import "./fresh-build-surface.css";
import "./final-polish.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root container");

registerPatroServiceWorker();
recordAiReferral();

createRoot(root).render(
  <StrictMode>
    <MediaProvider>
      <AppChrome>
        <HomeExperience />
        <PatroRouter />
      </AppChrome>
      <CalendarCellEnhancer />
      <FeatureLauncher />
      <GlobalMediaPlayer />
      <MobilePrimaryNav />
    </MediaProvider>
  </StrictMode>
);
