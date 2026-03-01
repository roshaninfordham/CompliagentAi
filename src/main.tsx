
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { UnlinkProvider } from "@unlink-xyz/react";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <UnlinkProvider>
        <App />
      </UnlinkProvider>
    </React.StrictMode>
  );
  