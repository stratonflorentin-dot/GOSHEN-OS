import en from "./en.json";
import sw from "./sw.json";

export type Locale = "en" | "sw";
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: Locale[] = ["en", "sw"];

const dictionaries: Record<Locale, Record<string, string>> = { en, sw };

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/** Simple key lookup with {var} interpolation. Dictionaries stay flat. */
export function getTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return (key, vars) => {
    let text = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
