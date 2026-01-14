import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useCartSync } from "@/hooks/useCartSync";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/menu" element={<Menu />} />
                
                {/* Customer routes - require auth */}
                <Route path="/cart" element={<AuthGuard><Cart /></AuthGuard>} />
                <Route path="/account" element={<AuthGuard><Account /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                <Route path="/details" element={<AuthGuard><Details /></AuthGuard>} />
                
                {/* Staff routes - require admin role */}
                <Route path="/admin" element={<AuthGuard allowedRoles={['admin']}><StaffPOS /></AuthGuard>} />
                <Route path="/admin/pos" element={<AuthGuard allowedRoles={['admin']}><StaffPOSQuick /></AuthGuard>} />
                <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['admin']}><StaffDashboard /></AuthGuard>} />
                
                {/* Payment routes - require auth */}
                <Route path="/processing/:orderCode" element={<AuthGuard><PaymentProcessing /></AuthGuard>} />
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