import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes always take priority.
app.use("/api", router);

// ---------------------------------------------------------------------------
// Production static-file serving
//
// In production (Vercel serverless or Replit self-hosted), Express serves the
// pre-built React/Vite frontend.  Two candidate paths are tried so the same
// code works in both environments:
//
//   1. process.cwd()-relative — Vercel serverless sets cwd to /var/task,
//      where includeFiles unpacks the repo tree, so the frontend lands at
//      artifacts/quiz-app/dist/public relative to that root.
//
//   2. import.meta.url-relative — Replit esbuild bundle outputs index.mjs to
//      artifacts/api-server/dist/, two levels up reaches the workspace root.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));

  const candidates = [
    path.join(process.cwd(), "artifacts/quiz-app/dist/public"),
    path.resolve(thisDir, "../../artifacts/quiz-app/dist/public"),
  ];

  const staticDir = candidates.find(existsSync);

  if (staticDir) {
    logger.info({ staticDir }, "Serving static frontend");

    // Hashed asset files (JS/CSS bundles) are safe to cache forever.
    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: "1y",
        immutable: true,
      }),
    );

    // SPA fallback: any unmatched path gets index.html so client-side
    // routing (wouter) works on hard-refresh or direct URL entry.
    app.use((_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.warn({ candidates }, "Frontend build not found — static serving disabled");
  }
}

export default app;
