import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ThankYouPage from "./ThankYouPage";

const currentPath = window.location.pathname.toLowerCase();
const RootComponent = currentPath === "/thank-you" ? ThankYouPage : App;

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
