/**
 * PWA Service Worker Registration and Update Detection
 * 
 * This module handles:
 * - Service worker registration
 * - Update detection and notification
 * - Periodic update checks
 * - Integration with the app's update UI
 */

import { hardResetApp } from './resetApp';

// Build version derived from build timestamp
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

// Registration state
let swRegistration: ServiceWorkerRegistration | null = null;
let updateCallback: ((needRefresh: boolean) => void) | null = null;
let updateApplied = false;

// Update check interval (30 minutes)
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

/**
 * Register the service worker and set up update detection
 */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return null;
  }

  // Skip iframe/editor/preview environments. Service workers in these contexts
  // cause stale shells, navigation interception, and offline-screen pollution.
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true; // Cross-origin block implies iframe
    }
  })();

  const hostname = window.location.hostname;
  const isPreviewHost =
    hostname.includes('id-preview--') ||
    hostname.includes('lovableproject.com') ||
    hostname.includes('lovable.app');

  if (isInIframe || isPreviewHost) {
    console.log('[PWA] Iframe/preview detected, unregistering any existing SWs and skipping registration');
    try {
      const existing = await navigator.serviceWorker.getRegistrations();
      await Promise.all(existing.map((r) => r.unregister()));
    } catch (err) {
      console.warn('[PWA] Failed to unregister preview SWs:', err);
    }
    return null;
  }

  try {
    // Validate SW file exists and is JavaScript before registering
    const swResponse = await fetch('/sw.js', { 
      method: 'HEAD',
      cache: 'no-store' 
    });
    
    if (!swResponse.ok) {
      console.warn('[PWA] SW file not available (status:', swResponse.status, ')');
      return null;
    }
    
    const contentType = swResponse.headers.get('content-type') || '';
    if (!contentType.includes('javascript')) {
      console.warn('[PWA] SW has wrong MIME type:', contentType, '- skipping registration');
      return null;
    }

    // SW file is valid, proceed with registration
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    swRegistration = registration;
    console.log('[PWA] Service worker registered, scope:', registration.scope);
    console.log('[PWA] App version:', APP_VERSION);

    // Set up update detection
    setupUpdateDetection(registration);
    
    // Set up periodic update checks
    setupPeriodicUpdateChecks(registration);
    
    // Check for updates on visibility change (tab focus)
    setupVisibilityUpdateCheck(registration);
    
    // Check for updates when coming back online
    setupOnlineUpdateCheck(registration);

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Set up listeners for SW update events
 */
function setupUpdateDetection(registration: ServiceWorkerRegistration): void {
  // Check if there's already a waiting SW
  if (registration.waiting) {
    console.log('[PWA] Update already waiting');
    notifyUpdate(true);
  }

  // Listen for new service worker installing
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    console.log('[PWA] New service worker installing...');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New SW is installed and waiting
        console.log('[PWA] New version available, waiting to activate');
        notifyUpdate(true);
      }
    });
  });

  // Listen for controller change (new SW took over)
  // Guard against reload loops: only reload when an update was explicitly
  // applied via SKIP_WAITING (not on first SW install).
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    if (!updateApplied) {
      console.log('[PWA] Controller changed (initial install), skipping reload');
      return;
    }
    hasReloaded = true;
    console.log('[PWA] Controller changed after update, reloading...');
    window.location.reload();
  });
}

/**
 * Set up periodic update checks every 30 minutes
 */
function setupPeriodicUpdateChecks(registration: ServiceWorkerRegistration): void {
  setInterval(() => {
    console.log('[PWA] Periodic update check...');
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);
}

/**
 * Check for updates when tab becomes visible
 */
function setupVisibilityUpdateCheck(registration: ServiceWorkerRegistration): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[PWA] Tab focused, checking for updates...');
      checkForUpdates();
    }
  });
}

/**
 * Check for updates when coming back online
 */
function setupOnlineUpdateCheck(registration: ServiceWorkerRegistration): void {
  window.addEventListener('online', () => {
    console.log('[PWA] Back online, checking for updates...');
    checkForUpdates();
  });
}

/**
 * Manually trigger an update check
 */
export async function checkForUpdates(): Promise<void> {
  if (!swRegistration) {
    console.log('[PWA] No registration, skipping update check');
    return;
  }

  try {
    await swRegistration.update();
    
    // Check if there's a waiting SW after update
    if (swRegistration.waiting) {
      notifyUpdate(true);
    }
  } catch (error) {
    console.error('[PWA] Update check failed:', error);
  }
}

/**
 * Apply the pending update by activating the waiting SW
 */
export function applyUpdate(): void {
  if (!swRegistration?.waiting) {
    console.log('[PWA] No waiting service worker');
    return;
  }

  console.log('[PWA] Sending SKIP_WAITING to activate new SW...');
  updateApplied = true;
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Set the callback for update notifications
 */
export function onNeedRefresh(callback: (needRefresh: boolean) => void): void {
  updateCallback = callback;
  
  // If there's already a waiting SW, notify immediately
  if (swRegistration?.waiting) {
    callback(true);
  }
}

/**
 * Notify the app about available updates
 */
function notifyUpdate(needRefresh: boolean): void {
  if (updateCallback) {
    updateCallback(needRefresh);
  }
}

/**
 * Get the current SW registration
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}
