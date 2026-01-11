import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-unregister service workers in iframe (Preview) to prevent stale cache issues
if (window.self !== window.top) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
