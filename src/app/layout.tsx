
import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import FloatingBackground from '@/components/floating-background';

export const metadata: Metadata = {
  title: 'FarsiFanConnect',
  description:
    'The exclusive platform for Farsi-speaking creators and their fans.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico?v=1" sizes="any" />
         <link rel="apple-touch-icon" href="/apple-icon.png?v=1" />
         <link rel="manifest" href="/manifest.json?v=1" />
      </head>
      <body className="font-body antialiased">
        <FloatingBackground />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
