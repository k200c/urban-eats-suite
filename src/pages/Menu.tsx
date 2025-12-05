import { Navbar } from '@/components/layout/Navbar';
import { FooterInfoBar } from '@/components/layout/FooterInfoBar';
import { MenuSection } from '@/components/customer/MenuSection';
import { FloatingCartButton } from '@/components/customer/FloatingCartButton';

export default function Menu() {
  return (
    <div className="min-h-screen pt-16">
      <Navbar />
      <MenuSection />
      <FloatingCartButton />
      <FooterInfoBar />
    </div>
  );
}
