import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TeamHub',
  description: 'A modern team project management workspace for projects, tasks, and collaboration.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
