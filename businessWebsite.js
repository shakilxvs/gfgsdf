/** Normalize optional business website URLs for safe storage and favicon lookup. */
export function normalizeBusinessWebsiteUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.length > 2048) throw new Error("Website URL must be 2,048 characters or fewer.");

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website URL, such as https://example.com.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Website URLs must start with http:// or https://.");
  }
  if (!url.hostname || url.username || url.password) {
    throw new Error("Enter a public website URL without username or password details.");
  }
  return url.toString();
}

/** Use the website host to request its favicon without fetching the site server-side. */
export function businessFaviconUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`;
  } catch {
    return null;
  }
}
