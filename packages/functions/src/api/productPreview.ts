import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { requireAppCheck } from "../utils/app-check.js";

const publicCallableOptions = { invoker: "public" as const };

const FETCH_TIMEOUT_MS = 8_000;
// Meta tags live in <head>, near the top of the document — capping how much of the
// response we parse keeps this cheap regardless of how large the page actually is.
const MAX_HTML_CHARS = 200_000;

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

export type ProductPreviewResult = {
  ok: boolean;
  title?: string;
  image?: string;
  price?: number;
  currency?: string;
  error?: string;
};

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, attrKey: string, attrValue: string): string | null {
  const forward = new RegExp(
    `<meta[^>]+${attrKey}=["']${attrValue}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attrKey}=["']${attrValue}["']`,
    "i"
  );
  const match = html.match(forward) || html.match(reversed);
  return match ? decodeHtmlEntities(match[1]).trim() : null;
}

function extractTitle(html: string): string | undefined {
  const ogTitle = extractMetaContent(html, "property", "og:title");
  if (ogTitle) return ogTitle;

  const twitterTitle = extractMetaContent(html, "name", "twitter:title");
  if (twitterTitle) return twitterTitle;

  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]).trim() : undefined;
}

function extractImage(html: string): string | undefined {
  return (
    extractMetaContent(html, "property", "og:image") ||
    extractMetaContent(html, "name", "twitter:image") ||
    undefined
  );
}

function extractPrice(html: string): { price?: number; currency?: string } {
  const amountRaw =
    extractMetaContent(html, "property", "product:price:amount") ||
    extractMetaContent(html, "property", "og:price:amount") ||
    extractMetaContent(html, "itemprop", "price");
  const currency =
    extractMetaContent(html, "property", "product:price:currency") ||
    extractMetaContent(html, "property", "og:price:currency") ||
    extractMetaContent(html, "itemprop", "priceCurrency") ||
    undefined;

  if (!amountRaw) return {};

  const parsed = Number(amountRaw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? { price: parsed, currency } : {};
}

/**
 * Fetches a product page server-side and parses Open Graph / meta tags for a
 * title, image, and price — powers the "paste a link" entry point for adding
 * an item to a wishlist. Best-effort only: any failure returns { ok: false }
 * so the caller can fall back to manual entry, it never throws for a page
 * that simply doesn't have the tags we're looking for.
 */
export const fetchProductPreview = onCall(publicCallableOptions, async (request: CallableRequest): Promise<ProductPreviewResult> => {
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const rawUrl = String(request.data?.url || "").trim();
  if (!rawUrl) {
    throw new HttpsError("invalid-argument", "A product URL is required");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL" };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, error: "Only http(s) links are supported" };
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return { ok: false, error: "That URL can't be fetched" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; WishlistWizardLinkPreview/1.0)",
      },
    });

    if (!response.ok) {
      return { ok: false, error: `The page returned an error (${response.status})` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { ok: false, error: "That link doesn't point to a web page" };
    }

    const fullHtml = await response.text();
    const html = fullHtml.slice(0, MAX_HTML_CHARS);

    const title = extractTitle(html);
    const image = extractImage(html);
    const { price, currency } = extractPrice(html);

    if (!title && !image && price === undefined) {
      return { ok: false, error: "Couldn't find product details on that page" };
    }

    return { ok: true, title, image, price, currency };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    logger.warn("fetchProductPreview failed", { url: parsedUrl.hostname, isAbort, error: String(error) });
    return { ok: false, error: isAbort ? "The page took too long to respond" : "Couldn't reach that page" };
  } finally {
    clearTimeout(timeout);
  }
});
