import { Router } from "express";
import { AskAiDiaryHelperBody } from "@workspace/api-zod";

const router = Router();

router.post("/ai/diary-helper", async (req, res) => {
  const parsed = AskAiDiaryHelperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  res.status(503).json({ error: "AI helper is disabled" });
});

export default router;
