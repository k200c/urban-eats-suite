import { Navbar } from "@/components/layout/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { FooterInfoBar } from "@/components/layout/FooterInfoBar";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-6">
            PRIVACY POLICY
          </h1>
          
          <p className="text-muted-foreground text-sm mb-8">
            Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="font-heading text-xl text-primary mb-3">1. WHO WE ARE</h2>
              <p className="text-muted-foreground leading-relaxed">
                Street Eatz Waterford is a food service business operating from Crystal Sports & Leisure Centre, 
                Waterford, Ireland. We are committed to protecting your privacy and handling your personal data 
                in compliance with the General Data Protection Regulation (GDPR) and the Irish Data Protection 
                Acts 1988-2018.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Contact:</strong> hello@streeteatzwaterford.ie
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">2. DATA WE COLLECT</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                When you place an order with us, we collect:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Your name and contact phone number</li>
                <li>Your order details and preferences</li>
                <li>Payment information (processed securely by Viva Wallet)</li>
                <li>Your order history for loyalty rewards</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">3. HOW WE USE YOUR DATA</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                We use your personal data to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Process and fulfil your food orders</li>
                <li>Contact you regarding your order status</li>
                <li>Manage our loyalty and rewards programme</li>
                <li>Improve our services and menu offerings</li>
                <li>Send promotional offers (only with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">4. PAYMENT PROCESSING</h2>
              <p className="text-muted-foreground leading-relaxed">
                All card payments are processed securely through Viva Wallet, a licensed payment institution 
                regulated by the Bank of Greece. We do not store your full card details on our systems. 
                Viva Wallet handles all payment data in accordance with PCI DSS Level 1 security standards.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">5. DATA RETENTION</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your order history for up to 2 years for warranty and customer service purposes. 
                Loyalty programme data is kept for the duration of your participation. You may request 
                deletion of your data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">6. YOUR RIGHTS</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Under GDPR, you have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Access your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Request erasure of your data</li>
                <li>Object to processing</li>
                <li>Data portability</li>
                <li>Lodge a complaint with the Data Protection Commission</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">7. COOKIES</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our website uses essential cookies to enable core functionality such as maintaining your 
                shopping cart and login session. We do not use tracking or advertising cookies without 
                your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-primary mb-3">8. CONTACT US</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, 
                please contact us at:
              </p>
              <div className="mt-3 p-4 bg-card/50 border border-border rounded-lg">
                <p className="text-foreground font-semibold">Street Eatz Waterford</p>
                <p className="text-muted-foreground">Crystal Sports & Leisure Centre</p>
                <p className="text-muted-foreground">Waterford, Ireland</p>
                <p className="text-primary mt-2">hello@streeteatzwaterford.ie</p>
                <p className="text-primary">+353 87 123 4567</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
      <FooterInfoBar />
    </div>
  );
};

export default PrivacyPolicy;
