import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW, APP_VERSION } from "./lib/pwa";

// Log app version on startup
console.log(`[Street Eatz] App Version: ${APP_VERSION}`);

// Register service worker for PWA
registerSW().then((registration) => {
  if (registration) {
    console.log('[Street Eatz] PWA ready');
  }
});

createRoot(document.getElementById("root")!).render(<App />);
