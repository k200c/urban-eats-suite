import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { MarketingBanner } from '@/components/customer/MarketingBanner';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="bg-background" style={{ minHeight: '100dvh', paddingBottom: 'calc(var(--bottom-offset, 56px) + 2rem)' }}>
      <MarketingBanner />
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
