/**
 * Vercel serverless entry-point.
 *
 * Vercel routes every request matching /api/:path* here (see vercel.json).
 * We simply re-export the Express app — Vercel's Node.js runtime wraps it
 * automatically and passes (req, res) just like a normal Express handler.
 *
 * The app module does NOT call app.listen(), so it is safe in a serverless
 * environment.  Port binding lives only in artifacts/api-server/src/index.ts
 * which is the long-running server entry-point used on Replit.
 */
import app from "../artifacts/api-server/src/app";

export default app;
