import React, {
 createContext,
 useCallback,
 useContext,
 useEffect,
 useMemo,
 useState,
} from 'react';
import { EN_DICTIONARY } from './translations';

/**
 * Aarogya Saarthi is English-only. Every user-facing string in the source is
 * authored in English; any residual Devanagari is translated at render time
 * (dictionary lookup, longest substring first) and any character that still
 * isn't English is stripped, so Hindi can never appear in the UI.
 */
export type Language = 'en';

const STORAGE_KEY = 'aarogya.language';

interface LanguageContextValue {
 lang: Language;
 setLang: (lang: Language) => void;
 toggleLang: () => void;
 t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

let currentLanguage: Language = 'en';

export const getCurrentLanguage = (): Language => currentLanguage;

const DEVANAGARI_KEYS = Object.keys(EN_DICTIONARY)
 .filter((key) => /[\u0900-\u097F]/.test(key))
 .sort((a, b) => b.length - a.length);

const EXACT_KEYS = new Set(Object.keys(EN_DICTIONARY));
const DEVANAGARI = /[\u0900-\u097F]/g;

const isIconElement = (node: React.ReactNode): boolean => {
 if (!React.isValidElement(node)) return false;
 const className = (node.props as { className?: string })?.className;
 return typeof className === 'string' && className.includes('material-symbols-outlined');
};

const flatText = (node: React.ReactNode): string => {
 if (typeof node === 'string' || typeof node === 'number') return String(node);
 if (Array.isArray(node)) return node.map(flatText).join('');
 if (React.isValidElement(node)) {
 const children = (node.props as { children?: React.ReactNode })?.children;
 return flatText(children);
 }
 return '';
};

/** Translate a single string: dictionary lookup, then strip leftover Devanagari. */
export function translateText(text: string): string {
 if (!text) return text;

 if (EXACT_KEYS.has(text)) {
 return stripDevanagari(EN_DICTIONARY[text]);
 }

 const trimmed = text.trim();
 if (trimmed !== text && trimmed.length > 0 && EXACT_KEYS.has(trimmed)) {
 return text.replace(trimmed, stripDevanagari(EN_DICTIONARY[trimmed]));
 }

 let result = text;
 for (let pass = 0; pass < 6; pass += 1) {
 let replaced = false;
 for (const key of DEVANAGARI_KEYS) {
 if (key.length < 4) continue;
 if (result.includes(key)) {
 const next = result.replace(key, stripDevanagari(EN_DICTIONARY[key]));
 if (next !== result) {
 result = next;
 replaced = true;
 break;
 }
 }
 }
 if (!replaced) break;
 }

 return stripDevanagari(result);
}

function stripDevanagari(value: string): string {
 return value.replace(DEVANAGARI, '').replace(/\s{2,}/g, ' ').trim();
}

const TRANSLATED_PROPS = new Set(['placeholder', 'title', 'aria-label', 'alt']);

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

function translateNode(node: React.ReactNode): React.ReactNode {
 if (typeof node === 'string') {
 return translateText(node);
 }
 if (typeof node === 'number' || typeof node === 'boolean' || node == null) {
 return node;
 }
 if (Array.isArray(node)) {
 return node.map((child) => translateNode(child));
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
 nextProps.children = translateNode(props.children);
 }
 const cloned = React.cloneElement(node, nextProps as never);
 copyValidatedFlag(node, cloned);
 return cloned;
 }
 return node;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [lang, setLangState] = useState<Language>(() => {
 if (typeof window === 'undefined') return 'en';
 const stored = window.localStorage.getItem(STORAGE_KEY);
 return stored === 'en' ? 'en' : 'en';
 });

 const setLang = useCallback((next: Language) => {
 setLangState(next);
 currentLanguage = next;
 }, []);

 const toggleLang = useCallback(() => {
 // Language is fixed to English.
 }, []);

 useEffect(() => {
 currentLanguage = lang;
 if (typeof document !== 'undefined') {
 document.documentElement.lang = 'en';
 }
 }, [lang]);

 const t = useCallback((text: string) => translateText(text), []);

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

export const Localize: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 return <>{translateNode(children)}</>;
};

export function useTranslate(): (node: React.ReactNode) => React.ReactNode {
 return useCallback((node: React.ReactNode) => translateNode(node), []);
}
