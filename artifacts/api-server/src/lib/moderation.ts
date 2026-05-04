import { Filter } from "bad-words";

const badWordsFilter = new Filter();

const RU_PROFANITY: string[] = [
  // х-основа
  "хуй", "хуя", "хуе", "хуи", "хуём", "хую", "хуев", "хуям", "хуями", "хуях",
  "хуйня", "хуйло", "хуесос", "хуеплёт", "хуеплет", "хуйла",
  // е-основа
  "ебать", "ебёт", "ебет", "ебал", "ебала", "ебали", "ёбаный", "ёбаная",
  "ёбаные", "ёбаных", "ёб", "еба", "ебаный", "ебаная", "ебаные", "ебать",
  "ёбт", "ёптвою", "ёклмн", "ёпрст", "ёп", "ёперный",
  "ебло", "ебать", "ебись", "ёбнуть", "ёбнул", "заебал", "заебала",
  "заебись", "заебись", "заебало", "заебать", "наебать", "наебал",
  "наебала", "подъебать", "подъебал", "поёб", "проёб", "проебать",
  "разъебать", "выебать", "сьебать", "съебать", "трахать", "траханый",
  // п-основа
  "пизда", "пизды", "пизде", "пизду", "пиздой", "пиздах", "пиздят",
  "пиздёж", "пиздёт", "пиздит", "пиздит", "пиздатый", "пиздатая",
  "пиздец", "пиздоватый", "пиздобол", "пиздоболы", "пиздострадание",
  "пиздануть", "пизданул", "распиздяй", "распиздяи", "запиздить",
  "напиздить", "отпиздить", "пиздить", "пиздоглазый",
  // б-основа
  "блядь", "бляди", "бляде", "блядям", "блядями", "блядях", "блядун",
  "бляд", "блять", "бля", "бляха",
  "блядский", "проблядь", "шлюха", "шлюхи", "шлюхам", "шлюхами",
  // с-основа
  "сука", "суки", "суке", "суку", "сукой", "сукам", "суками",
  "сукин", "суча", "сучий", "сучка", "сучки", "сучке", "сучку",
  "сучками", "сучьи", "сучонок",
  // м-основа
  "мудак", "мудаки", "мудаку", "мудака", "мудакам", "мудаков",
  "мудачьё", "мудило", "мудил", "мудила", "мудень",
  "мразь", "мрази", "мразям",
  // п-основа 2
  "педик", "педики", "педераст", "педерасты", "пидор", "пидоры",
  "пидорас", "пидорасы", "пидорасина",
  // д-основа
  "долбоёб", "долбоеб", "долбоёбы", "долбоебы",
  "дрочить", "дрочит", "дрочил", "дрочила", "дрочун",
  // г-основа
  "говно", "говна", "говне", "говну", "говном", "говнюк", "говнюки",
  "говняный", "говнище", "говноед", "говноеды",
  // о-основа
  "ублюдок", "ублюдки", "ублюдочный",
  "уёбок", "уебок", "уёбки", "уебки",
  // к-основа
  "кретин", "кретины", "кретинизм",
  "курва", "курвы", "курве",
  // ж-основа
  "жопа", "жопы", "жопе", "жопу", "жопой", "жопах",
  "жопный", "жополиз", "жополизы",
  // т-основа
  "тварь", "твари", "тварям", "тварями",
  "тупица", "тупицы", "туп",
  // з-основа
  "залупа", "залупы", "залупе", "залупу",
  // ч-основа
  "чмо", "чмошник", "чмошники",
  // English explicit
  "fuck", "fucking", "fucker", "fucked", "fucks",
  "shit", "shitting", "shitty", "bullshit",
  "ass", "asshole", "assholes", "asses",
  "bitch", "bitches", "bitching",
  "cock", "cocks", "cunt", "cunts",
  "dick", "dicks", "pussy", "pussies",
  "whore", "whores", "slut", "sluts",
  "bastard", "bastards",
  // NSFW контент
  "porn", "porno", "pornography", "nude", "nudity",
  "onlyfans", "nsfw", "xxx",
];

const RU_NORMALIZED_MAP: Array<[RegExp, string]> = [
  [/[0oо]/g, "о"],
  [/[3з]/g, "з"],
  [/[@4а]/g, "а"],
  [/[1!іi]/g, "и"],
  [/[e]/g, "е"],
  [/[y]/g, "у"],
  [/ph/g, "ф"],
];

function normalizeText(text: string): string {
  let t = text.toLowerCase();
  for (const [from, to] of RU_NORMALIZED_MAP) {
    t = t.replace(from, to);
  }
  return t;
}

function findRussianMatches(text: string): string[] {
  const normalized = normalizeText(text);
  return RU_PROFANITY.filter((term) => {
    const normTerm = normalizeText(term);
    return normalized.includes(normTerm);
  });
}

function replaceMatches(text: string, terms: string[]): string {
  let result = text;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "giu"), "***");
  }
  return result;
}

export type ModerationMode = "replace" | "block";

export type ModerationResult = {
  originalText: string;
  text: string;
  flagged: boolean;
  matchedTerms: string[];
  action: ModerationMode;
  violationType: string;
};

function getModerationMode(): ModerationMode {
  return process.env.MODERATION_MODE === "block" ? "block" : "replace";
}

const ADULT_TERMS = new Set([
  "porn", "porno", "pornography", "nude", "nudity", "onlyfans", "nsfw", "xxx",
]);

export function moderateChatText(text: string): ModerationResult {
  if (!text.trim()) {
    return {
      originalText: text, text, flagged: false,
      matchedTerms: [], action: getModerationMode(), violationType: "",
    };
  }

  const ruMatches = findRussianMatches(text);

  let enMatches: string[] = [];
  try {
    if (badWordsFilter.isProfane(text)) {
      const cleaned = badWordsFilter.clean(text);
      enMatches = text.split(/\s+/).filter((w) => {
        try { return badWordsFilter.isProfane(w); } catch { return false; }
      });
      void cleaned;
    }
  } catch {
    // bad-words can throw on edge cases — absorb silently
  }

  const allMatches = [...new Set([...ruMatches, ...enMatches])];
  const flagged = allMatches.length > 0;
  const action = getModerationMode();

  let cleaned = text;
  if (flagged) {
    try {
      cleaned = badWordsFilter.clean(text);
    } catch {
      cleaned = text;
    }
    cleaned = replaceMatches(cleaned, ruMatches);
  }

  const violationType = allMatches.some((t) => ADULT_TERMS.has(t.toLowerCase()))
    ? "adult_content"
    : "profanity";

  return {
    originalText: text,
    text: flagged && action === "replace" ? cleaned : text,
    flagged,
    matchedTerms: allMatches,
    action,
    violationType,
  };
}
