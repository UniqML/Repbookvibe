import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8);
}

function createAvatarSeed(email: string): string {
  return email.trim().toLowerCase();
}

function toAuthUser(user: {
  id: number;
  email: string | null;
  displayName: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  statusText?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || null,
    avatarSeed: user.avatarSeed || createAvatarSeed(user.email || user.displayName),
    statusText: user.statusText || null,
    isAnonymous: false,
  };
}

// Send verification email using Nodemailer
async function sendVerificationEmail(email: string, code: string) {
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "BookVibe Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">Добро пожаловать в BookVibe! 📚</h2>
          <p>Ваш код подтверждения:</p>
          <div style="background: #f5e6d3; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #d4a574; letter-spacing: 0.2em; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">Введите этот код в приложение для подтверждения вашего аккаунта.</p>
          <p style="color: #999; font-size: 12px;">Если вы не создавали аккаунт, проигнорируйте это письмо.</p>
        </div>
      `,
    });
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error);
    throw error;
  }
}

// Register endpoint
router.post("/auth/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    // Check if user exists
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const verificationCode = generateVerificationCode();
    const passwordHash = hashPassword(password);

    const user = await db
      .insert(usersTable)
      .values({
        email,
        displayName: displayName || email.split("@")[0],
        passwordHash,
        verificationCode,
        isVerified: false,
        avatarSeed: createAvatarSeed(email),
      })
      .returning();

    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({
      message: "User registered. Check email for verification code.",
      userId: user[0]?.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Verify code endpoint
router.post("/auth/verify", async (req: AuthRequest, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: "Email and code required" });
      return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (users.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = users[0];

    if (user.verificationCode !== code) {
      res.status(401).json({ error: "Invalid verification code" });
      return;
    }

    // Mark as verified
    await db
      .update(usersTable)
      .set({ isVerified: true, verificationCode: null })
      .where(eq(usersTable.id, user.id));

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      message: "Email verified successfully",
      token,
      user: toAuthUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// Login endpoint
router.post("/auth/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (users.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = users[0];

    const passwordHash = hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Ваш аккаунт заблокирован. Обратитесь к администратору." });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: toAuthUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Guest login
router.post("/auth/guest", (req: AuthRequest, res: Response) => {
  const guestToken = jwt.sign({ userId: 0, isGuest: true }, JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({
    token: guestToken,
    user: {
      id: 0,
      email: null,
      displayName: "Гость BookVibe",
      isAnonymous: true,
    },
  });
});

// Forgot password - send reset code
router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const user = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const resetCode = generateVerificationCode();
  await db
    .update(usersTable)
    .set({ verificationCode: resetCode })
    .where(eq(usersTable.id, user[0].id));

  try {
    await sendVerificationEmail(
      email,
      resetCode
    );
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }

  res.json({ message: "Reset code sent to email" });
});

// Update user profile
router.post("/auth/profile", async (req: AuthRequest, res) => {
  const userId = req.userId;
  if (!userId || userId === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { displayName, avatarUrl, avatarSeed, statusText } = req.body as {
    displayName?: string;
    avatarUrl?: string;
    avatarSeed?: string;
    statusText?: string;
  };
  const updates: Partial<Pick<typeof usersTable.$inferInsert, "displayName" | "avatarUrl" | "avatarSeed" | "statusText">> = {};
  if (displayName) updates.displayName = displayName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (avatarSeed !== undefined) updates.avatarSeed = avatarSeed;
  if (statusText !== undefined) updates.statusText = statusText;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

  const [user] = await db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      avatarSeed: usersTable.avatarSeed,
      statusText: usersTable.statusText,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  res.json({
    user: toAuthUser(user),
  });
});

// Heartbeat — updates last_seen_at
router.post("/auth/heartbeat", async (req: AuthRequest, res) => {
  const userId = req.userId;
  if (!userId || userId === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await db
      .update(usersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(usersTable.id, userId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

// Reset password with code
router.post("/auth/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "Email, code, and password required" });
    return;
  }

  const user = await db
    .select({
      id: usersTable.id,
      verificationCode: usersTable.verificationCode,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user[0].verificationCode !== code) {
    res.status(400).json({ error: "Invalid reset code" });
    return;
  }

  const passwordHash = hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, verificationCode: null })
    .where(eq(usersTable.id, user[0].id));

  res.json({ message: "Password updated successfully" });
});

// Verify token middleware
export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: Function
) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    req.userId = 0; // guest
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: number };
    req.userId = decoded.userId || 0;
    next();
  } catch {
    req.userId = 0; // treat as guest if token invalid
    next();
  }
}

export default router;
