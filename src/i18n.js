import es from "./lang/es.js";
import en from "./lang/en.js";

// Order = display order. Spanish is the source language and first fallback.
export const STRINGS = { es, en };
export const LANGS = { es: "Español", en: "English" };

const pick = (lang, key) => [STRINGS[lang], STRINGS.es, STRINGS.en].map((s) => s?.[key]).find((v) => v !== undefined);

export function makeT(lang) {
  const t = (key, vars = {}) => {
    const raw = pick(lang, key);
    if (typeof raw !== "string") return key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  };
  t.list = (key) => {
    const raw = pick(lang, key);
    return Array.isArray(raw) ? raw : [];
  };
  return t;
}
