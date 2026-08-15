import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  preview: {
    allowedHosts: ["joshuas-mac-mini.tailde9f07.ts.net"],
  },
});
