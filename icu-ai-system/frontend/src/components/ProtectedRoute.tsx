'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth has been initialized from localStorage
    if (isAuthLoaded && !token) {
      router.replace('/login');
    }
  }, [isAuthLoaded, token, router]);

  // Wait for auth to load before deciding
  if (!isAuthLoaded || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-hospital-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
