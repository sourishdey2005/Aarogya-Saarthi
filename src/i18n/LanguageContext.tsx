import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { EN_DICTIONARY } from './translations';

export type Language = 'hi' | 'en';

const STORAGE_KEY = 'aarogya.language';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** Translate a single string (exact match first, then longest substring match). */
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Module level mirror of the active language so that non-React helpers
 * (speech synthesis, for example) can read it.
 */
let currentLanguage: Language = 'hi';

export const getCurrentLanguage = (): Language => currentLanguage;

/** Keys that contain Devanagari may also be matched as a substring. */
const DEVANAGARI_KEYS = Object.keys(EN_DICTIONARY)
  .filter((key) => /[\u0900-\u097F]/.test(key))
  .sort((a, b) => b.length - a.length);

const EXACT_KEYS = new Set(Object.keys(EN_DICTIONARY));

/** Normalised form used for duplicate detection (ignores case and punctuation). */
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');

const isIconElement = (node: React.ReactNode): boolean => {
  if (!React.isValidElement(node)) return false;
  const className = (node.props as { className?: string })?.className;
  return typeof className === 'string' && className.includes('material-symbols-outlined');
};

/** Flattens an element into its plain text content. */
const flatText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flatText).join('');
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode })?.children;
    return flatText(children);
  }
  return '';
};

/** Translates a single string. */
export function translateText(text: string): string {
  if (!text) return text;

  if (EXACT_KEYS.has(text)) {
    return EN_DICTIONARY[text];
  }

  // Same string with surrounding whitespace (" और " -> " and ")
  const trimmed = text.trim();
  if (trimmed !== text && trimmed.length > 0 && EXACT_KEYS.has(trimmed)) {
    return text.replace(trimmed, EN_DICTIONARY[trimmed]);
  }

  let result = text;
  // Replace the longest matching Hindi phrases (covers template literals).
  for (let pass = 0; pass < 6; pass += 1) {
    let replaced = false;
    for (const key of DEVANAGARI_KEYS) {
      if (key.length < 4) continue;
      if (result.includes(key)) {
        const next = result.replace(key, EN_DICTIONARY[key]);
        if (next !== result) {
          result = next;
          replaced = true;
          break;
        }
      }
    }
    if (!replaced) break;
  }
  return result;
}

const TRANSLATED_PROPS = new Set(['placeholder', 'title', 'aria-label', 'alt']);

/**
 * React marks statically written children as "validated" so it does not warn
 * about missing keys. Cloning an element resets that flag, so it is copied
 * over to the translated tree to keep the console clean.
 */
function copyValidatedFlag(original: React.ReactNode, translated: React.ReactNode): void {
  if (Array.isArray(original) && Array.isArray(translated)) {
    for (let i = 0; i < original.length; i += 1) {
      copyValidatedFlag(original[i], translated[i]);
    }
    return;
  }
  if (!React.isValidElement(original) || !React.isValidElement(translated)) return;

  const originalStore = (original as unknown as { _store?: { validated?: number } })._store;
  const translatedStore = (translated as unknown as { _store?: { validated?: number } })._store;
  if (originalStore?.validated && translatedStore) {
    translatedStore.validated = originalStore.validated;
  }
  copyValidatedFlag(
    (original.props as { children?: React.ReactNode })?.children,
    (translated.props as { children?: React.ReactNode })?.children
  );
}

/** Recursively translates a React tree. */
function translateNode(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') {
    return translateText(node);
  }
  if (typeof node === 'number' || typeof node === 'boolean' || node == null) {
    return node;
  }
  if (Array.isArray(node)) {
    const translated = node.map((child) => translateNode(child));
    const result = removeDuplicateSiblings(translated);
    copyValidatedFlag(node, result);
    return result;
  }
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown> & { children?: React.ReactNode };
    const nextProps: Record<string, unknown> = { ...props };

    for (const key of TRANSLATED_PROPS) {
      const value = nextProps[key];
      if (typeof value === 'string') {
        nextProps[key] = translateText(value);
      }
    }

    if ('children' in props) {
      const translated = translateNode(props.children);
      nextProps.children = translated;
    }

    const cloned = React.cloneElement(node, nextProps as never);
    copyValidatedFlag(node, cloned);
    return cloned;
  }
  return node;
}

/**
 * Removes duplicated bilingual sub-labels: when two sibling nodes render the
 * same wording (e.g. the Hindi headline and its English sub-label) only the
 * richer one is kept.
 */
function removeDuplicateSiblings(children: React.ReactNode[]): React.ReactNode[] {
  if (children.length < 2) return children;

  const texts = children.map((child) =>
    isIconElement(child) ? '' : flatText(child).trim()
  );
  const blank = new Set<number>();

  for (let i = 0; i < children.length; i += 1) {
    if (blank.has(i) || isIconElement(children[i])) continue;
    const normI = normalize(texts[i]);
    if (normI.length < 4) continue;

    for (let j = 0; j < children.length; j += 1) {
      if (i === j || blank.has(j) || isIconElement(children[j])) continue;
      const normJ = normalize(texts[j]);
      if (normJ.length < 4) continue;

      if (normI === normJ) {
        // Identical wording: keep the first (primary) and drop the later one.
        blank.add(Math.max(i, j));
        break;
      }
      if (normJ.includes(normI)) {
        // Shorter duplicate of a richer sibling (e.g. "High Fever" vs
        // "High Fever (3 days)") - drop the shorter one.
        blank.add(i);
        break;
      }
      if (normI.includes(normJ)) {
        blank.add(j);
      }
    }
  }

  if (blank.size === 0) return children;
  return children.map((child, index) => (blank.has(index) ? null : child));
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'hi';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'hi';
  });

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    currentLanguage = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'hi' ? 'en' : 'hi');
  }, [lang, setLang]);

  useEffect(() => {
    currentLanguage = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback((text: string) => (lang === 'en' ? translateText(text) : text), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside a LanguageProvider');
  return ctx;
}

/**
 * Renders its children in the currently selected language. Hindi is the
 * source language, so it is returned untouched; English is produced by
 * translating every string in the tree.
 */
export const Localize: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useLang();
  if (lang !== 'en') return <>{children}</>;
  return <>{translateNode(children)}</>;
};

/**
 * Returns a helper that translates a rendered element tree into the active
 * language. Every screen and component calls this on its own markup so that
 * strings created inside the component are translated as well.
 */
export function useTranslate(): (node: React.ReactNode) => React.ReactNode {
  const { lang } = useLang();
  return useCallback(
    (node: React.ReactNode) => (lang === 'en' ? translateNode(node) : node),
    [lang]
  );
}
