import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { requestOtp, verifyOtp, getMe } from '../lib/queries';
import { useAuth } from '../store/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GoogleLoginButton from '../components/GoogleLoginButton';
import ServerStatus from '../components/ServerStatus';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setMe = useAuth((s) => s.setMe);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? t('auth.sendFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      const me = await getMe();
      setMe(me);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? t('auth.codeIncorrect'));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSuccess(idToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/customer/auth/google', { idToken });
      const { accessToken } = res.data.data;
      localStorage.setItem('customerAccessToken', accessToken);
      const me = await getMe();
      setMe(me);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t('auth.codeIncorrect');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-5 text-white relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher dark />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100%-2rem)]">
        <ServerStatus />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-brand-lg bg-brand-red items-center justify-center mb-3 font-display font-black text-xl">
            TT
          </div>
          <h1 className="font-display font-black text-xl">{t('auth.appName')}</h1>
          <p className="text-xs text-white/60 mt-1">{t('auth.tagline')}</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={submitPhone} className="bg-white/10 rounded-brand-lg p-5 space-y-3">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-white/70 mb-1">
                {t('auth.phoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('auth.phonePlaceholder')}
                className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-brand text-base text-white focus:outline-none focus:border-brand-gold"
                required
              />
            </div>
            {error && (
              <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-red text-white font-semibold rounded-brand disabled:opacity-50"
            >
              {loading ? t('auth.sendingOtp') : t('auth.sendOtp')}
            </button>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-[10px] text-white/40">{t('auth.or')}</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <GoogleLoginButton onSuccess={onGoogleSuccess} />
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={submitOtp} className="bg-white/10 rounded-brand-lg p-5 space-y-3">
            <div className="text-xs text-white/70 mb-2">
              {t('auth.otpSentTo')} <strong>{phone}</strong>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="ml-2 text-brand-gold underline"
              >
                {t('auth.change')}
              </button>
            </div>
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-white/70 mb-1">
                {t('auth.otpLabel')}
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-brand text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-brand-gold"
                required
              />
            </div>
            {error && (
              <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 bg-brand-red text-white font-semibold rounded-brand disabled:opacity-50"
            >
              {loading ? t('auth.verifying') : t('auth.verify')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
