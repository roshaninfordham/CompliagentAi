
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { UnlinkProvider } from "@unlink-xyz/react";
  import { BlockNumberProvider } from "./hooks/useBlockNumber";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <UnlinkProvider>
        <BlockNumberProvider>
          <App />
        </BlockNumberProvider>
      </UnlinkProvider>
    </React.StrictMode>
  );
  