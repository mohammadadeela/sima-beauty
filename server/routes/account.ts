import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { one, q } from "../db";
import { checkPassword, hashPassword, requireUser } from "../auth";
import { loadOrders } from "./store";

export const account = Router();

/** Start a brand-new session when someone signs in, so an old session id can never be reused. */
function signIn(req: Request, userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

const DUMMY_HASH = `${"0".repeat(128)}.${"0".repeat(32)}`;

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." } });

account.get("/me", (req, res) => res.json(req.user ?? null));

account.post("/register", authLimit, async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(120),
    phone: z.string().trim().max(20).default(""),
    password: z.string().min(6).max(100),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Enter your name, a valid email and a password of at least 6 characters." });
  const { name, email, phone, password } = body.data;
  if (await one("SELECT id FROM users WHERE email = $1", [email])) {
    return res.status(409).json({ message: "An account with this email already exists. Sign in instead." });
  }
  const user = await one<any>(
    "INSERT INTO users (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, name, email, phone, role, is_blocked, created_at",
    [name, email, phone, await hashPassword(password)],
  );
  await signIn(req, user.id);
  res.json(user);
});

account.post("/login", authLimit, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const row = await one<any>("SELECT * FROM users WHERE email = $1", [email]);
  // Check a password even when the email is unknown, so timing doesn't reveal which emails exist.
  const ok = await checkPassword(password, row?.passwordHash || DUMMY_HASH);
  if (!row || !ok) {
    return res.status(401).json({ message: "Wrong email or password." });
  }
  if (row.isBlocked) return res.status(403).json({ message: "This account is blocked. Contact us for help." });
  await signIn(req, row.id);
  const { passwordHash, ...user } = row;
  res.json(user);
});

account.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sima.sid");
    res.json({ ok: true });
  });
});

account.patch("/me", requireUser, async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20).default(""),
    password: z.string().min(6).max(100).optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Please check your details." });
  await q("UPDATE users SET name = $1, phone = $2 WHERE id = $3", [body.data.name, body.data.phone, req.user!.id]);
  if (body.data.password) {
    await q("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(body.data.password), req.user!.id]);
  }
  res.json(await one("SELECT id, name, email, phone, role, is_blocked, created_at FROM users WHERE id = $1", [req.user!.id]));
});

account.get("/orders", requireUser, async (req, res) => {
  const orders = await loadOrders("WHERE o.user_id = $1", [req.user!.id], 50);
  res.json(orders.map(({ adminNote, ...o }) => o));
});
