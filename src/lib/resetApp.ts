/**
 * Performs a complete app reset:
 * 1. Unregisters all service workers
 * 2. Clears all caches
 * 3. Clears checkout-related localStorage
 * 4. Forces a fresh page load from server
 */
export const hardResetApp = async (): Promise<void> => {
  try {
    console.log('🔄 Starting hard reset...');

    // Step 1: Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('✅ Service workers unregistered:', registrations.length);
    }

    // Step 2: Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ All caches cleared:', cacheNames.length);
    }

    // Step 3: Clear localStorage items related to cart/checkout state
    const keysToRemove = ['cart-storage', 'checkout-state', 'payment-state'];
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore localStorage errors
      }
    });
    console.log('✅ localStorage cleared');

    // Step 4: Force a fresh server fetch (bypasses cache)
    const resetUrl = window.location.origin + window.location.pathname + '?reset=' + Date.now();
    console.log('🔄 Reloading to:', resetUrl);
    window.location.href = resetUrl;
    
  } catch (error) {
    console.error('Reset failed:', error);
    // Fallback: simple reload
    window.location.reload();
  }
};
