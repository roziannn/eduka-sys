import sanitizeHtml from "sanitize-html"

// for secure purpose. hanya tag dan style yang dihasilkan editor teks yang diizinkan.
// Gambar, script, link, dan atribut event dibuang.
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      table: ["style"],
      col: ["style"],
      td: ["style", "colspan", "rowspan", "data-colwidth"],
      th: ["style", "colspan", "rowspan", "data-colwidth"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
        "padding-left": [/^\d{1,3}px$/],
        "min-width": [/^\d{1,4}px$/],
        width: [/^\d{1,4}px$/],
      },
    },
  })
}