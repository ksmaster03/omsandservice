import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp, getMe } from '../lib/queries';
import { useAuth } from '../store/auth';

export default function LoginPage() {
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
      setError(msg ?? 'ส่ง OTP ไม่สำเร็จ');
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
      setError(msg ?? 'รหัสไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-5 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-brand-lg bg-brand-red items-center justify-center mb-3 font-display font-black text-2xl">
            NBA
          </div>
          <h1 className="font-display font-black text-xl">NBA Sport</h1>
          <p className="text-xs text-white/60 mt-1">ระบบลูกค้า · ต่อประกัน · แจ้งซ่อม</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={submitPhone} className="bg-white/10 rounded-brand-lg p-5 space-y-3">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-white/70 mb-1">
                เบอร์โทรที่ลงทะเบียนไว้
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxx"
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
              {loading ? 'กำลังส่ง OTP...' : 'ส่ง OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={submitOtp} className="bg-white/10 rounded-brand-lg p-5 space-y-3">
            <div className="text-xs text-white/70 mb-2">
              ส่ง OTP ไปที่ <strong>{phone}</strong>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="ml-2 text-brand-gold underline"
              >
                เปลี่ยน
              </button>
            </div>
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-white/70 mb-1">
                รหัส 6 หลัก
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
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
