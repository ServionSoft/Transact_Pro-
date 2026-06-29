/** Strip script tags and on* handlers for displaying user-composed HTML in history. */
export function sanitizeEmailHtmlForDisplay(html: string): string {
  if (!html.trim()) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function emailBodyLooksLikeHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

export function plainTextFromEmailHtml(html: string): string {
  if (!html.trim()) return "";
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent ?? el.innerText ?? "").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const EMAIL_BODY_COLLAPSE_CHAR_LIMIT = 280;
const EMAIL_BODY_COLLAPSE_LINE_LIMIT = 4;

export function emailBodyLooksLong(body: string): boolean {
  const text = emailBodyLooksLikeHtml(body) ? plainTextFromEmailHtml(body) : body.trim();
  if (!text) return false;
  if (text.length > EMAIL_BODY_COLLAPSE_CHAR_LIMIT) return true;
  return text.split(/\n/).filter((line) => line.trim()).length > EMAIL_BODY_COLLAPSE_LINE_LIMIT;
}
