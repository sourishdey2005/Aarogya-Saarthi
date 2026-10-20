import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider, Localize } from './i18n/LanguageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode>
 <LanguageProvider>
 <BrowserRouter>
 <Localize>
 <App />
 </Localize>
 </BrowserRouter>
 </LanguageProvider>
 </React.StrictMode>
);
