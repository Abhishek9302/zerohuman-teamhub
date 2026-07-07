import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sniplet',
  description: 'A full-stack URL shortener with secure auth and click analytics.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
