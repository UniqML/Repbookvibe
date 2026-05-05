import { Router, type Request, type Response } from "express";
import nodemailer from "nodemailer";

const router = Router();

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post("/support", async (req: Request, res: Response) => {
  const { subject, message, userEmail } = req.body as {
    subject?: string;
    message?: string;
    userEmail?: string;
  };

  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Subject and message are required" });
    return;
  }

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
  if (!supportEmail) {
    res.status(503).json({ error: "Support email not configured" });
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: supportEmail,
      subject: `[BookVibe Support] ${subject.trim().slice(0, 200)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">Новое обращение в поддержку BookVibe</h2>
          <p><strong>От:</strong> ${userEmail ? userEmail : "Не указан"}</p>
          <p><strong>Тема:</strong> ${subject.trim()}</p>
          <hr style="border: 1px solid #eee;" />
          <p><strong>Сообщение:</strong></p>
          <div style="background: #f5e6d3; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message.trim().slice(0, 2000)}</div>
        </div>
      `,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
