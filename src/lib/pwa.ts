export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export async function registerSW(): Promise<null> { return null; }
export async function checkForUpdates(): Promise<void> { return; }
export function applyUpdate(): void { return; }
export function onNeedRefresh(_cb: (needRefresh: boolean) => void): void { return; }
export function getRegistration(): null { return null; }
