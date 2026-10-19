import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BDU Store — Campus Device Storage',
    template: '%s · BDU Store',
  },
  description:
    'Register a computer, laptop, phone or tablet for storage at the Bahir Dar University campus store, and request release when you need it back.',
  icons: {
    icon: [{ url: '/logo.jpeg', type: 'image/jpeg' }],
    apple: [{ url: '/logo.jpeg', type: 'image/jpeg' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
