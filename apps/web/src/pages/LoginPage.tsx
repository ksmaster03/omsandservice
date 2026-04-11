import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../store/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'เข้าสู่ระบบไม่สำเร็จ';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy">
      <div className="w-full max-w-sm bg-white rounded-brand-lg shadow-brand-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-brand-lg bg-brand-red text-white font-display font-black text-2xl mb-3">
            NBA
          </div>
          <h1 className="font-display font-black text-xl text-brand-navy">NBA Sport OMS</h1>
          <p className="text-xs text-gray-500 mt-1">Order Management System</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-brand-red"
              required
            />
          </div>
          {error && (
            <div className="text-xs text-brand-red bg-brand-red-light rounded-brand p-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-red text-white font-semibold rounded-brand hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
