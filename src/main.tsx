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

// Site photos are served as .webp (scripts/optimize_images.py keeps a .jpg
// beside each one). If a browser can't load the .webp, swap that image back
// to its .jpg — one listener for every <img> on every page.
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("/assets/") && src.endsWith(".webp") && !img.dataset.jpgFallback) {
      img.dataset.jpgFallback = "1";
      img.src = src.replace(/\.webp$/, ".jpg");
    }
  },
  true,
);

initConsent();

createRoot(document.getElementById("root")!).render(<App />);
