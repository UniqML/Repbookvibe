import { Filter } from "bad-words";

const CUSTOM_TERMS = [
  "бля",
  "блять",
  "ебать",
  "ёб",
  "ебан",
  "хуй",
  "хуе",
  "пизд",
  "сука",
  "мразь",
  "долбоеб",
  "шлюх",
  "nude",
  "nudity",
  "porn",
  "porno",
  "sex",
  "xxx",
  "onlyfans",
  "nsfw",
  "18+",
];

export type ModerationMode = "replace" | "block";

export type ModerationResult = {
  originalText: string;
  text: string;
  flagged: boolean;
  matchedTerms: string[];
  action: ModerationMode;
  violationType: string;
};

const filter = new Filter({ placeHolder: "*" });
filter.addWords(...CUSTOM_TERMS);

function getModerationMode(): ModerationMode {
  return process.env.MODERATION_MODE === "block" ? "block" : "replace";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0о]/g, "о")
    .replace(/[3з]/g, "з")
    .replace(/[4а@]/g, "а")
    .replace(/[1!iі]/g, "и")
    .replace(/[^a-zа-яё0-9+]+/gi, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCustomTerms(text: string): string[] {
  const normalized = normalize(text);
  return CUSTOM_TERMS.filter((term) => normalized.includes(normalize(term)));
}

function replaceCustomTerms(text: string, terms: string[]): string {
  return terms.reduce((result, term) => {
    const pattern = new RegExp(escapeRegExp(term), "giu");
    return result.replace(pattern, "***");
  }, text);
}

export function moderateChatText(text: string): ModerationResult {
  const originalText = text;
  const customMatches = findCustomTerms(text);
  const badWordsFlagged = filter.isProfane(text);
  const flagged = badWordsFlagged || customMatches.length > 0;
  const action = getModerationMode();
  const cleaned = flagged
    ? replaceCustomTerms(filter.clean(text).replace(/\*+/g, "***"), customMatches)
    : text;

  return {
    originalText,
    text: flagged && action === "replace" ? cleaned : text,
    flagged,
    matchedTerms: customMatches,
    action,
    violationType: customMatches.some((term) => ["nude", "nudity", "porn", "porno", "sex", "xxx", "onlyfans", "nsfw", "18+"].includes(term))
      ? "adult_content"
      : "profanity",
  };
}
