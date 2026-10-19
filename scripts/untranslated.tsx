/* Lists every Devanagari string that is still visible in the English build. */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { LanguageProvider } from '../src/i18n/LanguageContext';

const storage = new Map<string, string>();
storage.set('aarogya.language', 'en');
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};
(globalThis as any).window = { localStorage: (globalThis as any).localStorage };

const routes = ['/', '/patients', '/scan', '/referral', '/sync', '/registration'];
const found = new Set<string>();

for (const route of routes) {
  const html = renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [route] },
        React.createElement(App)
      )
    )
  );
  const text = html
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
  for (const chunk of text.split(/[\n\r]+/)) {
    const t = chunk.trim();
    if (t && /[\u0900-\u097F]/.test(t)) found.add(t);
  }
}

console.log([...found].join('\n---\n'));
console.log('remaining devanagari chunks:', found.size);
