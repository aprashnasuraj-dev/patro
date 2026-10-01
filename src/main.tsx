import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppChrome } from "./components/AppChrome";
import { FeatureLauncher } from "./components/FeatureLauncher";
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

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root container");

registerPatroServiceWorker();

createRoot(root).render(
  <StrictMode>
    <MediaProvider>
      <AppChrome>
        <PatroRouter />
      </AppChrome>
      <FeatureLauncher />
      <GlobalMediaPlayer />
    </MediaProvider>
  </StrictMode>
);
