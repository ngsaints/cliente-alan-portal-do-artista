/** Formatting shared by the campaign preview and delivery. */
export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function emailUrl(value: string, baseUrl: string, image = false): string | null {
  try {
    const url = new URL(value.trim(), baseUrl);
    if (!["https:", "http:", ...(image ? [] : ["mailto:"])].includes(url.protocol)) return null;
    return escapeEmailHtml(url.href);
  } catch { return null; }
}

export function renderMarketingText(text: string, baseUrl: string, name?: string): string {
  const inline = (source: string): string => {
    // Parse images and links together, before emphasis, so image syntax cannot become a link.
    const tokens = /(!?\[([^\]]*)\]\(([^)]+)\))/g;
    let result = "", last = 0;
    const format = (value: string) => escapeEmailHtml(value)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/\{\{(?:nome|name)\}\}/g, () => name === undefined ? "{{nome}}" : escapeEmailHtml(name))
      .replace(/\n/g, "<br />");
    for (const match of source.matchAll(tokens)) {
      result += format(source.slice(last, match.index));
      const image = match[1].startsWith("!");
      const url = emailUrl(match[3], baseUrl, image);
      const label = format(match[2]);
      result += !url ? label : image
        ? `<img src="${url}" alt="${escapeEmailHtml(match[2])}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:12px;margin:18px 0;" />`
        : `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#b8860b;text-decoration:underline;font-weight:600;">${label}</a>`;
      last = match.index! + match[0].length;
    }
    return result + format(source.slice(last));
  };
  return text.split(/\n\s*\n/).map(block => {
    const value = block.trim();
    if (!value) return "";
    if (/^#{1,2} /.test(value)) return `<h2 style="margin:0 0 18px;color:#181818;font-size:24px;line-height:1.3;font-weight:700;">${inline(value.replace(/^#{1,2} /, ""))}</h2>`;
    return `<div style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#454545;">${inline(value)}</div>`;
  }).join("");
}

export function wrapMarketingEmail(content: string): string {
  return `<div style="background:#111111;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;margin:0 auto;border-collapse:separate;">
      <tr><td style="background:#1c1c1c;border-top:4px solid #f5c518;padding:26px 24px;border-radius:16px 16px 0 0;">
        <div style="color:#f5c518;font-size:11px;font-weight:700;letter-spacing:3px;">MÚSICA. IDENTIDADE. CONEXÃO.</div>
        <div style="color:#ffffff;font-size:25px;font-weight:700;margin-top:10px;">Portal do <span style="color:#f5c518;">Artista</span></div>
      </td></tr>
      <tr><td style="background:#ffffff;padding:28px 24px;overflow-wrap:anywhere;">${content}</td></tr>
      <tr><td style="background:#1c1c1c;color:#a3a3a3;padding:22px 24px;border-radius:0 0 16px 16px;font-size:11px;line-height:1.7;text-align:center;">
        <strong style="color:#f5c518;">Sua música merece ser ouvida.</strong><br />Você está recebendo este e-mail porque está cadastrado no Portal do Artista.
      </td></tr>
    </table>
  </div>`;
}
