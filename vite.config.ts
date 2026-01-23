import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import framer from "vite-plugin-framer";
import path from "path";

export default defineConfig({
  plugins: [react(), mkcert(), framer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "ES2022",
  },
});
