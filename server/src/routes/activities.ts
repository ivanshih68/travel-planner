import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router({ mergeParams: true });

// ── 輸入驗證 Schema ──────────────────────────────────────
const activitySchema = z.object({
  day: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  title: z.string().min(1, "活動名稱不能為空").max(100),
  category: z.enum(["ATTRACTION", "RESTAURANT", "HOTEL", "TRANSPORT", "OTHER"]),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  images: z.array(z.string().url()).max(5).optional().default([]),
  sortOrder: z.number().int().default(0),
});

/**
 * 檢查行程訪問權限
 * @returns 'owner' | 'shared' | null
 */
async function checkTripAccess(tripId: string, userId: string): Promise<'owner' | 'shared' | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { shares: { where: { sharedWith: user.email.toLowerCase() } } }
  });

  if (!trip) return null;
  if (trip.userId === userId) return 'owner';
  if (trip.shares.length > 0) return 'shared';
  return null;
}

// ── GET /api/trips/:tripId/activities ────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params;
  const access = await checkTripAccess(tripId as string, req.userId!);
  
  if (!access) {
    res.status(404).json({ error: "行程不存在或您沒有權限查看" });
    return;
  }

  const activities = await prisma.activity.findMany({
    where: { tripId },
    orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
  });
  res.json({ activities });
});

// ── POST /api/trips/:tripId/activities ───────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params;
  const access = await checkTripAccess(tripId as string, req.userId!);
  
  if (!access) {
    res.status(403).json({ error: "您沒有權限在此行程新增活動" });
    return;
  }

  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { date, lat, lng, cost, time, ...rest } = parsed.data;
  
  // 處理時間格式，確保符合 HH:MM (例如 09:00 而非 9:00)
  let formattedTime = time;
  if (time && /^\d:\d{2}$/.test(time)) {
    formattedTime = `0${time}`;
  }

  const activity = await prisma.activity.create({
    data: {
      ...rest,
      tripId,
      time: formattedTime ?? null,
      date: date ? new Date(date) : null,
      lat: lat ?? null,
      lng: lng ?? null,
      cost: cost ?? null,
    },
  });
  res.status(201).json({ activity });
});

// ── PATCH /api/trips/:tripId/activities/reorder ──────────
// 注意：必須放在 /:id 之前，避免被攔截
router.patch("/reorder", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params;
  const access = await checkTripAccess(tripId as string, req.userId!);
  
  if (!access) {
    res.status(403).json({ error: "您沒有權限修改排序" });
    return;
  }

  const schema = z.object({
    orders: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "格式錯誤" });
    return;
  }

  await prisma.$transaction(
    parsed.data.orders.map(({ id, sortOrder }) =>
      prisma.activity.update({ where: { id }, data: { sortOrder } })
    )
  );

  res.json({ message: "排序已更新" });
});

// ── PATCH /api/activities/:id ────────────────────────────
router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    include: { trip: { select: { id: true, userId: true } } },
  });

  if (!activity) {
    res.status(404).json({ error: "活動不存在" });
    return;
  }

  const access = await checkTripAccess(activity.trip.id, req.userId!);
  
  if (!access) {
    res.status(403).json({ error: "您沒有權限修改此活動" });
    return;
  }

  const parsed = activitySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { date, lat, lng, cost, time, ...rest } = parsed.data;

  // 處理時間格式，確保符合 HH:MM (例如 09:00 而非 9:00)
  let formattedTime = time;
  if (time && /^\d:\d{2}$/.test(time)) {
    formattedTime = `0${time}`;
  }

  const updated = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(time !== undefined ? { time: formattedTime ?? null } : {}),
      ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
      ...(lat !== undefined ? { lat } : {}),
      ...(lng !== undefined ? { lng } : {}),
      ...(cost !== undefined ? { cost } : {}),
    },
  });
  res.json({ activity: updated });
});

// ── DELETE /api/activities/:id ───────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const activity = await prisma.activity.findFirst({
    where: { id: req.params.id },
    include: { trip: { select: { id: true, userId: true } } },
  });

  if (!activity) {
    res.status(404).json({ error: "活動不存在" });
    return;
  }

  const access = await checkTripAccess(activity.trip.id, req.userId!);

  if (!access) {
    res.status(403).json({ error: "您沒有權限刪除此活動" });
    return;
  }

  await prisma.activity.delete({ where: { id: req.params.id } });
  res.json({ message: "活動已刪除" });
});

export default router;
