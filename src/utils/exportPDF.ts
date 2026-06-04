import type { CashRegister, CashTransaction, Sale } from "../types/index";

const fmtAmount = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("fr-FR", {
  hour: "2-digit", minute: "2-digit",
});

// ── Rapport de caisse journalier en PDF ───────────────────────
export function exportCashReportPDF(session: CashRegister, shopName: string) {
  const balance = session.closingAmount
    ?? (session.openingAmount + session.totalIn - session.totalOut);

  const transactions = session.transactions || [];
  const entrances = transactions.filter((t) => t.type === "IN");
  const exits = transactions.filter((t) => t.type === "OUT");

  // Lignes transactions
  const txRows = transactions.map((t: CashTransaction) => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px 12px;font-size:13px;color:#475569">${fmtTime(t.createdAt)}</td>
      <td style="padding:8px 12px;font-size:13px">${t.label}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:600;color:${t.type === "IN" ? "#059669" : "#dc2626"}">
        ${t.type === "IN" ? "+" : "-"}${fmtAmount(t.amount)}
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Caisse — ${fmtDate(session.openedAt)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; }
  @page { size: A4; margin: 15mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body style="max-width:780px;margin:0 auto;padding:0">

  <!-- Header -->
  <div style="background:#0f172a;color:white;padding:28px 36px;border-radius:0 0 20px 20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:22px;font-weight:800">${shopName}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;text-transform:uppercase;letter-spacing:1px">Rapport de caisse journalier</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:600">${fmtDate(session.openedAt)}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:3px">
        ${fmtTime(session.openedAt)} → ${session.closedAt ? fmtTime(session.closedAt) : "En cours"}
      </div>
      <div style="margin-top:8px;display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;
        background:${session.status === "CLOSED" ? "#d1fae5" : "#fef3c7"};
        color:${session.status === "CLOSED" ? "#065f46" : "#92400e"}">
        ${session.status === "CLOSED" ? "Clôturée" : "En cours"}
      </div>
    </div>
  </div>

  <!-- Stats résumé -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 36px 24px">
    ${[
      { label: "Ouverture", value: fmtAmount(session.openingAmount), color: "#f8fafc", border: "#e2e8f0", text: "#0f172a" },
      { label: "Encaissements", value: fmtAmount(session.totalIn), color: "#f0fdf4", border: "#bbf7d0", text: "#059669" },
      { label: "Décaissements", value: fmtAmount(session.totalOut), color: "#fff5f5", border: "#fecaca", text: "#dc2626" },
      { label: "Clôture", value: fmtAmount(balance), color: "#0f172a", border: "#0f172a", text: "#ffffff" },
    ].map(s => `
      <div style="background:${s.color};border:1px solid ${s.border};border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${s.text === "#ffffff" ? "rgba(255,255,255,0.6)" : "#94a3b8"};margin-bottom:6px">${s.label}</div>
        <div style="font-size:15px;font-weight:700;color:${s.text}">${s.value}</div>
      </div>`).join("")}
  </div>

  <!-- Statistiques détaillées -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 36px 24px">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4ade80;font-weight:700;margin-bottom:10px">
        Encaissements (${entrances.length} opération${entrances.length > 1 ? "s" : ""})
      </div>
      ${entrances.length === 0
        ? `<p style="font-size:13px;color:#94a3b8">Aucun encaissement</p>`
        : entrances.map(t => `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
            <span style="color:#475569">${t.label}</span>
            <span style="font-weight:600;color:#059669">+${fmtAmount(t.amount)}</span>
          </div>`).join("")}
    </div>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:14px;padding:16px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f87171;font-weight:700;margin-bottom:10px">
        Décaissements (${exits.length} opération${exits.length > 1 ? "s" : ""})
      </div>
      ${exits.length === 0
        ? `<p style="font-size:13px;color:#94a3b8">Aucun décaissement</p>`
        : exits.map(t => `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
            <span style="color:#475569">${t.label}</span>
            <span style="font-weight:600;color:#dc2626">-${fmtAmount(t.amount)}</span>
          </div>`).join("")}
    </div>
  </div>

  <!-- Toutes les transactions -->
  ${transactions.length > 0 ? `
  <div style="padding:0 36px 24px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:12px">
      Détail des ${transactions.length} transaction${transactions.length > 1 ? "s" : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Heure</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Libellé</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Montant</th>
        </tr>
      </thead>
      <tbody>${txRows}</tbody>
    </table>
  </div>` : ""}

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:2px solid #10b981;padding:16px 36px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:12px;color:#64748b">
      Rapport généré le ${new Date().toLocaleString("fr-FR")}
      ${session.user?.name ? ` · Géré par ${(session.user as any).name}` : ""}
    </div>
    <div style="font-size:11px;color:#94a3b8">
      ${shopName} · <strong style="color:#10b981">Jokko Business</strong>
    </div>
  </div>

</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les popups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

// ── Rapport des ventes en PDF ─────────────────────────────────
export function exportSalesPDF(sales: Sale[], shopName: string, period?: string) {
  const totalCA = sales.reduce((s, v) => s + v.totalAmount, 0);
  const totalPaid = sales.reduce((s, v) => s + v.paidAmount, 0);
  const totalRemaining = sales.reduce((s, v) => s + v.remaining, 0);

  const rows = sales.map((sale, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    const statusColor = sale.status === "PAID" ? "#059669" : sale.status === "PARTIAL" ? "#d97706" : "#dc2626";
    const statusLabel = sale.status === "PAID" ? "Payée" : sale.status === "PARTIAL" ? "Partielle" : "Non réglée";
    return `
      <tr style="background:${bg}">
        <td style="padding:9px 12px;font-size:12px;font-weight:600">${sale.invoiceNumber || `#${sale.id}`}</td>
        <td style="padding:9px 12px;font-size:12px;color:#475569">${new Date(sale.createdAt).toLocaleDateString("fr-FR")}</td>
        <td style="padding:9px 12px;font-size:12px">${sale.client?.name || sale.customerName || "—"}</td>
        <td style="padding:9px 12px;font-size:12px;text-align:right">${fmtAmount(sale.totalAmount)}</td>
        <td style="padding:9px 12px;font-size:12px;text-align:right;color:#059669">${fmtAmount(sale.paidAmount)}</td>
        <td style="padding:9px 12px;font-size:12px;text-align:right;color:#dc2626">${sale.remaining > 0 ? fmtAmount(sale.remaining) : "—"}</td>
        <td style="padding:9px 12px;text-align:center">
          <span style="background:${statusColor}20;color:${statusColor};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">${statusLabel}</span>
        </td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Ventes — ${shopName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; }
  @page { size: A4; margin: 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body style="max-width:780px;margin:0 auto">

  <div style="background:#0f172a;color:white;padding:26px 36px;border-radius:0 0 20px 20px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:22px;font-weight:800">${shopName}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;text-transform:uppercase;letter-spacing:1px">Rapport des ventes${period ? ` — ${period}` : ""}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:rgba(255,255,255,0.6)">
      Généré le ${new Date().toLocaleDateString("fr-FR")}<br/>
      ${sales.length} vente${sales.length > 1 ? "s" : ""}
    </div>
  </div>

  <!-- Stats -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 36px 22px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Chiffre d'affaires</div>
      <div style="font-size:17px;font-weight:700">${fmtAmount(totalCA)}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:10px;color:#4ade80;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Encaissé</div>
      <div style="font-size:17px;font-weight:700;color:#059669">${fmtAmount(totalPaid)}</div>
    </div>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Reste à encaisser</div>
      <div style="font-size:17px;font-weight:700;color:#dc2626">${fmtAmount(totalRemaining)}</div>
    </div>
  </div>

  <!-- Tableau ventes -->
  <div style="padding:0 36px 24px">
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
      <thead>
        <tr style="background:#0f172a;color:white">
          <th style="padding:11px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Facture</th>
          <th style="padding:11px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Date</th>
          <th style="padding:11px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Client</th>
          <th style="padding:11px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Total</th>
          <th style="padding:11px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Payé</th>
          <th style="padding:11px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Reste</th>
          <th style="padding:11px 12px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Statut</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div style="background:#f8fafc;border-top:2px solid #10b981;padding:14px 36px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:12px;color:#64748b">Rapport généré le ${new Date().toLocaleString("fr-FR")}</div>
    <div style="font-size:11px;color:#94a3b8">${shopName} · <strong style="color:#10b981">Jokko Business</strong></div>
  </div>

</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les popups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}