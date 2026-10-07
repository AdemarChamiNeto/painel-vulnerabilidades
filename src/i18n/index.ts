import { createI18n } from "vue-i18n";
import { messages, type Locale } from "./messages";

const KEY = "painel-vuln:lang";

/** ?lang= na URL > escolha salva > idioma do navegador > português. */
export function initialLocale(search = typeof location !== "undefined" ? location.search : ""): Locale {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (fromUrl === "pt" || fromUrl === "en") return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch { /* sem storage */ }
  return typeof navigator !== "undefined" && navigator.language?.startsWith("en") ? "en" : "pt";
}

export function saveLocale(l: Locale) {
  try { localStorage.setItem(KEY, l); } catch { /* sem storage */ }
  document.documentElement.lang = l === "pt" ? "pt-BR" : "en";
}

export function createAppI18n(locale: Locale = initialLocale()) {
  return createI18n({ legacy: false, locale, fallbackLocale: "pt", messages });
}

export const dateLocale = (l: string) => (l === "en" ? "en-US" : "pt-BR");
