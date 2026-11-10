import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { applyTextSize } from "./lib/textSize";
import { startTheme } from "./lib/theme";
import "./styles.css";

startTheme();
applyTextSize();
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
