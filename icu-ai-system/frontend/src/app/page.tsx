'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-hospital-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-hospital-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-white/60">Loading ICU Monitor...</p>
      </div>
    </div>
  );
}
