import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router({ mergeParams: true });

// ── 輸入驗證 Schema ──────────────────────────────────────
const noteSchema = z.object({
  title: z.string().min(1, "記事名稱不能為空").max(100),
  content: z.string().max(2000).optional().nullable(),
  sourceUrl: z.string().url("來源網站必須是有效的 URL").optional().nullable().or(z.literal("")),
  images: z.array(z.string().url()).max(5).optional().default([]),
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

// ── GET /api/trips/:tripId/notes ─────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params;
  const access = await checkTripAccess(tripId as string, req.userId!);
  
  if (!access) {
    res.status(404).json({ error: "行程不存在或您沒有權限查看" });
    return;
  }

  const notes = await prisma.note.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ notes });
});

// ── POST /api/trips/:tripId/notes ────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tripId } = req.params;
  const access = await checkTripAccess(tripId as string, req.userId!);
  
  if (!access) {
    res.status(403).json({ error: "您沒有權限在此行程新增記事" });
    return;
  }

  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const note = await prisma.note.create({
      data: {
        ...parsed.data,
        tripId,
        sourceUrl: parsed.data.sourceUrl || null,
      },
    });
    res.status(201).json({ note });
  } catch (err: any) {
    console.error("[Note Create Error]:", err);
    res.status(500).json({ error: "新增記事失敗", details: err.message });
  }
});

// ── PATCH /api/notes/:id ─────────────────────────────────
router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id },
    include: { trip: { select: { id: true, userId: true } } },
  });

  if (!note) {
    res.status(404).json({ error: "記事不存在" });
    return;
  }

  const access = await checkTripAccess(note.trip.id, req.userId!);
  
  if (!access) {
    res.status(403).json({ error: "您沒有權限修改此記事" });
    return;
  }

  const parsed = noteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const updated = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      sourceUrl: parsed.data.sourceUrl === "" ? null : (parsed.data.sourceUrl ?? undefined),
    },
  });
  res.json({ note: updated });
});

// ── DELETE /api/notes/:id ────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id },
    include: { trip: { select: { id: true, userId: true } } },
  });

  if (!note) {
    res.status(404).json({ error: "記事不存在" });
    return;
  }

  const access = await checkTripAccess(note.trip.id, req.userId!);

  if (!access) {
    res.status(403).json({ error: "您沒有權限刪除此記事" });
    return;
  }

  await prisma.note.delete({ where: { id: req.params.id } });
  res.json({ message: "記事已刪除" });
});

export default router;
