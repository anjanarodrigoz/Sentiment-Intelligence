import type { ReactNode } from 'react';
import Header from './Header';

export default function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
