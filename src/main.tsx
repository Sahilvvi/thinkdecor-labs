import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initConsent } from "./lib/consent";

import { reloadOnce } from "./lib/lazyPage";

// A file from an older deploy is gone: fetch the fresh ones once instead of leaving a blank page.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnce();
});

initConsent();

createRoot(document.getElementById("root")!).render(<App />);
