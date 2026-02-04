import { Navbar } from '@/components/layout/Navbar';
import { FooterInfoBar } from '@/components/layout/FooterInfoBar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MenuSection } from '@/components/customer/MenuSection';
import { FloatingCartButton } from '@/components/customer/FloatingCartButton';

export default function Menu() {
  return (
    <div className="min-h-screen pt-[var(--header-offset)] pb-24 flex flex-col">
      <Navbar />
      <MenuSection />
      <SiteFooter />
      <FloatingCartButton />
      <FooterInfoBar />
    </div>
  );
}
