import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this repo at https://<user>.github.io/Turing-machine-app/.
// The dev server stays at "/" for convenience.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/Turing-machine-app/" : "/",
  plugins: [react()],
}));
