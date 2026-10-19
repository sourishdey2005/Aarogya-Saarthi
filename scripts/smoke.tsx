/* Render smoke test: verifies the app renders in both languages without errors. */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { LanguageProvider, Localize } from '../src/i18n/LanguageContext';

const storage = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage;

(globalThis as unknown as { window: unknown }).window = {
  localStorage: (globalThis as unknown as { localStorage: Storage }).localStorage,
};

function render(lang: 'hi' | 'en', path = '/') {
  storage.set('aarogya.language', lang);
  return renderToString(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(Localize, null, React.createElement(App))
      )
    )
  );
}

const hindi = render('hi');
const english = render('en');
const patientsPage = render('en', '/patients');

console.log('HINDI length   :', hindi.length);
console.log('ENGLISH length :', english.length);
console.log('Hindi contains आरोग्य-सारथी :', hindi.includes('आरोग्य-सारथी'));
console.log('English contains Aarogya Sarathi :', english.includes('Aarogya Sarathi'));
console.log('English contains Patient Directory (on /patients) :', patientsPage.includes('Patient Directory'));
console.log('English still has Devanagari (expected: language names only):', /[ऀ-ॿ]/.test(english));
console.log('English sample snippet:', english.slice(english.indexOf('Aarogya'), english.indexOf('Aarogya') + 200));
