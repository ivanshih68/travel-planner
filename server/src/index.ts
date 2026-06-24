import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./routes/auth";
import tripsRouter from "./routes/trips";
import activitiesRouter from "./routes/activities";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ── Middleware ───────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/trips", tripsRouter);
// 活動路由：巢狀在 trips 下，以及獨立的 /api/activities/:id
app.use("/api/trips/:tripId/activities", activitiesRouter);
app.use("/api/activities", activitiesRouter);

// ── Global Error Handler ─────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Error]", err.message);
    res.status(500).json({ error: "伺服器發生錯誤，請稍後再試" });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Voyager API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
