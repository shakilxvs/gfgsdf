import React, { useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Eraser,
  Heading2,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2
} from "lucide-react";

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "del", "div", "em",
  "h1", "h2", "h3", "h4", "hr", "i", "li", "mark", "ol", "p",
  "pre", "s", "span", "strong", "sub", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul"
]);
const DROP_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math",
  "img", "video", "audio", "input", "button", "form", "meta", "link"
]);
const BLOCK_TAGS = new Set([
  "address", "article", "blockquote", "div", "h1", "h2", "h3",
  "h4", "li", "p", "pre", "section", "tr"
]);
const SAFE_STYLE_PROPERTIES = new Set([
  "color", "background-color", "font-weight", "font-style",
  "text-decoration", "text-align", "font-size", "list-style-type",
  "margin-left", "padding-left", "vertical-align"
]);
const COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,24})$/i;
const RICH_TAG_PATTERN = /<\/?(?:a|b|blockquote|br|code|del|div|em|h[1-4]|hr|i|li|mark|ol|p|pre|s|span|strong|sub|sup|table|tbody|td|tfoot|th|thead|tr|u|ul)\b/i;

function safeStyleValue(property, rawValue) {
  const value = String(rawValue || "").trim();
  if (!value || /url\s*\(|expression\s*\(|javascript:|var\s*\(/i.test(value)) return "";
  if (property === "color" || property === "background-color") return COLOR_VALUE.test(value) ? value : "";
  if (property === "font-weight") return /^(?:normal|bold|[1-9]00)$/i.test(value) ? value : "";
  if (property === "font-style") return /^(?:normal|italic|oblique)$/i.test(value) ? value : "";
  if (property === "text-decoration") return /^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/i.test(value) ? value : "";
  if (property === "text-align") return /^(?:left|center|right|justify)$/i.test(value) ? value : "";
  if (property === "font-size") return /^\d{1,3}(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(value) ? value : "";
  if (property === "list-style-type") return /^(?:disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/i.test(value) ? value : "";
  if (property === "vertical-align") return /^(?:baseline|sub|super|top|middle|bottom)$/i.test(value) ? value : "";
  if (property === "margin-left" || property === "padding-left") return /^\d{1,3}(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(value) ? value : "";
  return "";
}

function cleanStyle(styleText) {
  return String(styleText || "").split(";").map(rule => {
    const colon = rule.indexOf(":");
    if (colon < 1) return "";
    const property = rule.slice(0, colon).trim().toLowerCase();
    if (!SAFE_STYLE_PROPERTIES.has(property)) return "";
    const value = safeStyleValue(property, rule.slice(colon + 1));
    return value ? `${property}: ${value}` : "";
  }).filter(Boolean).join("; ");
}

export function sanitizeTaskRichHtml(value) {
  const source = String(value ?? "");
  if (!source) return "";
  if (typeof DOMParser === "undefined" || typeof document === "undefined") return source;
  if (!RICH_TAG_PATTERN.test(source)) {
    return source
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n?/g, "\n")
      .replace(/\n/g, "<br>");
  }

  const parsed = new DOMParser().parseFromString(source, "text/html");
  const output = document.createElement("div");

  function copyNode(node, parent) {
    if (node.nodeType === 3) {
      parent.appendChild(document.createTextNode(node.nodeValue || ""));
      return;
    }
    if (node.nodeType !== 1) return;

    const sourceTag = node.tagName.toLowerCase();
    if (DROP_TAGS.has(sourceTag)) return;
    const targetTag = sourceTag === "font" ? "span" : sourceTag;
    if (!ALLOWED_TAGS.has(targetTag)) {
      Array.from(node.childNodes).forEach(child => copyNode(child, parent));
      return;
    }

    const element = document.createElement(targetTag);
    let style = cleanStyle(node.getAttribute("style"));

    if (sourceTag === "font") {
      const color = safeStyleValue("color", node.getAttribute("color"));
      if (color && !/\bcolor\s*:/i.test(style)) style = [style, `color: ${color}`].filter(Boolean).join("; ");
    }
    if (style) element.setAttribute("style", style);

    if (targetTag === "a") {
      const href = String(node.getAttribute("href") || "").trim();
      const safeHref = /^(?:https?:|mailto:|tel:)/i.test(href) ||
        (href.startsWith("/") && !href.startsWith("//")) ||
        href.startsWith("#");
      if (safeHref) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (["td", "th"].includes(targetTag)) {
      for (const name of ["colspan", "rowspan"]) {
        const value = node.getAttribute(name);
        if (value && /^\d{1,2}$/.test(value)) element.setAttribute(name, value);
      }
      const align = node.getAttribute("align");
      if (align && /^(left|center|right)$/i.test(align)) element.setAttribute("align", align.toLowerCase());
    }

    if (targetTag === "ol") {
      const start = node.getAttribute("start");
      if (start && /^\d{1,4}$/.test(start)) element.setAttribute("start", start);
    }

    Array.from(node.childNodes).forEach(child => copyNode(child, element));
    parent.appendChild(element);
  }

  Array.from(parsed.body.childNodes).forEach(node => copyNode(node, output));
  return output.innerHTML.trim();
}

export function taskDescriptionPlainText(value) {
  const source = String(value ?? "");
  if (!source) return "";
  if (typeof DOMParser === "undefined") return source.replace(/<[^>]*>/g, " ");
  if (!RICH_TAG_PATTERN.test(source)) return source;
  const parsed = new DOMParser().parseFromString(sanitizeTaskRichHtml(source), "text/html");
  const walk = node => {
    if (node.nodeType === 3) return node.nodeValue || "";
    if (node.nodeType !== 1) return "";
    const tag = node.tagName.toLowerCase();
    const before = BLOCK_TAGS.has(tag) ? "\n" : "";
    const inside = Array.from(node.childNodes).map(walk).join("");
    const after = tag === "br" || tag === "li" || BLOCK_TAGS.has(tag) ? "\n" : "";
    return before + inside + after;
  };
  return Array.from(parsed.body.childNodes).map(walk).join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function RichTextView({ value, className = "" }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeTaskRichHtml(value) }} />;
}

export function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const lastValueRef = useRef("");

  useEffect(() => {
    const next = sanitizeTaskRichHtml(value);
    if (editorRef.current && next !== lastValueRef.current) {
      editorRef.current.innerHTML = next;
      lastValueRef.current = next;
    }
  }, [value]);

  function syncValue() {
    if (!editorRef.current) return;
    const html = sanitizeTaskRichHtml(editorRef.current.innerHTML).trim();
    lastValueRef.current = html;
    onChange(html === "<br>" ? "" : html);
  }

  function runCommand(command, argument = null) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, argument);
    syncValue();
  }

  function formatBlock(tag) {
    runCommand("formatBlock", `<${tag}>`);
  }

  function addLink() {
    const url = window.prompt("Paste a website link (https://...) or email address:");
    if (!url) return;
    const trimmed = url.trim();
    if (!/^(?:https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
      window.alert("Use a link beginning with https://, http://, mailto: or tel:.");
      return;
    }
    runCommand("createLink", trimmed);
  }

  function changeTextColor() {
    const color = window.prompt("Enter a text color in HEX format:", "#365b43");
    if (!color || !/^#[0-9a-f]{6}$/i.test(color.trim())) return;
    runCommand("foreColor", color.trim());
  }

  function pasteFormatted(event) {
    const items = Array.from(event.clipboardData?.items || []);
    const containsImageFile = items.some(item => item.kind === "file" && item.type.startsWith("image/"));
    if (containsImageFile) return;
    const html = event.clipboardData?.getData("text/html");
    if (!html) return;
    event.preventDefault();
    const clean = sanitizeTaskRichHtml(html);
    const plain = event.clipboardData?.getData("text/plain") || "";
    const safePlain = plain
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, clean || safePlain);
    syncValue();
  }

  const tools = [
    { label: "Bold", icon: Bold, action: () => runCommand("bold") },
    { label: "Italic", icon: Italic, action: () => runCommand("italic") },
    { label: "Underline", icon: Underline, action: () => runCommand("underline") },
    { label: "Strikethrough", icon: Strikethrough, action: () => runCommand("strikeThrough") },
    { label: "Highlight", icon: Highlighter, action: () => runCommand("hiliteColor", "#fff1a8") },
    { label: "Text color", icon: AlignCenter, action: changeTextColor },
    { label: "Heading", icon: Heading2, action: () => formatBlock("h2") },
    { label: "Bulleted list", icon: List, action: () => runCommand("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => runCommand("insertOrderedList") },
    { label: "Quote", icon: Quote, action: () => formatBlock("blockquote") },
    { label: "Add link", icon: LinkIcon, action: addLink },
    { label: "Align left", icon: AlignLeft, action: () => runCommand("justifyLeft") },
    { label: "Align center", icon: AlignCenter, action: () => runCommand("justifyCenter") },
    { label: "Undo", icon: Undo2, action: () => runCommand("undo") },
    { label: "Redo", icon: Redo2, action: () => runCommand("redo") },
    { label: "Clear formatting", icon: Eraser, action: () => runCommand("removeFormat") }
  ];

  return <div className="rich-text-editor">
    <div className="rich-text-toolbar" role="toolbar" aria-label="Description formatting">
      {tools.map(({ label, icon: Icon, action }) => <button
        key={label}
        type="button"
        className="rich-text-tool"
        title={label}
        aria-label={label}
        onMouseDown={event => event.preventDefault()}
        onClick={action}
      ><Icon size={15}/></button>)}
    </div>
    <div
      ref={editorRef}
      className="rich-text-editable"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Task description"
      aria-multiline="true"
      data-placeholder="Write a clear description, add headings, lists, highlights or paste formatted content…"
      onInput={syncValue}
      onPaste={pasteFormatted}
      onKeyUp={syncValue}
      onBlur={syncValue}
    />
    <div className="rich-text-footer">Rich formatting and formatted paste supported. No 5,000-character cap.</div>
  </div>;
}
