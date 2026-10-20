/**
 * Authentication screen for ASHA workers.
 *
 * Two modes: sign up (new worker) and sign in (existing worker).
 * On success the JWT is stored in localStorage and the app reloads so that
 * every subsequent API call carries the Authorization header.
 */
import React, { useState } from 'react';
import { useTranslate } from '../i18n/LanguageContext';
import { setAuthToken, resolveApiBase } from '../lib/api';

interface AuthScreenProps {
  onBack: () => void;
  onSignedIn: (worker: { id: string; name: string; village?: string }) => void;
  showToast: (msg: string) => void;
}

type Mode = 'signin' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, onSignedIn, showToast }) => {
  const tr = useTranslate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);

    const baseUrl = resolveApiBase();
    const url = mode === 'signup' ? `${baseUrl}/api/auth/signup` : `${baseUrl}/api/auth/login`;
    const body =
      mode === 'signup'
        ? {
            name: name.trim() || 'ASHA Worker',
            village: village.trim() || 'Rampur',
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            password,
          }
        : {
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            password,
          };

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        throw new Error('सर्वर से कनेक्ट नहीं हो सका (Cannot reach the server). Check your internet connection.');
      }

      const text = await response.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned an invalid response (${response.status}). Please try again in a moment.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(data?.error?.message ?? `Authentication failed (${response.status})`);
      }
      if (!data?.token) {
        throw new Error('Server did not return a login token. Please try again.');
      }

      setAuthToken(data.token);
      showToast(mode === 'signup' ? 'खाता बना लिया गया ✓ (Account created)' : 'लॉगिन सफल ✓ (Signed in)');
      onSignedIn(data.worker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsBusy(false);
    }
  };

  return tr(
    <div className="flex flex-col w-full max-w-md mx-auto gap-4 pb-28">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#121c2a] active:scale-95 transition-all"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline-md text-[20px] text-[#121c2a] font-bold leading-tight">
            {mode === 'signup' ? 'नया खाता बनाएं (Create account)' : 'लॉगिन (Sign in)'}
          </h2>
          <p className="font-label-sm text-[12px] text-[#574238]">
            ASHA कार्यकर्ता लॉगिन (ASHA worker login)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e6eeff]/60">
        <div className="flex rounded-xl bg-[#eff4ff] p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
              mode === 'signin' ? 'bg-[#e8762b] text-white shadow-sm' : 'text-[#574238]'
            }`}
          >
            लॉगिन (Sign in)
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
              mode === 'signup' ? 'bg-[#e8762b] text-white shadow-sm' : 'text-[#574238]'
            }`}
          >
            नया खाता (Sign up)
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-[12px] text-[#574238] font-medium">
                  नाम (Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="सुनीता देवी (Sunita Devi)"
                  className="w-full bg-[#eff4ff] px-3.5 py-2.5 rounded-xl text-[14px] text-[#121c2a] border border-[#d9e3f6] focus:outline-none focus:ring-2 focus:ring-[#e8762b] focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-[12px] text-[#574238] font-medium">
                  गाँव (Village)
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="रामपुर (Rampur)"
                  className="w-full bg-[#eff4ff] px-3.5 py-2.5 rounded-xl text-[14px] text-[#121c2a] border border-[#d9e3f6] focus:outline-none focus:ring-2 focus:ring-[#e8762b] focus:bg-white"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[12px] text-[#574238] font-medium">
              फ़ोन (Phone) या ईमेल (Email)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 90000 00000"
              className="w-full bg-[#eff4ff] px-3.5 py-2.5 rounded-xl text-[14px] text-[#121c2a] border border-[#d9e3f6] focus:outline-none focus:ring-2 focus:ring-[#e8762b] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[12px] text-[#574238] font-medium">
              पासवर्ड (Password)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#eff4ff] px-3.5 py-2.5 rounded-xl text-[14px] text-[#121c2a] border border-[#d9e3f6] focus:outline-none focus:ring-2 focus:ring-[#e8762b] focus:bg-white"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[#ffdad6] text-[#93000a] px-3.5 py-2.5 text-[13px] font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full min-h-[56px] rounded-xl bg-[#e8762b] text-white font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all disabled:opacity-70"
          >
            <span
              className={`material-symbols-outlined text-[24px] ${isBusy ? 'animate-spin' : ''}`}
            >
              {isBusy ? 'sync' : mode === 'signup' ? 'person_add' : 'login'}
            </span>
            <span>{mode === 'signup' ? 'खाता बनाएं (Create account)' : 'लॉगिन (Sign in)'}</span>
          </button>
        </form>
      </div>

      <p className="text-center text-[12px] text-[#574238]">
        {mode === 'signup' ? 'पहले से खाता है? ' : 'नया खाता बनाना है? '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          className="text-[#00696b] font-bold underline"
        >
          {mode === 'signup' ? 'लॉगिन (Sign in)' : 'साइन अप (Sign up)'}
        </button>
      </p>
    </div>
  );
};
