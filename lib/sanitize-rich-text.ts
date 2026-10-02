import sanitizeHtml from "sanitize-html"

const BASE_TAGS = [
  "p", "br", "strong", "em", "u", "s",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
]

const BASE_ATTRIBUTES: Record<string, string[]> = {
  p: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  table: ["style"],
  col: ["style"],
  td: ["style", "colspan", "rowspan", "data-colwidth"],
  th: ["style", "colspan", "rowspan", "data-colwidth"],
}

const ALLOWED_STYLES = {
  "*": {
    "text-align": [/^(left|center|right|justify)$/],
    "padding-left": [/^\d{1,3}px$/],
    "min-width": [/^\d{1,4}px$/],
    width: [/^\d{1,4}px$/],
  },
}

// Teks biasa (Text Box template rapor): tanpa gambar, script, dan link
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: BASE_TAGS,
    allowedAttributes: BASE_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
  })
}

// Hanya gambar dari http(s) atau data URI gambar (png/jpg/gif/webp) yang boleh lewat
const SAFE_IMG_SRC = /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i

export function sanitizeQuestionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...BASE_TAGS, "blockquote", "code", "pre", "hr", "img", "span"],
    allowedAttributes: {
      ...BASE_ATTRIBUTES,
      img: ["src", "alt", "title"],
      span: ["data-type", "data-latex"],
    },
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !SAFE_IMG_SRC.test(frame.attribs.src ?? ""),
  })
}