import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths so the build works under any sub-path,
  // e.g. GitHub Pages at https://<user>.github.io/Turing-machine-app/.
  base: "./",
  plugins: [react()],
});
