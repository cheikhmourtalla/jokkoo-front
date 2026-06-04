import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Printer, Search } from "lucide-react";
import { getSales, createSale, addSalePayment, deleteSale, getProducts, getClients, getCurrentCash, getSuggestedPrice } from "../services/index";
import { exportSalesToExcel } from "../utils/exportExcel";
import { exportSalesPDF } from "../utils/exportPDF";
import { Download } from "lucide-react";
import { printInvoice as doPrint } from "../utils/printInvoice";
import type { Sale, Product, Client } from "../types/index";
import { isAdmin } from "../types/auth";
import { getStoredUser } from "../types/auth";

const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

type CartItem = { productId: number; productName: string; quantity: number; unitPrice: number; stock: number };

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const admin = isAdmin();
  const user = getStoredUser();

  // Panier
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [priceTier, setPriceTier] = useState<"detail" | "semiWholesale" | "wholesale">("detail");
  const [priceSuggestion, setPriceSuggestion] = useState<string>("");
  const [clientId, setClientId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [note, setNote] = useState("");

  // Paiement partiel
  const [paymentSaleId, setPaymentSaleId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Facture
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [printMenuFor, setPrintMenuFor] = useState<number | null>(null);

  const checkCash = async () => {
    try {
      const res = await getCurrentCash();
      setCashOpen(res.open);
    } catch {
      setCashOpen(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, prods, cls] = await Promise.all([
        getSales({ status: statusFilter || undefined, page, limit: 5 }),
        getProducts({ limit: 100 }),
        getClients(),
      ]);
      setSales(salesRes.data);
      setTotal(salesRes.pagination.total);
      setTotalPages(salesRes.pagination.totalPages);
      setProducts(prods.data);
      setClients(cls);
    } catch { toast.error("Erreur chargement ventes"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    checkCash();
  }, [statusFilter, page]);

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleAddToCart = () => {
    if (!selectedProductId || selectedQty <= 0 || selectedPrice <= 0) {
      return toast.error("Sélectionnez un produit, une quantité et un prix valides");
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    if (selectedQty > product.quantity) {
      return toast.error(`Stock insuffisant (${product.quantity} disponibles)`);
    }
    const existing = cart.findIndex((c) => c.productId === selectedProductId);
    if (existing >= 0) {
      const updated = [...cart];
      updated[existing].quantity += selectedQty;
      updated[existing].unitPrice = selectedPrice;
      setCart(updated);
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        productName: product.name,
        quantity: selectedQty,
        unitPrice: selectedPrice,
        stock: product.quantity,
      }]);
    }
    setSelectedProductId(0);
    setSelectedQty(1);
    setSelectedPrice(0);
    setPriceTier("detail");
    setPriceSuggestion("");
  };

  const handleProductSelect = async (id: number) => {
    setSelectedProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) {
      setSelectedPrice(p.salePrice);
      setPriceTier("detail");
      setPriceSuggestion("");
      // Calculer le prix suggéré avec la quantité actuelle
      if (selectedQty > 1 && (p.semiWholesalePrice || p.wholesalePrice)) {
        try {
          const suggestion = await getSuggestedPrice(id, selectedQty);
          setSelectedPrice(suggestion.suggestedPrice);
          setPriceTier(suggestion.tier);
          updatePriceSuggestion(suggestion.tier, suggestion.tiers);
        } catch { /* silencieux */ }
      }
    }
  };

  const updatePriceSuggestion = (
    tier: "detail" | "semiWholesale" | "wholesale",
    tiers: any
  ) => {
    if (tier === "wholesale" && tiers.wholesale) {
      setPriceSuggestion(`Prix Gros appliqué (≥${tiers.wholesale.minQty} unités)`);
    } else if (tier === "semiWholesale" && tiers.semiWholesale) {
      setPriceSuggestion(`Prix Demi-gros appliqué (≥${tiers.semiWholesale.minQty} unités)`);
    } else {
      setPriceSuggestion("Prix Détail");
    }
  };

  // Recalculer le prix quand la quantité change
  const handleQtyChange = async (qty: number) => {
    setSelectedQty(qty);
    if (!selectedProductId || qty <= 0) return;
    const p = products.find((prod) => prod.id === selectedProductId);
    if (!p || (!p.semiWholesalePrice && !p.wholesalePrice)) return;
    try {
      const suggestion = await getSuggestedPrice(selectedProductId, qty);
      setSelectedPrice(suggestion.suggestedPrice);
      setPriceTier(suggestion.tier);
      updatePriceSuggestion(suggestion.tier, suggestion.tiers);
    } catch { /* silencieux */ }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashOpen) {
      return toast.error("⚠️ La caisse est fermée. Ouvrez la caisse avant d'enregistrer une vente.", { duration: 5000 });
    }
    if (!cart.length) return toast.error("Le panier est vide");
    if (!clientId && !customerName.trim()) return toast.error("Client ou nom du client requis");
    setSubmitting(true);
    try {
      const paid = paidAmount === "" ? cartTotal : Number(paidAmount);
      const res = await createSale({
        clientId: clientId ? Number(clientId) : null,
        customerName: customerName || undefined,
        paidAmount: paid,
        note: note || undefined,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
      });
      toast.success("Vente enregistrée avec succès");
      setInvoiceSale(res.sale);
      setShowForm(false);
      setCart([]);
      setClientId("");
      setCustomerName("");
      setPaidAmount("");
      setNote("");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur enregistrement vente");
    } finally { setSubmitting(false); }
  };

  const handleAddPayment = async () => {
    if (!cashOpen) {
      return toast.error("⚠️ La caisse est fermée. Ouvrez la caisse avant d'enregistrer un paiement.", { duration: 5000 });
    }
    if (!paymentSaleId || !paymentAmount || Number(paymentAmount) <= 0) {
      return toast.error("Montant invalide");
    }
    try {
      await addSalePayment(paymentSaleId, Number(paymentAmount));
      toast.success("Paiement ajouté");
      setPaymentSaleId(null);
      setPaymentAmount("");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur paiement");
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!confirm("Annuler cette vente ? Le stock sera restauré.")) return;
    try {
      await deleteSale(id);
      toast.success("Vente annulée");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    }
  };

  const printA4 = (sale: Sale) => doPrint(sale, user?.shopName || "Jokko Business", "A4", localStorage.getItem("shopLogo") || undefined);
  const printThermal = (sale: Sale) => doPrint(sale, user?.shopName || "Jokko Business", "THERMAL");

  const statusBadge: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-700",
    PARTIAL: "bg-yellow-100 text-yellow-700",
    UNPAID: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    PAID: "Payée", PARTIAL: "Partielle", UNPAID: "Non réglée",
  };

  const filteredSales = search
    ? sales.filter((s) =>
        s.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.customerName?.toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  return (
    <section className="space-y-6">
      {/* Alerte caisse fermée */}
      {cashOpen === false && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-red-800">Caisse fermée — Ventes bloquées</p>
              <p className="text-sm text-red-600 mt-0.5">Vous devez ouvrir la caisse avant d'enregistrer une vente.</p>
            </div>
          </div>
          <a href="/cash"
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition">
            Ouvrir la caisse →
          </a>
        </div>
      )}

      {/* Actions + filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-45">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="N° facture, client..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
          <option value="">Toutes les ventes</option>
          <option value="PAID">Payées</option>
          <option value="PARTIAL">Partielles</option>
          <option value="UNPAID">Non réglées</option>
        </select>
        <button onClick={() => {
          if (!cashOpen) {
            toast.error("⚠️ La caisse est fermée. Ouvrez la caisse d'abord.", { duration: 5000 });
            return;
          }
          setShowForm(true);
        }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition">
          <Plus size={16} /> Nouvelle vente
        </button>

        {/* Boutons export */}
        <div className="flex gap-2">
          <button onClick={() => exportSalesToExcel(sales, user?.shopName || "Boutique")}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => exportSalesPDF(sales, user?.shopName || "Boutique")}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Formulaire nouvelle vente */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Nouvelle vente</h3>
            <button onClick={() => { setShowForm(false); setCart([]); }}><X size={20} className="text-gray-400" /></button>
          </div>

          {/* Ajout article au panier */}
          <div className="rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Ajouter un article</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-600">Produit</label>
                <select value={selectedProductId} onChange={(e) => handleProductSelect(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                  <option value={0}>Sélectionner...</option>
                  {products.filter((p) => p.quantity > 0).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Prix appliqué (FCFA)</label>
                <input type="number" min={0} value={selectedPrice} onChange={(e) => setSelectedPrice(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${
                    priceTier === "wholesale" ? "border-purple-400 bg-purple-50"
                    : priceTier === "semiWholesale" ? "border-blue-400 bg-blue-50"
                    : "border-gray-300"
                  }`} />
                {priceSuggestion && (
                  <p className={`mt-1 text-xs font-medium ${
                    priceTier === "wholesale" ? "text-purple-600"
                    : priceTier === "semiWholesale" ? "text-blue-600"
                    : "text-gray-400"
                  }`}>
                    ✓ {priceSuggestion}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Quantité</label>
                <div className="flex gap-2">
                  <input type="number" min={1} value={selectedQty}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  <button onClick={handleAddToCart} type="button"
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 whitespace-nowrap">
                    + Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panier */}
          {cart.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-gray-500 text-xs">
                    <th className="px-4 py-2 text-left">Produit</th>
                    <th className="px-4 py-2 text-right">Qté</th>
                    <th className="px-4 py-2 text-right">Prix</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{fmt(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(item.unitPrice * item.quantity)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-slate-50">
                    <td colSpan={3} className="px-4 py-3 font-semibold text-right">Total panier</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(cartTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Infos vente */}
          <form onSubmit={handleCreateSale} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client enregistré</label>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value ? Number(e.target.value) : ""); if (e.target.value) setCustomerName(""); }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500">
                <option value="">-- Sélectionner un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ou nom libre</label>
              <input type="text" value={customerName} onChange={(e) => { setCustomerName(e.target.value); if (e.target.value) setClientId(""); }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Nom du client..." disabled={!!clientId} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Montant payé (FCFA)</label>
              <input type="number" min={0} value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder={`Total : ${fmt(cartTotal)}`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Optionnel..." />
            </div>
            {paidAmount !== "" && Number(paidAmount) < cartTotal && (
              <div className="sm:col-span-2 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                ⚠️ Paiement partiel — Reste à payer : {fmt(cartTotal - Number(paidAmount))}
              </div>
            )}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={submitting || !cart.length}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {submitting ? "Enregistrement..." : "Valider la vente"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setCart([]); }}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal paiement partiel */}
      {paymentSaleId && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Ajouter un paiement</h3>
            <button onClick={() => { setPaymentSaleId(null); setPaymentAmount(""); }}><X size={20} className="text-gray-400" /></button>
          </div>
          <div className="flex gap-3">
            <input type="number" min={1} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="Montant (FCFA)" />
            <button onClick={handleAddPayment}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Modale facture après vente */}
      {invoiceSale && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-800">✅ Vente enregistrée — {invoiceSale.invoiceNumber}</p>
            <p className="text-sm text-emerald-600 mt-0.5">Voulez-vous imprimer la facture ?</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button onClick={() => setPrintMenuFor(printMenuFor === invoiceSale.id ? null : invoiceSale.id)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                <Printer size={15} /> Imprimer ▾
              </button>
              {printMenuFor === invoiceSale.id && (
                <div className="absolute left-0 top-11 z-20 w-44 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => { printA4(invoiceSale); setPrintMenuFor(null); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50">
                    <Printer size={13} />
                    <div className="text-left">
                      <p className="font-medium">Format A4</p>
                      <p className="text-xs text-gray-400">Facture professionnelle</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100" />
                  <button onClick={() => { printThermal(invoiceSale); setPrintMenuFor(null); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50">
                    <Printer size={13} />
                    <div className="text-left">
                      <p className="font-medium">Ticket thermique</p>
                      <p className="text-xs text-gray-400">Imprimante 80mm</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setInvoiceSale(null)}
              className="rounded-xl border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <p className="text-sm text-gray-500">{total} vente(s)</p>

      {/* Liste ventes */}
      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>
      ) : !filteredSales.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Aucune vente trouvée.</div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{sale.invoiceNumber || `#${sale.id}`}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[sale.status]}`}>
                      {statusLabel[sale.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {sale.client?.name || sale.customerName || "Client non précisé"} •{" "}
                    {new Date(sale.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <div className="mt-1 text-xs text-gray-400">
                    {sale.items.length} article(s) •{" "}
                    Total : <strong className="text-slate-700">{fmt(sale.totalAmount)}</strong> •{" "}
                    Payé : <strong className="text-emerald-600">{fmt(sale.paidAmount)}</strong>
                    {sale.remaining > 0 && (
                      <> • Reste : <strong className="text-red-600">{fmt(sale.remaining)}</strong></>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">

                  {sale.status !== "PAID" && (
                    <button
                      onClick={() => {
                        if (!cashOpen) {
                          toast.error("⚠️ La caisse est fermée.", { duration: 4000 });
                          return;
                        }
                        setPaymentSaleId(sale.id);
                        setPaymentAmount("");
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${cashOpen ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                      + Paiement
                    </button>
                  )}
                  {admin && (
                    <button onClick={() => handleDeleteSale(sale.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
          ← Précédent
        </button>
        <span className="text-sm text-gray-500">
          Page <strong className="text-slate-900">{page}</strong> sur <strong className="text-slate-900">{totalPages}</strong>
          <span className="ml-2 text-gray-400">({total} au total)</span>
        </span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
          Suivant →
        </button>
      </div>
    </section>
  );
}