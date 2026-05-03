import { Router } from "express";
import { AskAiDiaryHelperBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/ai/diary-helper", async (req, res) => {
  const parsed = AskAiDiaryHelperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { book_title, mood, note } = parsed.data;

  try {
    const prompt =
      "Ты помощник читательского дневника BookVibe. Дай короткие идеи без спойлеров: " +
      "3 вопроса для отзыва, 5 эмоциональных тегов, цветовую палитру, идею музыки. " +
      `Книга: ${book_title}. Настроение: ${mood || "не указано"}. Заметка: ${note || "нет"}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.8,
    });

    req.log.info({ choices: response.choices }, "AI response received");

    const content = response.choices[0]?.message?.content;
    if (content) {
      res.json({ source: "openai", result: content });
      return;
    }
    res.status(500).json({ error: "Empty response from AI" });
  } catch (err) {
    req.log.error({ err }, "AI diary helper error");
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
