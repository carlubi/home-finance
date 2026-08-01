"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AppLanguage,
  LANGUAGE_COOKIE,
  translateUiText,
} from "@/lib/language";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();
const translatedAttrs = ["placeholder", "title", "aria-label"] as const;

function preserveSpacing(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) return true;
  if (parent.closest("[data-no-translate]")) return true;
  return node.data.trim().length === 0;
}

function translateTextNode(node: Text, language: AppLanguage) {
  if (shouldSkipTextNode(node)) return;
  const previousOriginal = textOriginals.get(node);
  const current = node.data;
  const previousCaTranslation = previousOriginal
    ? preserveSpacing(previousOriginal, translateUiText(previousOriginal.trim(), "ca"))
    : null;
  const original =
    previousOriginal &&
    (current === previousOriginal || current === previousCaTranslation)
      ? previousOriginal
      : current;
  textOriginals.set(node, original);
  const translated = translateUiText(original.trim(), language);
  const next = preserveSpacing(original, translated);
  if (node.data !== next) node.data = next;
}

function getAttrOriginals(element: Element) {
  let originals = attrOriginals.get(element);
  if (!originals) {
    originals = new Map();
    attrOriginals.set(element, originals);
  }
  return originals;
}

function translateElementAttributes(element: Element, language: AppLanguage) {
  if (element.closest("[data-no-translate]")) return;
  const originals = getAttrOriginals(element);
  for (const attr of translatedAttrs) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    const previousOriginal = originals.get(attr);
    const previousCaTranslation = previousOriginal
      ? translateUiText(previousOriginal, "ca")
      : null;
    const original =
      previousOriginal &&
      (value === previousOriginal || value === previousCaTranslation)
        ? previousOriginal
        : value;
    originals.set(attr, original);
    const translated = translateUiText(original, language);
    if (value !== translated) element.setAttribute(attr, translated);
  }
}

function translateTree(root: ParentNode, language: AppLanguage) {
  if (root instanceof Element) translateElementAttributes(root, language);
  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (elementWalker.nextNode()) {
    translateElementAttributes(elementWalker.currentNode as Element, language);
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (textWalker.nextNode()) {
    translateTextNode(textWalker.currentNode as Text, language);
  }
}

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: AppLanguage;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);
  const translationStarted = useRef(false);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_COOKIE, next);
    document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    let cancelled = false;
    let timeoutId: number | null = null;
    let animationFrameId: number | null = null;
    let observer: MutationObserver | null = null;

    const startTranslation = () => {
      if (cancelled) return;
      translationStarted.current = true;
      translateTree(document.body, language);
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "characterData" && mutation.target instanceof Text) {
            translateTextNode(mutation.target, language);
          }
          if (mutation.type === "attributes" && mutation.target instanceof Element) {
            translateElementAttributes(mutation.target, language);
          }
          for (const node of mutation.addedNodes) {
            if (node instanceof Text) translateTextNode(node, language);
            if (node instanceof Element) translateTree(node, language);
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...translatedAttrs],
      });
    };

    const scheduleAfterHydration = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = window.requestAnimationFrame(() => {
          timeoutId = window.setTimeout(startTranslation, 600);
        });
      });
    };

    if (translationStarted.current) {
      startTranslation();
    } else if (document.readyState === "complete") {
      scheduleAfterHydration();
    } else {
      window.addEventListener("load", scheduleAfterHydration, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleAfterHydration);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      observer?.disconnect();
    };
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
