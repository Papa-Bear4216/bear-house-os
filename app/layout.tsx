import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css'; // Global styles
import { AppNavigation } from '@/components/AppNavigation';
import { FirebaseProvider } from '@/components/FirebaseProvider';
import { AuthGate } from '@/components/AuthGate';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'DysfunctionJunction',
  description: 'Private family productivity app — chores, calendar, meals, and more.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} antialiased`}>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 font-sans pb-16 md:pb-0 overflow-x-hidden">
        <FirebaseProvider>
          <AuthGate>
            <AppNavigation>
              {children}
            </AppNavigation>
          </AuthGate>
        </FirebaseProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
