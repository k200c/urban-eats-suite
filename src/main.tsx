import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-unregister service workers in iframe (Preview) to prevent stale cache issues
try {
  const isIframe = window.self !== window.top;
  if (isIframe) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      }).catch(() => {});
    }
  }
} catch (e) {
  // Silently fail - iframe detection can throw in some environments
}

createRoot(document.getElementById("root")!).render(<App />);
