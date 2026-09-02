import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://bookeasy.ai'),
  title: 'BookEasy AI — AI-Powered Appointment Management',
  description:
    'BookEasy AI is a modern appointment booking and business management platform for salons, barbers, and beauty businesses.',
  openGraph: {
    title: 'BookEasy AI — AI-Powered Appointment Management',
    description:
      'AI-Powered Appointment Management, Made Easy. Book appointments smarter with BookEasy AI.',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
