'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers';
import { login } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      loginUser(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: 'doctor' | 'nurse' | 'admin') => {
    const credsMap = {
      doctor: { email: 'doctor@test.com', password: '123' },
      nurse: { email: 'nurse@test.com', password: '123' },
      admin: { email: 'admin@test.com', password: 'admin123' },
    };
    const creds = credsMap[role];

    setEmail(creds.email);
    setPassword(creds.password);
    setLoading(true);

    try {
      const data = await login(creds.email, creds.password);
      loginUser(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-hospital-900 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-hospital-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-icu-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-hospital-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-hospital-400 to-hospital-600 shadow-lg shadow-hospital-500/30 mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ICU Monitor</h1>
          <p className="text-gray-400 mt-1">Smart Patient Monitoring System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-hospital-500/50 focus:border-hospital-500 transition-all"
                placeholder="doctor@test.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-hospital-500/50 focus:border-hospital-500 transition-all pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-hospital-500 to-hospital-600 hover:from-hospital-600 hover:to-hospital-700 text-white font-semibold rounded-xl shadow-lg shadow-hospital-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Quick login buttons */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-gray-400 mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => quickLogin('doctor')}
                disabled={loading}
                className="py-2.5 px-4 bg-icu-600/20 hover:bg-icu-600/30 border border-icu-500/30 text-icu-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                Doctor
              </button>
              <button
                onClick={() => quickLogin('nurse')}
                disabled={loading}
                className="py-2.5 px-4 bg-hospital-600/20 hover:bg-hospital-600/30 border border-hospital-500/30 text-hospital-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                Nurse
              </button>
              <button
                onClick={() => quickLogin('admin')}
                disabled={loading}
                className="py-2.5 px-4 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          AI-Driven Healthcare Monitoring v1.0
        </p>
      </div>
    </div>
  );
}
