import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const isPreviewHost = typeof window !== "undefined" && /(lovableproject\.com|lovable\.app)$/i.test(window.location.hostname);
const shouldResetRuntimeCaches = import.meta.env.DEV || isPreviewHost;

async function resetRuntimeCaches() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn("[App] Runtime cache cleanup skipped:", error);
  }
}

function renderApp() {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

if (shouldResetRuntimeCaches) {
  resetRuntimeCaches().finally(renderApp);
} else {
  renderApp();
}
