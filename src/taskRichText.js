import sanitizeHtml from "sanitize-html";

const TASK_DESCRIPTION_TAGS = [
  "a", "b", "blockquote", "br", "caption", "code", "del", "div", "em",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "li", "mark",
  "ol", "p", "pre", "s", "span", "strong", "sub", "sup", "table",
  "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"
];

const COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,24})$/i;
const TASK_DESCRIPTION_OPTIONS = {
  allowedTags: TASK_DESCRIPTION_TAGS,
  allowedAttributes: {
    "*": ["style"],
    a: ["href", "target", "rel"],
    ol: ["start", "type"],
    td: ["colspan", "rowspan", "align"],
    th: ["colspan", "rowspan", "align"],
    table: ["border", "cellpadding", "cellspacing"]
  },
  allowedStyles: {
    "*": {
      color: [COLOR],
      "background-color": [COLOR],
      "font-weight": [/^(?:normal|bold|[1-9]00)$/i],
      "font-style": [/^(?:normal|italic|oblique)$/i],
      "text-decoration": [/^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/i],
      "text-align": [/^(?:left|center|right|justify)$/i],
      "font-size": [/^\d{1,3}(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      "list-style-type": [/^(?:disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/i]
    }
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer"
      }
    })
  }
};

export function sanitizeTaskDescription(value) {
  return sanitizeHtml(String(value ?? ""), TASK_DESCRIPTION_OPTIONS).trim();
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);
      return Number.isFinite(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const number = Number.parseInt(code, 16);
      return Number.isFinite(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    });
}

function richHtmlToText(value, { whatsapp = false } = {}) {
  let html = sanitizeTaskDescription(value);

  html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attributes, label) => {
    const href = attributes.match(/\bhref="([^"]*)"/i)?.[1];
    const visibleLabel = label.replace(/<[^>]*>/g, "");
    const url = href ? decodeHtmlEntities(href) : "";
    return url && url !== visibleLabel ? `${visibleLabel} (${url})` : visibleLabel || url;
  });

  if (whatsapp) {
    html = html
      .replace(/<(?:h[1-6])\b[^>]*>/gi, "\n*")
      .replace(/<\/(?:h[1-6])>/gi, "*\n\n")
      .replace(/<(?:strong|b)\b[^>]*>/gi, "*")
      .replace(/<\/(?:strong|b)>/gi, "*")
      .replace(/<(?:em|i)\b[^>]*>/gi, "_")
      .replace(/<\/(?:em|i)>/gi, "_")
      .replace(/<(?:s|del)\b[^>]*>/gi, "~")
      .replace(/<\/(?:s|del)>/gi, "~")
      .replace(/<mark\b[^>]*>/gi, "*")
      .replace(/<\/mark>/gi, "*");
  } else {
    html = html.replace(/<\/?(?:h[1-6]|strong|b|em|i|s|del|mark)\b[^>]*>/gi, "");
  }

  html = html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, whatsapp ? "\n• " : "\n• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<blockquote\b[^>]*>/gi, "\n> ")
    .replace(/<\/blockquote>/gi, "\n")
    .replace(/<\/(?:p|div|pre|tr|ul|ol|table|thead|tbody|tfoot)>/gi, "\n")
    .replace(/<(?:p|div|pre|tr|ul|ol|table|thead|tbody|tfoot)\b[^>]*>/gi, "")
    .replace(/<t[dh]\b[^>]*>/gi, " | ")
    .replace(/<\/t[dh]>/gi, "")
    .replace(/<[^>]*>/g, "");

  return decodeHtmlEntities(html)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function taskDescriptionToPlainText(value) {
  return richHtmlToText(value);
}

export function taskDescriptionToWhatsApp(value, maxLength = 700) {
  const text = richHtmlToText(value, { whatsapp: true });
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  const suffix = "\n… Open TaskXVS to read the full description.";
  const keep = Math.max(0, maxLength - Array.from(suffix).length);
  return characters.slice(0, keep).join("").trimEnd() + suffix;
}
