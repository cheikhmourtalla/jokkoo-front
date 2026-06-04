import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getProducts, getSuppliers, addStockEntry, addStockOut, getStockMovements } from "../services/index";
import { exportStockToExcel } from "../utils/exportExcel";
import { Download } from "lucide-react";
import { getStoredUser } from "../types/auth";
import type { Product, Supplier, StockMovement } from "../types/index";

const fmt = (v: number) => v.toLocaleString("fr-FR");
const fmtCFA = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

export default function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [submittingOut, setSubmittingOut] = useState(false);

  // Formulaire entrée
  const [entryForm, setEntryForm] = useState({
    productId: 0, quantity: 0, note: "",
    supplierId: 0, unitCost: 0, paidAmount: 0, createDebt: false,
  });

  // Formulaire sortie
  const [outForm, setOutForm] = useState({ productId: 0, quantity: 0, note: "" });

  // Afficher sections optionnelles
  const [showSupplierSection, setShowSupplierSection] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, sups, movRes] = await Promise.all([
        getProducts({ limit: 200 }),
        getSuppliers(),
        getStockMovements({ page, limit: 15 }),
      ]);
      setProducts(prodRes.data);
      setSuppliers(sups);
      setMovements(movRes.data || []);
      setTotalMovements(movRes.pagination?.total || 0);
      setTotalPages(movRes.pagination?.totalPages || 1);
    } catch {
      toast.error("Erreur chargement stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  const totalCost = entryForm.unitCost > 0 && entryForm.quantity > 0
    ? entryForm.unitCost * entryForm.quantity
    : 0;
  const reste = totalCost > 0 ? totalCost - entryForm.paidAmount : 0;

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.productId || entryForm.quantity <= 0) {
      return toast.error("Sélectionnez un produit et une quantité valide");
    }
    if (entryForm.createDebt && !entryForm.supplierId) {
      return toast.error("Sélectionnez un fournisseur pour créer une dette");
    }
    if (entryForm.createDebt && entryForm.unitCost <= 0) {
      return toast.error("Entrez le coût unitaire pour calculer la dette");
    }
    if (entryForm.paidAmount > totalCost) {
      return toast.error("L'acompte ne peut pas dépasser le total");
    }

    setSubmittingEntry(true);
    try {
      await addStockEntry({
        productId: entryForm.productId,
        quantity: entryForm.quantity,
        note: entryForm.note || undefined,
        supplierId: entryForm.supplierId || undefined,
        unitCost: entryForm.unitCost || undefined,
        paidAmount: entryForm.paidAmount || undefined,
        createDebt: entryForm.createDebt,
      } as any);
      toast.success("Entrée de stock enregistrée");
      setEntryForm({ productId: 0, quantity: 0, note: "", supplierId: 0, unitCost: 0, paidAmount: 0, createDebt: false });
      setShowSupplierSection(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur entrée stock");
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outForm.productId || outForm.quantity <= 0) {
      return toast.error("Sélectionnez un produit et une quantité valide");
    }
    setSubmittingOut(true);
    try {
      await addStockOut(outForm);
      toast.success("Sortie de stock enregistrée");
      setOutForm({ productId: 0, quantity: 0, note: "" });
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur sortie stock");
    } finally {
      setSubmittingOut(false);
    }
  };

  const typeLabel: Record<string, { label: string; color: string }> = {
    ENTRY:  { label: "Entrée",     color: "bg-emerald-100 text-emerald-700" },
    OUT:    { label: "Sortie",     color: "bg-red-100 text-red-700" },
    SALE:   { label: "Vente",      color: "bg-blue-100 text-blue-700" },
    ADJUST: { label: "Ajustement", color: "bg-yellow-100 text-yellow-700" },
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ── Formulaire entrée ─────────────────────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Entrée de stock</h3>
          <form onSubmit={handleEntry} className="space-y-4">

            {/* Produit */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Produit *</label>
              <select value={entryForm.productId}
                onChange={(e) => setEntryForm((p) => ({ ...p, productId: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required>
                <option value={0}>Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — stock actuel : {p.quantity}</option>
                ))}
              </select>
            </div>

            {/* Quantité */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantité à ajouter *</label>
              <input type="number" min={1} value={entryForm.quantity}
                onChange={(e) => setEntryForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required />
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
              <input type="text" value={entryForm.note}
                onChange={(e) => setEntryForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Ex: Réapprovisionnement..." />
            </div>

            {/* Toggle fournisseur */}
            <button type="button"
              onClick={() => setShowSupplierSection((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              {showSupplierSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showSupplierSection ? "Masquer les infos fournisseur" : "Lier à un fournisseur (optionnel)"}
            </button>

            {/* Section fournisseur */}
            {showSupplierSection && (
              <div className="rounded-xl bg-slate-50 p-4 space-y-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700">Informations fournisseur</p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
                  <select value={entryForm.supplierId}
                    onChange={(e) => setEntryForm((p) => ({ ...p, supplierId: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500">
                    <option value={0}>Sélectionner un fournisseur</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Créer une dette ? */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={entryForm.createDebt}
                    onChange={(e) => setEntryForm((p) => ({ ...p, createDebt: e.target.checked }))}
                    className="h-4 w-4 rounded accent-emerald-600" />
                  <span className="text-sm text-gray-700">Créer une dette fournisseur pour cet approvisionnement</span>
                </label>

                {entryForm.createDebt && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Coût unitaire (FCFA) *</label>
                      <input type="number" min={0} value={entryForm.unitCost}
                        onChange={(e) => setEntryForm((p) => ({ ...p, unitCost: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                        placeholder="Prix d'achat unitaire" />
                    </div>

                    {totalCost > 0 && (
                      <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Quantité</span>
                          <span className="font-medium">{entryForm.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Coût unitaire</span>
                          <span className="font-medium">{fmtCFA(entryForm.unitCost)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span>Total à payer</span>
                          <span className="text-red-600">{fmtCFA(totalCost)}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Acompte versé à la livraison (FCFA)
                        <span className="ml-1 text-xs text-gray-400">— optionnel</span>
                      </label>
                      <input type="number" min={0} max={totalCost || undefined} value={entryForm.paidAmount}
                        onChange={(e) => setEntryForm((p) => ({ ...p, paidAmount: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                        placeholder="0" />
                    </div>

                    {totalCost > 0 && (
                      <div className={`rounded-xl px-4 py-3 text-sm font-medium ${reste > 0 ? "bg-yellow-50 text-yellow-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {reste > 0
                          ? `⚠️ Reste dû au fournisseur : ${fmtCFA(reste)}`
                          : "✅ Approvisionnement entièrement payé"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submittingEntry}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {submittingEntry ? "Enregistrement..." : "Ajouter au stock"}
              </button>
              <button type="button"
                onClick={() => { setEntryForm({ productId: 0, quantity: 0, note: "", supplierId: 0, unitCost: 0, paidAmount: 0, createDebt: false }); setShowSupplierSection(false); }}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                Réinitialiser
              </button>
            </div>
          </form>
        </div>

        {/* ── Formulaire sortie ─────────────────────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Sortie de stock</h3>
          <form onSubmit={handleOut} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Produit *</label>
              <select value={outForm.productId}
                onChange={(e) => setOutForm((p) => ({ ...p, productId: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required>
                <option value={0}>Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — stock actuel : {p.quantity}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantité à retirer *</label>
              <input type="number" min={1} value={outForm.quantity}
                onChange={(e) => setOutForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Raison</label>
              <textarea value={outForm.note}
                onChange={(e) => setOutForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500 min-h-20"
                placeholder="Ex: Casse, perte, retour client..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submittingOut}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60 transition">
                {submittingOut ? "Enregistrement..." : "Sortir du stock"}
              </button>
              <button type="button"
                onClick={() => setOutForm({ productId: 0, quantity: 0, note: "" })}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Historique ─────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Historique des mouvements</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{totalMovements} mouvement(s)</span>
            <button onClick={() => exportStockToExcel(movements, user?.shopName || "Boutique")}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <Download size={14} /> Excel
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement...</p>
        ) : !movements.length ? (
          <p className="text-center text-gray-400 py-8">Aucun mouvement enregistré.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs uppercase">
                    <th className="pb-3 pr-4">Produit</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Qté</th>
                    <th className="pb-3 pr-4">Fournisseur</th>
                    <th className="pb-3 pr-4">Utilisateur</th>
                    <th className="pb-3 pr-4">Note</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-slate-900">{m.product?.name || "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${typeLabel[m.type]?.color}`}>
                          {typeLabel[m.type]?.label || m.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium">{fmt(m.quantity)}</td>
                      <td className="py-3 pr-4 text-gray-500">{(m.supplier as any)?.name || "-"}</td>
                      <td className="py-3 pr-4 text-gray-500">{m.user?.name || "-"}</td>
                      <td className="py-3 pr-4 text-gray-500 max-w-40 truncate">{m.note || "-"}</td>
                      <td className="py-3 text-gray-500">{new Date(m.createdAt).toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 lg:hidden">
              {movements.map((m) => (
                <div key={m.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{m.product?.name}</p>
                      <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${typeLabel[m.type]?.color}`}>
                      {typeLabel[m.type]?.label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-gray-400">Quantité</p><p className="font-medium">{fmt(m.quantity)}</p></div>
                    <div><p className="text-xs text-gray-400">Fournisseur</p><p className="font-medium">{(m.supplier as any)?.name || "-"}</p></div>
                    {m.note && <div className="col-span-2"><p className="text-xs text-gray-400">Note</p><p className="font-medium">{m.note}</p></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                  ← Précédent
                </button>
                <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}