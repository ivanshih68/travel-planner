import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./routes/auth";
import tripsRouter from "./routes/trips";
import activitiesRouter from "./routes/activities";
import weatherRouter from "./routes/weather";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ── Middleware ───────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://travel-planner-nine-sigma.vercel.app",
  "https://travel-planner-fx2m00rs9-novo-projects.vercel.app",
  // 允許所有 Vercel preview 網域
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // 允許無 origin（如 curl、Postman）
      if (!origin) return callback(null, true);
      // 允許所有 *.vercel.app 子網域
      if (origin.endsWith(".vercel.app") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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
app.use("/api/weather", weatherRouter);

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
