import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { User } from "@shared/types";
import { one, pool } from "./db";

declare module "express-session" {
  interface SessionData { userId?: number }
}
declare global {
  namespace Express {
    interface Request { user?: User }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function checkPassword(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = (stored || "").split(".");
  if (!hashed || !salt) return false;
  const a = Buffer.from(hashed, "hex");
  const b = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return a.length === b.length && timingSafeEqual(a, b);
}

const USER_COLUMNS = "id, name, email, phone, role, is_blocked, created_at";

export function setupAuth(app: Express) {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!secret || secret.length < 16)) {
    throw new Error("SESSION_SECRET is required in production (at least 16 characters).");
  }
  const PgStore = connectPg(session);
  app.set("trust proxy", 1);
  app.use(
    session({
      name: "sima.sid",
      secret: secret || "dev-only-secret-not-for-production",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new PgStore({ pool, createTableIfMissing: true }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd && process.env.INSECURE_COOKIES !== "true",
        maxAge: 60 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  // Attach the signed-in user (if any) to every request.
  app.use(async (req, _res, next) => {
    try {
      if (req.session.userId) {
        const user = await one<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.session.userId]);
        if (user && !user.isBlocked) req.user = user;
        else delete req.session.userId;
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Please sign in first." });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Please sign in first." });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only." });
  next();
}

/** Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet. */
export async function ensureAdmin() {
  const existing = await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing) return;
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 8) {
    console.warn("[auth] No admin yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env and restart.");
    return;
  }
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash`,
    [email, await hashPassword(password)],
  );
  console.log(`[auth] Admin account created for ${email}`);
}
