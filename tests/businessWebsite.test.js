import test from "node:test";
import assert from "node:assert/strict";
import { businessFaviconUrl, normalizeBusinessWebsiteUrl } from "../businessWebsite.js";

test("normalizes a bare business domain to HTTPS", () => {
  assert.equal(normalizeBusinessWebsiteUrl("example.com"), "https://example.com/");
});

test("preserves a supplied HTTP or HTTPS website path", () => {
  assert.equal(normalizeBusinessWebsiteUrl("https://example.com/shop"), "https://example.com/shop");
  assert.equal(normalizeBusinessWebsiteUrl("http://example.com/about"), "http://example.com/about");
});

test("allows an empty website URL so businesses may omit it", () => {
  assert.equal(normalizeBusinessWebsiteUrl(""), null);
  assert.equal(normalizeBusinessWebsiteUrl(null), null);
});

test("rejects unsafe protocols and credential-bearing URLs", () => {
  assert.throws(() => normalizeBusinessWebsiteUrl("javascript:alert(1)"), /valid website URL|http/);
  assert.throws(() => normalizeBusinessWebsiteUrl("ftp://example.com"), /http/);
  assert.throws(() => normalizeBusinessWebsiteUrl("https://user:secret@example.com"), /without username or password/);
});

test("rejects oversized URLs", () => {
  assert.throws(() => normalizeBusinessWebsiteUrl("a".repeat(2049)), /2,048/);
});

test("builds a domain-based favicon lookup URL", () => {
  assert.equal(
    businessFaviconUrl("https://www.example.com/products/item"),
    "https://www.google.com/s2/favicons?domain=www.example.com&sz=64"
  );
  assert.equal(businessFaviconUrl("not a URL"), null);
});
