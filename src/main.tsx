import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminPage from "./AdminPage";
import App from "./App";
import ThankYouPage from "./ThankYouPage";

const currentPath = window.location.pathname.toLowerCase();
const RootComponent = currentPath === "/admin" ? AdminPage : currentPath === "/thank-you" ? ThankYouPage : App;

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
