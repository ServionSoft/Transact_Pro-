/**
 * Split on top-level `;` so nested parens in ENUM/CHECK are safe.
 * Also skips `;` inside dollar-quoted strings (`$tag$ … $tag$`, `$$ … $$`).
 */
export function splitSqlStatements(sql: string): string[] {
  const trimmed = sql.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let dollarClose: string | null = null;

  for (let i = 0; i < trimmed.length; i++) {
    if (dollarClose !== null) {
      if (trimmed.startsWith(dollarClose, i)) {
        i += dollarClose.length - 1;
        dollarClose = null;
      }
      continue;
    }

    const c = trimmed[i];
    if (c === "$") {
      const rest = trimmed.slice(i);
      const m = /^\$([A-Za-z0-9_]*)\$/.exec(rest);
      if (m) {
        const tag = m[1] ?? "";
        dollarClose = `$${tag}$`;
        i += m[0].length - 1;
        continue;
      }
    }

    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) {
      const stmt = trimmed.slice(start, i + 1).trim();
      if (stmt) parts.push(stmt);
      start = i + 1;
    }
  }
  const tail = trimmed.slice(start).trim();
  if (tail) parts.push(tail);
  if (dollarClose !== null) {
    throw new Error(`Unterminated dollar-quoted string (expected closing ${dollarClose})`);
  }
  return parts;
}
