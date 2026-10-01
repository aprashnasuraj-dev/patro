import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppChrome } from "./components/AppChrome";
import { PatroRouter } from "./PatroRouter";
import { GlobalMediaPlayer } from "./media/GlobalMediaPlayer";
import { MediaProvider } from "./media/MediaProvider";
import { registerPatroServiceWorker } from "./pwa";
import "./styles.css";
import "./feature-suite.css";
import "./utilities.css";
import "./community/community.css";
import "./aafnai.css";
import "./reference-ui.css";

const root=document.getElementById("root");
if(!root)throw new Error("Missing #root container");
registerPatroServiceWorker();
createRoot(root).render(<StrictMode><MediaProvider><AppChrome><PatroRouter/></AppChrome><GlobalMediaPlayer/></MediaProvider></StrictMode>);
