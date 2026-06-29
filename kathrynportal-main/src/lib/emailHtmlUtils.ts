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
