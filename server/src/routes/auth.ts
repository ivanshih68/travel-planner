import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ── 輸入驗證 Schema ──────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(1, "姓名不能為空").max(50, "姓名最多 50 字"),
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(8, "密碼至少 8 個字元"),
});

const loginSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(1, "請輸入密碼"),
});

// ── POST /api/auth/register ──────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "此電子郵件已被註冊" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user });
});

// ── POST /api/auth/login ─────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "電子郵件或密碼錯誤" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "電子郵件或密碼錯誤" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: "使用者不存在" });
    return;
  }

  res.json({ user });
});

// ── PATCH /api/auth/me ───────────────────────────────────
router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });

  res.json({ user });
});

export default router;
