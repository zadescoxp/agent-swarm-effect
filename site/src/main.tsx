import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Agents measure text as they type it, so give the display faces a moment to arrive.
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1400))]);

fontsReady.then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
