/**
 * Dynamically build a hidden HTML form, populate it with hidden inputs,
 * append it to the document, and submit it as a POST navigation.
 *
 * Used for hosted-checkout providers (e.g. myPOS) that require the browser
 * to POST signed fields to an external action URL rather than a simple GET
 * redirect.
 *
 * Production-safe: validates inputs and avoids cryptic DOM errors.
 */
export function postFormToUrl(
  actionUrl: string,
  fields: Record<string, unknown>
): void {
  if (typeof actionUrl !== 'string' || actionUrl.trim() === '') {
    throw new Error('postFormToUrl: actionUrl must be a non-empty string');
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('postFormToUrl: fields must be an object');
  }
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('postFormToUrl: document is not available');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';
  // Default acceptCharset for safety with signed payloads
  form.acceptCharset = 'UTF-8';

  for (const [key, rawValue] of Object.entries(fields)) {
    if (key == null) continue;
    const value =
      rawValue === null || rawValue === undefined ? '' : String(rawValue);
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = String(key);
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}