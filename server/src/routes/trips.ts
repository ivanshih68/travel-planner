import { Router, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { uploadCoverImage } from "../lib/cloudinary";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── 輸入驗證 Schema ──────────────────────────────────────
const tripSchema = z.object({
  title: z.string().min(1, "行程名稱不能為空").max(100),
  destination: z.string().min(1, "目的地不能為空").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式應為 YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式應為 YYYY-MM-DD"),
  description: z.string().max(500).optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  currency: z.string().length(3).default("TWD"),
  status: z.enum(["PLANNING", "ONGOING", "COMPLETED"]).default("PLANNING"),
});

// ── GET /api/trips ───────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const trips = await prisma.trip.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { activities: true } },
    },
  });
  res.json({ trips });
});

// ── POST /api/trips ──────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { startDate, endDate, budget, ...rest } = parsed.data;
  const trip = await prisma.trip.create({
    data: {
      ...rest,
      userId: req.userId!,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: budget ?? null,
    },
  });
  res.status(201).json({ trip });
});

// ── GET /api/trips/:id ───────────────────────────────────
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { activities: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] } },
  });

  if (!trip) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }
  res.json({ trip });
});

// ── PATCH /api/trips/:id ─────────────────────────────────
router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  const parsed = tripSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { startDate, endDate, budget, ...rest } = parsed.data;
  const trip = await prisma.trip.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      ...(budget !== undefined ? { budget } : {}),
    },
  });
  res.json({ trip });
});

// ── DELETE /api/trips/:id ────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  await prisma.trip.delete({ where: { id: req.params.id } });
  res.json({ message: "行程已刪除" });
});

// ── POST /api/trips/:id/cover ────────────────────────────
router.post(
  "/:id/cover",
  requireAuth,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!trip) {
      res.status(404).json({ error: "行程不存在" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "請上傳圖片檔案" });
      return;
    }

    const coverImage = await uploadCoverImage(req.file.buffer, req.params.id as string);
    await prisma.trip.update({
      where: { id: req.params.id },
      data: { coverImage },
    });

    res.json({ coverImage });
  }
);

// ── POST /api/trips/:id/share ────────────────────────────
router.post("/:id/share", requireAuth, async (req: AuthRequest, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!trip) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  const shareToken = trip.shareToken ?? crypto.randomBytes(32).toString("hex");
  await prisma.trip.update({
    where: { id: req.params.id },
    data: { shareToken, isPublic: true },
  });

  res.json({ shareToken });
});

// ── GET /api/trips/shared/:token ─────────────────────────
router.get("/shared/:token", async (req, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { shareToken: req.params.token },
    include: { activities: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] } },
  });

  if (!trip) {
    res.status(404).json({ error: "分享連結無效或已失效" });
    return;
  }
  res.json({ trip });
});

export default router;
