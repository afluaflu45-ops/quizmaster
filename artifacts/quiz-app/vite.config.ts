import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

// import.meta.dirname was added in Node.js 20.11.0.
// Vercel's build environment defaults to Node.js 18, so we use the
// fileURLToPath approach which works on any Node.js version that supports ESM.
const __configDir = path.dirname(fileURLToPath(import.meta.url));

// PORT is only needed for the dev/preview server, not for `vite build`.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : undefined;

if (port !== undefined && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH defaults to "/" for production builds (Vercel, CI, etc.).
// The Replit dev workflow always provides it explicitly via the workflow env.
const basePath = process.env.BASE_PATH ?? "/";

// Only load Replit-specific plugins when running on Replit (REPL_ID is set).
const isReplit = process.env.REPL_ID !== undefined;
const isDev = process.env.NODE_ENV !== "production";

const replitPlugins = isReplit
  ? [
      ...(isDev
        ? [
            await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
              m.default(),
            ),
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(__configDir, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ]
  : [];

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), ...replitPlugins],
  resolve: {
    alias: {
      "@": path.resolve(__configDir, "src"),
      "@assets": path.resolve(__configDir, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(__configDir),
  build: {
    outDir: path.resolve(__configDir, "dist/public"),
    emptyOutDir: true,
  },
  // server / preview blocks are only meaningful when PORT is known.
  ...(port !== undefined
    ? {
        server: {
          port,
          strictPort: true,
          host: "0.0.0.0",
          allowedHosts: true,
          fs: { strict: true },
        },
        preview: {
          port,
          host: "0.0.0.0",
          allowedHosts: true,
        },
      }
    : {}),
});
