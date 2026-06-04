import logo from "../assets/logo.jpg";

type InvoiceSale = {
  client: any;
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customer?: string | null;
  note?: string | null;
  createdAt: string;
  product?: {
    name: string;
    category?: string;
    reference?: string;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  sale: InvoiceSale | null;
};

export default function InvoiceModal({ open, onClose, sale }: Props) {
  if (!open || !sale) return null;

  const invoiceNumber = `FAC-${String(sale.id).padStart(5, "0")}`;
  const formattedDate = new Date(sale.createdAt).toLocaleString("fr-FR");

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/logo.png`;

    const printContent = `
      <html>
        <head>
          <title>Facture ${invoiceNumber} - SamaStock</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 32px;
              color: #0f172a;
              background: #ffffff;
            }

            .container {
              max-width: 900px;
              margin: 0 auto;
            }

            .topbar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              margin-bottom: 32px;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .brand img {
              width: 56px;
              height: 56px;
              object-fit: contain;
            }

            .brand h1 {
              margin: 0;
              font-size: 30px;
              font-weight: 700;
            }

            .brand p {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 14px;
            }

            .invoice-box {
              text-align: right;
            }

            .invoice-box h2 {
              margin: 0;
              font-size: 26px;
              font-weight: 700;
            }

            .invoice-box p {
              margin: 6px 0 0;
              color: #475569;
              font-size: 14px;
            }

            .section-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 28px;
            }

            .card {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 18px;
              background: #f8fafc;
            }

            .card-title {
              margin: 0 0 12px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #64748b;
              font-weight: 700;
            }

            .card p {
              margin: 6px 0;
              font-size: 14px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            thead th {
              text-align: left;
              font-size: 13px;
              color: #475569;
              border-bottom: 2px solid #e2e8f0;
              padding: 12px 10px;
              background: #f8fafc;
            }

            tbody td {
              padding: 14px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }

            .text-right {
              text-align: right;
            }

            .totals {
              margin-top: 24px;
              margin-left: auto;
              width: 320px;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }

            .grand-total {
              display: flex;
              justify-content: space-between;
              padding: 14px 0 0;
              font-size: 22px;
              font-weight: 700;
            }

            .note {
              margin-top: 28px;
              padding: 16px;
              border-radius: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
            }

            .note h3 {
              margin: 0 0 8px;
              font-size: 14px;
              color: #334155;
            }

            .note p {
              margin: 0;
              font-size: 14px;
              color: #475569;
            }

            .footer {
              margin-top: 36px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
            }

            @media print {
              body {
                padding: 0;
              }

              .container {
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="topbar">
              <div class="brand">
                <img src="${logoUrl}" alt="SamaStock" />
                <div>
                  <h1>SamaStock</h1>
                  <p>Gestion de stock intelligente</p>
                  <p>Dakar, Sénégal</p>
                </div>
              </div>

              <div class="invoice-box">
                <h2>FACTURE</h2>
                <p><strong>N° :</strong> ${invoiceNumber}</p>
                <p><strong>Date :</strong> ${formattedDate}</p>
              </div>
            </div>

            <div class="section-grid">
              <div class="card">
                <p class="card-title">Facturé par</p>
                <p><strong>SamaStock</strong></p>
                <p>Gestion de stock intelligente</p>
                <p>Email : admin@samastock.com</p>
              </div>

              <div class="card">
                <p class="card-title">Client</p>
                <p><strong>${sale.client?.name || sale.customer  || "Client non précisé"}</strong></p>
                <p>Date de la vente : ${formattedDate}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Référence</th>
                  <th>Catégorie</th>
                  <th class="text-right">Qté</th>
                  <th class="text-right">Prix unitaire</th>
                  <th class="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${sale.product?.name || "-"}</td>
                  <td>${sale.product?.reference || "-"}</td>
                  <td>${sale.product?.category || "-"}</td>
                  <td class="text-right">${sale.quantity}</td>
                  <td class="text-right">${sale.unitPrice.toLocaleString("fr-FR")} FCFA</td>
                  <td class="text-right">${sale.totalAmount.toLocaleString("fr-FR")} FCFA</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Sous-total</span>
                <span>${sale.totalAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div class="total-row">
                <span>TVA</span>
                <span>0 FCFA</span>
              </div>
              <div class="grand-total">
                <span>Total</span>
                <span>${sale.totalAmount.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            ${
              sale.note
                ? `
              <div class="note">
                <h3>Note</h3>
                <p>${sale.note}</p>
              </div>
            `
                : ""
            }

            <div class="footer">
              Merci pour votre confiance - SamaStock
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Facture disponible
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              La vente a été enregistrée. Vous pouvez imprimer la facture
              maintenant ou plus tard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-6">
          <div className="flex flex-col gap-6 border-b border-gray-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="SamaStock"
                className="h-14 w-14 object-contain"
              />
              <div>
                <h4 className="text-3xl font-bold text-slate-900">
                  SamaStock
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Gestion de stock intelligente
                </p>
                <p className="text-sm text-gray-500">Dakar, Sénégal</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Facture
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {invoiceNumber}
              </p>
              <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Facturé par
              </p>
              <p className="mt-2 font-semibold text-slate-900">SamaStock</p>
              <p className="text-sm text-gray-600">Gestion de stock</p>
              <p className="text-sm text-gray-600">admin@samastock.com</p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Client
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {sale.customer || "Client non précisé"}
              </p>
              <p className="text-sm text-gray-600">Date : {formattedDate}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Qté</th>
                  <th className="px-4 py-3">Prix unitaire</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {sale.product?.name || "-"}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {sale.product?.reference || "-"}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{sale.quantity}</td>
                  <td className="px-4 py-4 text-gray-600">
                    {sale.unitPrice.toLocaleString("fr-FR")} FCFA
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {sale.totalAmount.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-6 max-w-sm rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between border-b py-2 text-sm text-gray-600">
              <span>Sous-total</span>
              <span>{sale.totalAmount.toLocaleString("fr-FR")} FCFA</span>
            </div>

            <div className="flex items-center justify-between border-b py-2 text-sm text-gray-600">
              <span>TVA</span>
              <span>0 FCFA</span>
            </div>

            <div className="flex items-center justify-between pt-3 text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>{sale.totalAmount.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>

          {sale.note && (
            <div className="mt-6 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Note
              </p>
              <p className="mt-2 text-sm text-slate-700">{sale.note}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Imprimer la facture
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}