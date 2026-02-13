'use client';

import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useSettings } from '@/providers';

export default function CustomToaster() {
  const { toastsEnabled } = useSettings();

  if (!toastsEnabled) return null;

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg, #fff)',
          color: 'var(--toast-color, #333)',
          borderRadius: '12px',
          padding: '14px 16px',
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t} style={{ ...t.style, padding: '8px 12px', gap: '8px', alignItems: 'center' }}>
          {({ icon, message }) => (
            <>
              {icon}
              <div style={{ flex: 1 }}>{message}</div>
              {t.type !== 'loading' && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4 opacity-60 hover:opacity-100" />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
