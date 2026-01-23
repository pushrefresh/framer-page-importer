/**
 * Framer Page Importer Plugin - Main Entry Point
 *
 * This plugin allows importing page trees from CSV or XML files
 * and generating Framer static pages and/or CMS collections.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { framer } from "framer-plugin";
import { App } from "./ui/App";

// Initialize the Framer plugin
framer.showUI({
  width: 420,
  height: 600,
  resizable: true,
});

// Mount the React app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
