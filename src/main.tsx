import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ContentProvider } from "./cms/context";

// A reload always starts at the top of the page. Without this the browser
// restores the previous scroll position, and a #hash left in the URL by an
// earlier in-page click would reopen the site halfway down at that section.
if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
if (window.location.hash) {
  window.history.replaceState({}, "", window.location.pathname + window.location.search);
}
window.scrollTo({ top: 0, left: 0, behavior: "instant" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContentProvider>
      <App />
    </ContentProvider>
  </StrictMode>
);
