import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeTaskDescription,
  taskDescriptionToPlainText,
  taskDescriptionToWhatsApp
} from "../src/taskRichText.js";

test("sanitizes unsafe markup while preserving supported task formatting", () => {
  const clean = sanitizeTaskDescription(
    '<p onclick="alert(1)"><strong>Launch</strong> <em>today</em></p>' +
    '<ul><li><mark>First</mark></li><li>Second</li></ul>' +
    '<script>alert("bad")</script><img src=x onerror="alert(1)">' +
    '<a href="javascript:alert(1)" onclick="alert(1)">unsafe link</a>'
  );

  assert.match(clean, /<strong>Launch<\/strong>/);
  assert.match(clean, /<em>today<\/em>/);
  assert.match(clean, /<mark>First<\/mark>/);
  assert.match(clean, /<ul>/);
  assert.doesNotMatch(clean, /script|onerror|onclick|javascript:/i);
});

test("preserves safe links and selected inline formatting", () => {
  const clean = sanitizeTaskDescription(
    '<p><span style="color: #ff0000; background-color: #fff2a8">Important</span> ' +
    '<u>review</u> <s>old price</s> <a href="https://example.com">Open brief</a></p>'
  );

  assert.match(clean, /color:\s*#ff0000/i);
  assert.match(clean, /background-color:\s*#fff2a8/i);
  assert.match(clean, /<u>review<\/u>/);
  assert.match(clean, /<s>old price<\/s>/);
  assert.match(clean, /href="https:\/\/example\.com"/);
});

test("converts rich task descriptions into readable WhatsApp formatting", () => {
  const text = taskDescriptionToWhatsApp(
    '<h2>Website launch</h2><p><strong>Deadline:</strong> Friday</p>' +
    '<ul><li>Prepare theme</li><li><em>Test checkout</em></li></ul>' +
    '<p><a href="https://example.com">Open brief</a></p>'
  );

  assert.match(text, /\*Website launch\*/);
  assert.match(text, /\*Deadline:\* Friday/);
  assert.match(text, /• Prepare theme/);
  assert.match(text, /_Test checkout_/);
  assert.match(text, /Open brief \(https:\/\/example\.com\)/);
});

test("converts rich descriptions to plain searchable text", () => {
  assert.equal(
    taskDescriptionToPlainText('<p><strong>New</strong> theme</p><ul><li>Home page</li></ul>'),
    "New theme\n• Home page"
  );
});

test("does not impose the old 5,000-character description limit", () => {
  const largeDescription = "A".repeat(12000);
  assert.equal(sanitizeTaskDescription(largeDescription), largeDescription);
});

test("truncates only the WhatsApp preview, not the stored task description", () => {
  const longDescription = "<p>" + "Long task details ".repeat(80) + "</p>";
  const message = taskDescriptionToWhatsApp(longDescription, 160);
  assert.ok(Array.from(message).length <= 180);
  assert.match(message, /Open TaskXVS to read the full description/);
});
