import './globals.css';
import type { Metadata } from 'next';
import { AppProvider } from '@/src/context';

export const metadata: Metadata = {
  title: 'TeamHub',
  description: 'A modern team project management workspace for projects, tasks, and collaboration.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
