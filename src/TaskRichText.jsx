import React, { useEffect, useRef, useState } from "react";
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
  Undo2,
  Palette,
  X
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
const RICH_TAG_PATTERN = /<\/?(?:a|b|blockquote|br|code|del|div|em|font|h[1-4]|hr|i|li|mark|ol|p|pre|s|span|strong|sub|sup|table|tbody|td|tfoot|th|thead|tr|u|ul)\b/i;

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
  const savedSelectionRef = useRef(null);
  const [dialogType, setDialogType] = useState(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    const next = sanitizeTaskRichHtml(value);
    if (editorRef.current && next !== lastValueRef.current) {
      editorRef.current.innerHTML = next;
      lastValueRef.current = next;
    }
  }, [value]);

  useEffect(() => {
    if (dialogType) {
      const field = document.querySelector(".rich-editor-dialog input");
      field?.focus();
      if (field?.select && dialogType === "link") field.select();
    }
  }, [dialogType]);

  function syncValue() {
    if (!editorRef.current) return;
    const html = sanitizeTaskRichHtml(editorRef.current.innerHTML).trim();
    lastValueRef.current = html;
    onChange(html === "<br>" ? "" : html);
  }

  function saveEditorSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) {
      savedSelectionRef.current = null;
      return;
    }
    const range = selection.getRangeAt(0);
    const anchorInside = range.commonAncestorContainer === editor || editor.contains(range.commonAncestorContainer);
    savedSelectionRef.current = anchorInside ? range.cloneRange() : null;
  }

  function restoreEditorSelection() {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return null;
    selection.removeAllRanges();

    const savedRange = savedSelectionRef.current;
    const rangeIsInside = savedRange &&
      (savedRange.commonAncestorContainer === editor || editor.contains(savedRange.commonAncestorContainer));

    if (rangeIsInside) {
      selection.addRange(savedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
    return selection;
  }

  function closeDialog() {
    setDialogType(null);
    setDialogError("");
    setDialogValue("");
  }

  function cancelDialog() {
    closeDialog();
    restoreEditorSelection();
  }

  function openDialog(type) {
    saveEditorSelection();
    setDialogError("");
    setDialogValue(type === "color" ? "#365b43" : "");
    setDialogType(type);
  }

  function runCommand(command, argument = null) {
    const editor = editorRef.current;
    if (!editor) return;

    // Toolbar clicks take focus away from contentEditable in some browsers.
    // Restore the exact saved range before applying the selected formatting.
    restoreEditorSelection();
    document.execCommand(command, false, argument);
    syncValue();
    saveEditorSelection();
  }

  function formatBlock(tag) {
    runCommand("formatBlock", "<" + tag + ">");
  }

  function normalizeLink(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return { error: "Enter a website address or email address." };
    if (/[\s<>]/.test(trimmed)) return { error: "Enter a valid website address or email address." };

    if (/^(?:https?:\/\/)/i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.hostname) return { href: parsed.href };
      } catch {}
      return { error: "That website address does not look valid." };
    }

    if (/^(?:mailto:)/i.test(trimmed)) {
      const email = trimmed.slice(7);
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
        ? { href: "mailto:" + email }
        : { error: "Enter a valid email address." };
    }

    if (/^(?:tel:)/i.test(trimmed)) {
      const phone = trimmed.slice(4);
      return /^[+\d().-]{5,24}$/.test(phone)
        ? { href: "tel:" + phone }
        : { error: "Enter a valid phone number." };
    }

    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      return { href: "mailto:" + trimmed };
    }

    const domainCandidate = trimmed.replace(/^www\./i, "");
    if (/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i.test(domainCandidate)) {
      try {
        const parsed = new URL("https://" + trimmed);
        if (parsed.hostname) return { href: parsed.href };
      } catch {}
    }

    return { error: "Use a full website link, such as https://example.com, or a valid email address." };
  }

  function applyLink(href) {
    const editor = editorRef.current;
    const selection = restoreEditorSelection();
    if (!editor || !selection || !selection.rangeCount) return;

    if (selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = href;
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      document.execCommand("createLink", false, href);
    }
    syncValue();
    closeDialog();
  }

  function submitDialog() {
    if (dialogType === "link") {
      const result = normalizeLink(dialogValue);
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      applyLink(result.href);
      return;
    }

    if (dialogType === "color") {
      const color = String(dialogValue || "").trim();
      if (!/^#[0-9a-f]{6}$/i.test(color)) {
        setDialogError("Choose a valid six-digit HEX color.");
        return;
      }
      restoreEditorSelection();
      document.execCommand("foreColor", false, color);
      syncValue();
      closeDialog();
    }
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
    { label: "Text color", icon: Palette, action: () => openDialog("color") },
    { label: "Heading", icon: Heading2, action: () => formatBlock("h2") },
    { label: "Bulleted list", icon: List, action: () => runCommand("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => runCommand("insertOrderedList") },
    { label: "Quote", icon: Quote, action: () => formatBlock("blockquote") },
    { label: "Add link", icon: LinkIcon, action: () => openDialog("link") },
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
        onMouseDown={event => { event.preventDefault(); saveEditorSelection(); }}
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
      data-placeholder="Add a description..."
      onInput={syncValue}
      onPaste={pasteFormatted}
      onKeyUp={syncValue}
      onBlur={syncValue}
    />
    {dialogType && <div
      className="modal-backdrop rich-editor-dialog-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget) cancelDialog(); }}
    >
      <section
        className="modal rich-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rich-editor-dialog-title"
        onMouseDown={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelDialog();
            return;
          }
          if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "color") {
            event.preventDefault();
            event.stopPropagation();
            submitDialog();
          }
        }}
      >
        <header className="modal-header">
          <div>
            <h2 id="rich-editor-dialog-title">{dialogType === "link" ? "Insert link" : "Text color"}</h2>
            <p>{dialogType === "link" ? "Add a clickable website or email link to your description." : "Choose a color for the selected text."}</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={cancelDialog}><X size={18}/></button>
        </header>
        <div className="rich-editor-dialog-form" role="group">
          {dialogType === "link"
            ? <label className="field">
                <span>Website or email address</span>
                <input
                  type="text"
                  value={dialogValue}
                  onChange={event => { setDialogValue(event.target.value); setDialogError(""); }}
                  placeholder="https://example.com"
                  autoComplete="url"
                  spellCheck="false"
                  required
                />
              </label>
            : <div className="field">
                <span>Choose text color</span>
                <div className="rich-editor-color-row">
                  <input
                    type="color"
                    className="rich-editor-color-swatch"
                    value={/^#[0-9a-f]{6}$/i.test(dialogValue) ? dialogValue : "#365b43"}
                    onChange={event => { setDialogValue(event.target.value); setDialogError(""); }}
                    aria-label="Choose a text color"
                  />
                  <input
                    type="text"
                    className="rich-editor-color-hex"
                    value={dialogValue}
                    onChange={event => { setDialogValue(event.target.value); setDialogError(""); }}
                    aria-label="HEX color value"
                    maxLength={7}
                    spellCheck="false"
                  />
                </div>
              </div>}
          {dialogError && <div className="form-error rich-editor-dialog-error" role="alert">{dialogError}</div>}
          <div className="modal-actions">
            <button type="button" className="button button-ghost" onClick={cancelDialog}>Cancel</button>
            <button type="button" className="button button-primary" onClick={submitDialog}>{dialogType === "link" ? "Insert link" : "Apply color"}</button>
          </div>
        </div>
      </section>
    </div>}
  </div>;
}
