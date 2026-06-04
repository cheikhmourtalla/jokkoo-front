import * as XLSX from "xlsx";
import type { Sale, StockMovement, Client, Supplier } from "../types/index";

// ── Helper formatage date ─────────────────────────────────────
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");
const fmtDateTime = (d: string) => new Date(d).toLocaleString("fr-FR");
const fmtAmount = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

// ── Export ventes ─────────────────────────────────────────────
export function exportSalesToExcel(sales: Sale[], shopName: string) {
  const rows = sales.flatMap((sale) =>
    sale.items.map((item) => ({
      "N° Facture": sale.invoiceNumber || `#${sale.id}`,
      "Date": fmtDateTime(sale.createdAt),
      "Client": sale.client?.name || sale.customerName || "Client non précisé",
      "Téléphone client": sale.client?.phone || "",
      "Produit": item.productName,
      "Quantité": item.quantity,
      "Prix unitaire (FCFA)": item.unitPrice,
      "Montant article (FCFA)": item.totalAmount,
      "Total facture (FCFA)": sale.totalAmount,
      "Montant payé (FCFA)": sale.paidAmount,
      "Reste à payer (FCFA)": sale.remaining,
      "Statut": sale.status === "PAID" ? "Payée"
        : sale.status === "PARTIAL" ? "Partielle"
        : "Non réglée",
      "Note": sale.note || "",
    }))
  );

  // Ligne de totaux
  const totalCA = sales.reduce((s, v) => s + v.totalAmount, 0);
  const totalPaid = sales.reduce((s, v) => s + v.paidAmount, 0);
  const totalRemaining = sales.reduce((s, v) => s + v.remaining, 0);

  rows.push({} as any); // ligne vide
  rows.push({
    "N° Facture": "TOTAL",
    "Date": "",
    "Client": `${sales.length} vente(s)`,
    "Téléphone client": "",
    "Produit": "",
    "Quantité": sales.reduce((s, v) => s + v.items.reduce((a, i) => a + i.quantity, 0), 0),
    "Prix unitaire (FCFA)": 0,
    "Montant article (FCFA)": 0,
    "Total facture (FCFA)": totalCA,
    "Montant payé (FCFA)": totalPaid,
    "Reste à payer (FCFA)": totalRemaining,
    "Statut": "",
    "Note": "",
  } as any);

  const ws = XLSX.utils.json_to_sheet(rows);

  // Largeurs colonnes
  ws["!cols"] = [
    { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 15 },
    { wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 20 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventes");

  // Feuille résumé
  const summary = [
    ["Rapport des ventes — " + shopName],
    ["Généré le", fmtDateTime(new Date().toISOString())],
    [""],
    ["Nombre de ventes", sales.length],
    ["Chiffre d'affaires total", fmtAmount(totalCA)],
    ["Montant encaissé", fmtAmount(totalPaid)],
    ["Reste à encaisser", fmtAmount(totalRemaining)],
    ["Ventes payées", sales.filter((s) => s.status === "PAID").length],
    ["Ventes partielles", sales.filter((s) => s.status === "PARTIAL").length],
    ["Ventes non réglées", sales.filter((s) => s.status === "UNPAID").length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `ventes_${shopName}_${date}.xlsx`);
}

// ── Export stock (mouvements) ─────────────────────────────────
export function exportStockToExcel(movements: StockMovement[], shopName: string) {
  const typeLabel: Record<string, string> = {
    ENTRY: "Entrée", OUT: "Sortie", SALE: "Vente", ADJUST: "Ajustement",
  };

  const rows = movements.map((m) => ({
    "Date": fmtDateTime(m.createdAt),
    "Produit": m.product?.name || "-",
    "Type": typeLabel[m.type] || m.type,
    "Quantité": m.type === "OUT" || m.type === "SALE" ? -m.quantity : m.quantity,
    "Coût unitaire (FCFA)": m.unitCost || "",
    "Fournisseur": (m.supplier as any)?.name || "",
    "Utilisateur": m.user?.name || "",
    "Note": m.note || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 10 },
    { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mouvements stock");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `stock_${shopName}_${date}.xlsx`);
}

// ── Export clients ────────────────────────────────────────────
export function exportClientsToExcel(clients: Client[], shopName: string) {
  const rows = clients.map((c) => ({
    "Nom": c.name,
    "Téléphone": c.phone,
    "Email": c.email || "",
    "Adresse": c.address || "",
    "Total achats (FCFA)": c.totalPurchases || 0,
    "Total payé (FCFA)": c.totalPaid || 0,
    "Reste à payer (FCFA)": c.totalRemaining || 0,
    "Statut": (c.totalRemaining || 0) > 0 ? "Débiteur" : "À jour",
    "Membre depuis": fmtDate(c.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 22 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `clients_${shopName}_${date}.xlsx`);
}

// ── Export fournisseurs ───────────────────────────────────────
export function exportSuppliersToExcel(suppliers: Supplier[], shopName: string) {
  const rows = suppliers.map((s) => ({
    "Nom": s.name,
    "Téléphone": s.phone || "",
    "Email": s.email || "",
    "Adresse": s.address || "",
    "Total achats (FCFA)": (s as any).totalPurchases || 0,
    "Total payé (FCFA)": (s as any).totalPaid || 0,
    "Reste dû (FCFA)": s.totalDebt || 0,
    "Statut": (s.totalDebt || 0) > 0 ? "Dette en cours" : "Soldé",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 22 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fournisseurs");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `fournisseurs_${shopName}_${date}.xlsx`);
}