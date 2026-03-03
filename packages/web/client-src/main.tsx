import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { ThemeProvider } from "next-themes";

const CHUNK_RELOAD_GUARD_KEY = "ww:chunk-reload-once";

function reloadForStaleChunk() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1") {
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
  } catch {
    return;
  }

  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadForStaleChunk();
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String((event as PromiseRejectionEvent)?.reason || "");
  if (reason.includes("Failed to fetch dynamically imported module")) {
    event.preventDefault();
    reloadForStaleChunk();
  }
});

function initializeApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Failed to find the root element");
  }

  createRoot(rootElement).render(
    <ThemeProvider attribute="class" defaultTheme="light">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// Ensure DOM is fully loaded before rendering
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
