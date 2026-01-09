import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { useCartSync } from "@/hooks/useCartSync";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import Details from "./pages/Details";
import Profile from "./pages/Profile";
import StaffPOS from "./pages/StaffPOS";
import StaffPOSQuick from "./pages/StaffPOSQuick";
import StaffDashboard from "./pages/StaffDashboard";
import NotFound from "./pages/NotFound";
import PaymentProcessing from "./pages/PaymentProcessing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentError from "./pages/PaymentError";

// Component to initialize cart sync within the app
const CartSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useCartSync();
  return <>{children}</>;
};

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartSyncProvider>
            <OfflineBanner />
            <InstallPrompt />
            <Toaster />
            <Sonner 
              theme="dark" 
              toastOptions={{
                style: {
                  background: 'hsl(0 0% 10%)',
                  border: '1px solid hsl(0 0% 20%)',
                  color: 'hsl(0 0% 98%)',
                },
              }}
            />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/account" element={<Account />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/details" element={<Details />} />
                <Route path="/admin" element={<StaffPOS />} />
                <Route path="/admin/pos" element={<StaffPOSQuick />} />
                <Route path="/admin/dashboard" element={<StaffDashboard />} />
                <Route path="/processing/:orderCode" element={<PaymentProcessing />} />
                <Route path="/success" element={<PaymentSuccess />} />
                <Route path="/error" element={<PaymentError />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartSyncProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;