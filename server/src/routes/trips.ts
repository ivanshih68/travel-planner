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

// ── IMPORTANT: 所有靜態路由必須放在 /:id 之前 ──────────────

// ── GET /api/trips/shared-with-me ────────────────────────
// 取得分享給我的所有行程（必須在 /:id 之前）
router.get("/shared-with-me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(401).json({ error: "未授權" });
    return;
  }

  // 使用 toLowerCase 確保 email 比對不受大小寫影響
  const userEmail = user.email.toLowerCase();

  const shares = await prisma.tripShare.findMany({
    where: { sharedWith: userEmail },
    include: {
      trip: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { activities: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const trips = shares.map((s: any) => ({ ...s.trip, sharedAt: s.createdAt, sharedBy: s.trip.user }));
  res.json({ trips });
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

// ── GET /api/trips/:id ───────────────────────────────────
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(401).json({ error: "未授權" });
    return;
  }

  const userEmail = user.email.toLowerCase();

  // 檢查行程是否存在，且使用者是擁有者或是被分享者
  const trip = await prisma.trip.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { userId: req.userId },
        { shares: { some: { sharedWith: userEmail } } }
      ]
    },
    include: { activities: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] } },
  });

  if (!trip) {
    res.status(404).json({ error: "行程不存在或您沒有權限查看" });
    return;
  }
  res.json({ trip });
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
    data: { shareToken },
  });

  res.json({ shareToken });
});

// ── POST /api/trips/:id/share-with ───────────────────────
// 分享行程給指定 email 的使用者
router.post("/:id/share-with", requireAuth, async (req: AuthRequest, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!trip) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  const schema = z.object({ email: z.string().email("請輸入有效的電子郵件") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  // 統一轉小寫避免大小寫問題
  const email = parsed.data.email.toLowerCase();

  // 不能分享給自己
  const owner = await prisma.user.findUnique({ where: { id: req.userId } });
  if (owner?.email.toLowerCase() === email) {
    res.status(400).json({ error: "不能分享給自己" });
    return;
  }

  // 確認對方帳號存在（用 toLowerCase 比對）
  const recipient = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!recipient) {
    res.status(404).json({ error: "找不到此電子郵件的使用者，請確認對方已註冊" });
    return;
  }

  // 建立分享記錄（若已分享則忽略），sharedWith 統一存小寫
  await prisma.tripShare.upsert({
    where: { tripId_sharedWith: { tripId: req.params.id, sharedWith: email } },
    create: { tripId: req.params.id, ownerId: req.userId!, sharedWith: email },
    update: {},
  });

  res.json({ message: `行程已分享給 ${recipient.name}（${email}）` });
});

// ── DELETE /api/trips/:id/share-with ─────────────────────
// 取消分享
router.delete("/:id/share-with", requireAuth, async (req: AuthRequest, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!trip) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "格式錯誤" });
    return;
  }

  const email = parsed.data.email.toLowerCase();

  await prisma.tripShare.deleteMany({
    where: { tripId: req.params.id, sharedWith: email },
  });

  res.json({ message: "已取消分享" });
});

// ── GET /api/trips/:id/shares ─────────────────────────────
// 取得此行程已分享給哪些人
router.get("/:id/shares", requireAuth, async (req: AuthRequest, res: Response) => {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!trip) {
    res.status(404).json({ error: "行程不存在" });
    return;
  }

  const shares = await prisma.tripShare.findMany({
    where: { tripId: req.params.id },
    orderBy: { createdAt: "asc" },
  });

  res.json({ shares });
});

export default router;
