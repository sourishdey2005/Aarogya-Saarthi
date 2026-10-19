import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { LanguageProvider } from '../src/i18n/LanguageContext';

const storage = new Map<string, string>();
storage.set('aarogya.language', process.argv[2] === 'hi' ? 'hi' : 'en');
(globalThis as any).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 };
(globalThis as any).window = { localStorage: (globalThis as any).localStorage };

const html = renderToString(React.createElement(LanguageProvider, null, React.createElement(App)));
const text = html.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
console.log(lines.join(' | '));
