import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { ThemeProvider } from "next-themes";

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
