import { createContext, useContext, useState, useCallback } from "react";
import { translations, type Lang, type TranslationKey } from "@/i18n/translations";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "ru",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("bookvibe_lang") as Lang) || "ru";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("bookvibe_lang", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? translations.ru[key] ?? key,
    [lang],
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLanguage() {
  return useContext(LangContext);
}
