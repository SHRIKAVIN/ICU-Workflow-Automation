import type { Metadata, Viewport } from 'next';
import CustomToaster from '@/components/CustomToaster';
import { Providers } from '@/providers';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#10b981',
};

export const metadata: Metadata = {
  title: 'ICU Monitor - Smart Patient Monitoring',
  description: 'AI-Driven Smart ICU Patient Monitoring & Hospital Workflow Automation',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <CustomToaster />
        </Providers>
      </body>
    </html>
  );
}
