import type { Sale } from "../types/index";

// ============================================================
//  Format A4 — facture professionnelle complète
// ============================================================
function buildA4(invoice: Sale, shopName: string, logoUrl?: string): string {
  const num = invoice.invoiceNumber || `FAC-${String(invoice.id).padStart(5, "0")}`;
  const date = new Date(invoice.createdAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const clientName = invoice.client?.name || invoice.customerName || "Client non précisé";
  const clientPhone = invoice.client?.phone || "";
  const clientAddress = (invoice.client as any)?.address || "";

  const statusColor = invoice.status === "PAID" ? "#059669" : invoice.status === "PARTIAL" ? "#d97706" : "#dc2626";
  const statusBg    = invoice.status === "PAID" ? "#d1fae5" : invoice.status === "PARTIAL" ? "#fef3c7" : "#fee2e2";
  const statusText  = invoice.status === "PAID" ? "PAYÉE" : invoice.status === "PARTIAL" ? "PARTIELLE" : "NON RÉGLÉE";

  const itemRows = invoice.items.map((item, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    const imgHtml = item.productImageUrl
      ? `<img src="${item.productImageUrl}" alt="${item.productName}"
           style="width:42px;height:42px;object-fit:cover;border-radius:8px;margin-right:12px;
           vertical-align:middle;border:1px solid #e2e8f0;display:inline-block;flex-shrink:0" />`
      : `<span style="display:inline-flex;align-items:center;justify-content:center;
           width:42px;height:42px;background:#e2e8f0;border-radius:8px;margin-right:12px;
           font-weight:700;color:#94a3b8;font-size:18px;flex-shrink:0">
           ${item.productName.charAt(0).toUpperCase()}</span>`;
    return `
      <tr style="background:${bg}">
        <td style="padding:12px 16px;vertical-align:middle">
          <div style="display:flex;align-items:center">
            ${imgHtml}
            <span style="font-weight:500;color:#0f172a">${item.productName}</span>
          </div>
        </td>
        <td style="padding:12px 16px;text-align:center;color:#64748b">${item.quantity}</td>
        <td style="padding:12px 16px;text-align:right;color:#64748b;white-space:nowrap">
          ${item.unitPrice.toLocaleString("fr-FR")} FCFA
        </td>
        <td style="padding:12px 16px;text-align:right;font-weight:600;color:#0f172a;white-space:nowrap">
          ${item.totalAmount.toLocaleString("fr-FR")} FCFA
        </td>
      </tr>`;
  }).join("");

  const paymentRows = invoice.payments.map((p) => `
    <tr>
      <td style="padding:8px 16px;font-size:13px;color:#475569">
        ${new Date(p.paidAt).toLocaleString("fr-FR")}
      </td>
      <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#059669;text-align:right;white-space:nowrap">
        +${p.amount.toLocaleString("fr-FR")} FCFA
      </td>
      <td style="padding:8px 16px;font-size:13px;color:#94a3b8">${p.note || "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${num} — ${shopName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #0f172a; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body style="max-width:820px;margin:0 auto;padding:0">

  <!-- Header -->
  <div style="background:#0f172a;color:white;padding:30px 36px;display:flex;justify-content:space-between;
    align-items:flex-start;border-radius:0 0 20px 20px;margin-bottom:22px">
    <div style="display:flex;align-items:center;gap:16px">
      ${logoUrl ? `<img src="${logoUrl}" alt="${shopName}" style="height:52px;width:52px;object-fit:contain;background:white;border-radius:10px;padding:4px" />` : ""}
      <div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px">${shopName}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:5px;
          text-transform:uppercase;letter-spacing:1.5px">Jokko Business — Gestion Commerciale</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;
        letter-spacing:1.5px;margin-bottom:5px">Facture</div>
      <div style="font-size:21px;font-weight:700">${num}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">${date}</div>
      <div style="margin-top:9px;display:inline-block;background:${statusBg};color:${statusColor};
        padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px">
        ${statusText}
      </div>
    </div>
  </div>

  <!-- Client + Boutique -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 36px 22px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;
        font-weight:700;margin-bottom:9px">Client</div>
      <div style="font-size:15px;font-weight:700">${clientName}</div>
      ${clientPhone ? `<div style="font-size:13px;color:#64748b;margin-top:3px">📞 ${clientPhone}</div>` : ""}
      ${clientAddress ? `<div style="font-size:13px;color:#64748b;margin-top:2px">📍 ${clientAddress}</div>` : ""}
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#4ade80;
        font-weight:700;margin-bottom:9px">Boutique</div>
      <div style="font-size:15px;font-weight:700">${shopName}</div>
      <div style="font-size:13px;color:#64748b;margin-top:3px">Jokko Business</div>
    </div>
  </div>

  <!-- Articles -->
  <div style="padding:0 36px 22px">
    <table style="width:100%;border-collapse:collapse;border-radius:14px;overflow:hidden;
      border:1px solid #e2e8f0">
      <thead>
        <tr style="background:#0f172a;color:white">
          <th style="padding:12px 16px;text-align:left;font-size:11px;text-transform:uppercase;
            letter-spacing:0.5px;font-weight:600">Désignation</th>
          <th style="padding:12px 16px;text-align:center;font-size:11px;text-transform:uppercase;
            letter-spacing:0.5px;font-weight:600">Qté</th>
          <th style="padding:12px 16px;text-align:right;font-size:11px;text-transform:uppercase;
            letter-spacing:0.5px;font-weight:600">Prix unit.</th>
          <th style="padding:12px 16px;text-align:right;font-size:11px;text-transform:uppercase;
            letter-spacing:0.5px;font-weight:600">Montant</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <!-- Totaux -->
  <div style="padding:0 36px 22px;display:flex;justify-content:flex-end">
    <div style="width:290px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="padding:11px 16px;display:flex;justify-content:space-between;
        border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;background:#f8fafc">
        <span>Sous-total</span>
        <span>${invoice.totalAmount.toLocaleString("fr-FR")} FCFA</span>
      </div>
      <div style="padding:11px 16px;display:flex;justify-content:space-between;
        border-bottom:1px solid #e2e8f0;font-size:13px;color:#059669;font-weight:600;background:#f0fdf4">
        <span>Montant payé</span>
        <span>+${invoice.paidAmount.toLocaleString("fr-FR")} FCFA</span>
      </div>
      ${invoice.remaining > 0 ? `
      <div style="padding:11px 16px;display:flex;justify-content:space-between;
        border-bottom:1px solid #e2e8f0;font-size:13px;color:#dc2626;font-weight:600;background:#fff5f5">
        <span>Reste à payer</span>
        <span>${invoice.remaining.toLocaleString("fr-FR")} FCFA</span>
      </div>` : ""}
      <div style="padding:15px 16px;display:flex;justify-content:space-between;
        background:#0f172a;color:white">
        <span style="font-size:14px;font-weight:700">TOTAL</span>
        <span style="font-size:18px;font-weight:800">
          ${invoice.totalAmount.toLocaleString("fr-FR")} FCFA
        </span>
      </div>
    </div>
  </div>

  ${invoice.payments.length > 0 ? `
  <!-- Historique paiements -->
  <div style="padding:0 36px 22px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;
      font-weight:700;margin-bottom:10px">Historique des paiements</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;
      border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:9px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Date</th>
          <th style="padding:9px 16px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Montant</th>
          <th style="padding:9px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Note</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>` : ""}

  ${invoice.note ? `
  <div style="padding:0 36px 22px">
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#92400e;
        font-weight:700;margin-bottom:5px">Note</div>
      <div style="font-size:13px;color:#78350f">${invoice.note}</div>
    </div>
  </div>` : ""}

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:2px solid #10b981;padding:16px 36px;
    display:flex;justify-content:space-between;align-items:center;margin-top:8px">
    <div style="font-size:13px;font-weight:600;color:#0f172a">Merci pour votre confiance !</div>
    <div style="font-size:11px;color:#94a3b8">
      ${shopName} — Propulsé par <strong style="color:#10b981">Jokko Business</strong>
    </div>
  </div>

</body></html>`;
}

// ============================================================
//  Format Thermique — ticket de caisse 80mm
//  Compatible imprimantes thermiques POS (Epson, Bixolon, etc.)
// ============================================================
function buildThermal(invoice: Sale, shopName: string): string {
  const num = invoice.invoiceNumber || `FAC-${String(invoice.id).padStart(5, "0")}`;
  const date = new Date(invoice.createdAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const clientName = invoice.client?.name || invoice.customerName || "Client";
  const clientPhone = invoice.client?.phone || "";

  const statusText = invoice.status === "PAID" ? "** SOLDEE **"
    : invoice.status === "PARTIAL" ? "** PARTIELLE **"
    : "** NON REGLEE **";

  // Ligne séparatrice
  const sep = "--------------------------------";
  const sepDouble = "================================";

  // Fonction pour aligner deux colonnes sur 32 chars
  const line = (left: string, right: string, width = 32): string => {
    const maxLeft = width - right.length - 1;
    const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
    const spaces = " ".repeat(Math.max(1, width - l.length - right.length));
    return `${l}${spaces}${right}`;
  };

  // Articles
  const itemLines = invoice.items.map((item) => {
    const name = item.productName.length > 26 ? item.productName.slice(0, 26) : item.productName;
    const total = `${item.totalAmount.toLocaleString("fr-FR")} F`;
    const detail = `  ${item.quantity} x ${item.unitPrice.toLocaleString("fr-FR")} F`;
    return `${name}\n${line(detail, total)}`;
  }).join("\n");

  // Paiements
  const paymentLines = invoice.payments.length > 0
    ? invoice.payments.map((p) => {
        const d = new Date(p.paidAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        return line(`  ${d}`, `+${p.amount.toLocaleString("fr-FR")} F`);
      }).join("\n")
    : "";

  const receipt = [
    sepDouble,
    shopName.toUpperCase().padStart(Math.floor((32 + shopName.length) / 2)).slice(0, 32),
    "Jokko Business".padStart(Math.floor((32 + 14) / 2)).slice(0, 32),
    sepDouble,
    "",
    `Facture : ${num}`,
    `Date    : ${date}`,
    `Client  : ${clientName}`,
    clientPhone ? `Tel     : ${clientPhone}` : null,
    sep,
    "ARTICLES",
    sep,
    itemLines,
    sep,
    line("TOTAL", `${invoice.totalAmount.toLocaleString("fr-FR")} F`),
    line("PAYE", `${invoice.paidAmount.toLocaleString("fr-FR")} F`),
    invoice.remaining > 0
      ? line("RESTE DU", `${invoice.remaining.toLocaleString("fr-FR")} F`)
      : null,
    sep,
    statusText.padStart(Math.floor((32 + statusText.length) / 2)).slice(0, 32),
    invoice.payments.length > 0 ? sep : null,
    invoice.payments.length > 0 ? "VERSEMENTS" : null,
    invoice.payments.length > 0 ? sep : null,
    invoice.payments.length > 0 ? paymentLines : null,
    invoice.note ? sep : null,
    invoice.note ? `Note: ${invoice.note}` : null,
    sep,
    "Merci pour votre confiance !".padStart(Math.floor((32 + 28) / 2)).slice(0, 32),
    sepDouble,
    "",
    "",  // Espace pour découpe
  ].filter((l) => l !== null).join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ticket ${num}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #000;
    background: #fff;
    /* Largeur ticket 80mm = ~302px — on cible 72mm pour marges internes */
    width: 72mm;
    margin: 0 auto;
    padding: 4mm 0;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.55;
  }
  @page {
    size: 80mm auto;
    margin: 0;
  }
  @media print {
    body {
      width: 72mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
<pre>${receipt}</pre>
</body>
</html>`;
}

// ============================================================
//  Export principal — choisir le format
// ============================================================
export function printInvoice(
  invoice: Sale,
  shopName: string,
  format: "A4" | "THERMAL" = "A4",
  logoUrl?: string
) {
  const html = format === "THERMAL"
    ? buildThermal(invoice, shopName)
    : buildA4(invoice, shopName, logoUrl);

  const w = window.open("", "_blank");
  if (!w) {
    alert("Autorisez les popups pour imprimer.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
}