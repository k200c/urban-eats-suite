import { Navbar } from '@/components/layout/Navbar';
import { FooterInfoBar } from '@/components/layout/FooterInfoBar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MenuSection } from '@/components/customer/MenuSection';
import { FloatingCartButton } from '@/components/customer/FloatingCartButton';

export default function Menu() {
  return (
    <div className="flex flex-col pt-[var(--header-offset)]" style={{ minHeight: '100dvh', paddingBottom: 'calc(var(--bottom-offset, 56px) + 4rem)' }}>
      <Navbar />
      <MenuSection />
      <SiteFooter />
      <FloatingCartButton />
      <FooterInfoBar />
    </div>
  );
}
