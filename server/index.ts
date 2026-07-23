import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// 導入 API 路由 (注意：在生產環境編譯後，路徑會指向編譯後的位置)
// 這裡我們直接使用原本 server/src/index.ts 的邏輯，但要確保編譯後的 index.js 包含這些
import authRouter from "./src/routes/auth.js";
import tripsRouter from "./src/routes/trips.js";
import activitiesRouter from "./src/routes/activities.js";
import notesRouter from "./src/routes/notes.js";
import weatherRouter from "./src/routes/weather.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/trips", tripsRouter);
  app.use("/api/trips/:tripId/activities", activitiesRouter);
  app.use("/api/activities", activitiesRouter);
  app.use("/api/trips/:tripId/notes", notesRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/weather", weatherRouter);

  // Health Check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Serve static files from dist/public in production
  const staticPath = path.resolve(__dirname, "public");
  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  // 注意：這必須放在 API 路由之後
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startServer().catch(console.error);
