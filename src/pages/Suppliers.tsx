import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  addSupplierDebt, addSupplierPayment, getCurrentCash,
} from "../services/index";
import type { Supplier, SupplierDebt } from "../types/index";

const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;
const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dette
  const [showDebtForm, setShowDebtForm] = useState<number | null>(null);
  const [debtTotal, setDebtTotal] = useState("");
  const [debtPaid, setDebtPaid] = useState("0");
  const [debtNote, setDebtNote] = useState("");

  // Paiement sur dette existante
  const [payingDebt, setPayingDebt] = useState<{ supplierId: number; debt: SupplierDebt } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const checkCash = async () => {
    try {
      const res = await getCurrentCash();
      setCashOpen(res.open);
    } catch {
      setCashOpen(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setSuppliers(await getSuppliers());
    } catch { toast.error("Erreur chargement fournisseurs"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSuppliers();
    checkCash();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error("Le nom est obligatoire");
    setSubmitting(true);
    try {
      if (editingId) { await updateSupplier(editingId, form); toast.success("Fournisseur modifié"); }
      else { await createSupplier(form); toast.success("Fournisseur créé"); }
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      await fetchSuppliers();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    try { await deleteSupplier(id); toast.success("Fournisseur supprimé"); await fetchSuppliers(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
  };

  const handleAddDebt = async (supplierId: number) => {
    if (!debtTotal || Number(debtTotal) <= 0) return toast.error("Montant total invalide");
    if (Number(debtPaid) > Number(debtTotal)) return toast.error("L'acompte ne peut pas dépasser le total");
    if (Number(debtPaid) > 0 && !cashOpen) {
      return toast.error("⚠️ La caisse est fermée. Impossible de verser un acompte.", { duration: 5000 });
    }
    try {
      await addSupplierDebt(supplierId, {
        totalAmount: Number(debtTotal),
        paidAmount: Number(debtPaid) || 0,
        note: debtNote || undefined,
      });
      toast.success(Number(debtPaid) > 0 ? "Dette et acompte enregistrés — caisse mise à jour" : "Dette enregistrée");
      setShowDebtForm(null); setDebtTotal(""); setDebtPaid("0"); setDebtNote("");
      await fetchSuppliers();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
  };

  const openPayment = (supplierId: number, debt: SupplierDebt) => {
    setPayingDebt({ supplierId, debt });
    setPayAmount(String(debt.remaining));
    setPayNote("");
  };

  const handlePayment = async () => {
    if (!cashOpen) {
      return toast.error("⚠️ La caisse est fermée. Ouvrez la caisse avant de payer un fournisseur.", { duration: 5000 });
    }
    if (!payingDebt || !payAmount || Number(payAmount) <= 0) return toast.error("Montant invalide");
    setPaySubmitting(true);
    try {
      await addSupplierPayment(payingDebt.supplierId, payingDebt.debt.id, {
        amount: Number(payAmount),
        note: payNote || undefined,
      });
      toast.success("Paiement enregistré — caisse mise à jour");
      setPayingDebt(null); setPayAmount(""); setPayNote("");
      await fetchSuppliers();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
    finally { setPaySubmitting(false); }
  };

  const totalDebtAll = suppliers.reduce((sum, s) => sum + (s.totalDebt ?? 0), 0);

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <section className="space-y-6">

      {/* Alerte caisse fermée */}
      {cashOpen === false && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-red-800">Caisse fermée — Paiements bloqués</p>
              <p className="text-sm text-red-600 mt-0.5">Ouvrez la caisse pour payer vos fournisseurs.</p>
            </div>
          </div>
          <a href="/cash"
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition">
            Ouvrir la caisse →
          </a>
        </div>
      )}

      {/* Stats */}
      {totalDebtAll > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">
            Total dû à tous les fournisseurs : <span className="text-lg">{fmt(totalDebtAll)}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{suppliers.length} fournisseur(s)</p>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition">
          <Plus size={16} /> Nouveau fournisseur
        </button>
      </div>

      {/* Formulaire fournisseur */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? "Modifier" : "Nouveau"} fournisseur</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={20} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Nom *", key: "name", placeholder: "Nom du fournisseur" },
              { label: "Téléphone", key: "phone", placeholder: "77 000 00 00" },
              { label: "Email", key: "email", placeholder: "email@fournisseur.com" },
              { label: "Adresse", key: "address", placeholder: "Adresse..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                <input type="text" value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder={placeholder} />
              </div>
            ))}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={submitting}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Créer"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal paiement dette */}
      {payingDebt && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payer une dette fournisseur</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Reste dû : <strong className="text-red-600">{fmt(payingDebt.debt.remaining)}</strong>
                {payingDebt.debt.note && ` • ${payingDebt.debt.note}`}
              </p>
            </div>
            <button onClick={() => setPayingDebt(null)}><X size={20} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Montant à payer (FCFA)</label>
              <input type="number" min={1} max={payingDebt.debt.remaining} value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (optionnel)</label>
              <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Ex: Règlement partiel..." />
            </div>
            <div className="flex items-end">
              <button onClick={handlePayment} disabled={paySubmitting}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {paySubmitting ? "Paiement..." : "✓ Confirmer le paiement"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-600">
            💡 Ce paiement sera automatiquement décaissé de la caisse si elle est ouverte.
          </p>
        </div>
      )}

      {/* Liste fournisseurs */}
      {!suppliers.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Aucun fournisseur enregistré.</div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => {
            const unpaidDebts = s.supplierDebts?.filter((d) => d.status !== "PAID") || [];
            return (
              <div key={s.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                {/* En-tête fournisseur */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-sm text-gray-500">
                        {s.phone || "Pas de téléphone"}
                        {s.email ? ` • ${s.email}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(s.totalDebt ?? 0) > 0 && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Doit : {fmt(s.totalDebt ?? 0)}
                      </span>
                    )}
                    {(s.totalDebt ?? 0) === 0 && (s as any).totalPurchases > 0 && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Tout réglé
                      </span>
                    )}

                    {/* Bouton Payer visible directement si dettes */}
                    {unpaidDebts.length > 0 && (
                      <button
                        onClick={() => {
                          if (!cashOpen) {
                            toast.error("⚠️ La caisse est fermée.", { duration: 4000 });
                            return;
                          }
                          openPayment(s.id, unpaidDebts[0]);
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition ${cashOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 cursor-not-allowed"}`}>
                        <CreditCard size={13} /> Payer
                      </button>
                    )}

                    <button onClick={() => { setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "" }); setEditingId(s.id); setShowForm(true); }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Modifier</button>
                    <button onClick={() => handleDelete(s.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                    <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="text-gray-400 hover:text-gray-600">
                      {expandedId === s.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Section expandée */}
                {expandedId === s.id && (
                  <div className="border-t bg-slate-50 px-5 py-4 space-y-4">
                    {/* Résumé financier */}
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-gray-400">Total achats</p>
                        <p className="font-bold text-slate-900">{fmt((s as any).totalPurchases ?? 0)}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-gray-400">Total payé</p>
                        <p className="font-bold text-emerald-700">{fmt((s as any).totalPaid ?? 0)}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-gray-400">Reste dû</p>
                        <p className={`font-bold ${(s.totalDebt ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {fmt(s.totalDebt ?? 0)}
                        </p>
                      </div>
                    </div>

                    {/* Ajouter une nouvelle dette */}
                    <button onClick={() => setShowDebtForm(showDebtForm === s.id ? null : s.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700">
                      {showDebtForm === s.id ? "▲ Annuler" : "+ Ajouter une dette / approvisionnement"}
                    </button>

                    {showDebtForm === s.id && (
                      <div className="rounded-xl bg-white p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-800">Nouvelle dette fournisseur</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Montant total (FCFA) *</label>
                            <input type="number" min="1" value={debtTotal} onChange={(e) => setDebtTotal(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                              placeholder="Ex: 100000" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Acompte versé (FCFA)</label>
                            <input type="number" min="0" value={debtPaid} onChange={(e) => setDebtPaid(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                              placeholder="0" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-600">Note</label>
                            <input type="text" value={debtNote} onChange={(e) => setDebtNote(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                              placeholder="Ex: Tissu, farine..." />
                          </div>
                        </div>
                        {debtTotal && Number(debtPaid) > 0 && (
                          <p className="text-xs text-yellow-600">
                            ⚠️ Reste dû après acompte : {fmt(Number(debtTotal) - Number(debtPaid))}
                          </p>
                        )}
                        <p className="text-xs text-emerald-600">
                          💡 Si acompte &gt; 0, il sera automatiquement décaissé de la caisse si elle est ouverte.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleAddDebt(s.id)}
                            className="rounded-xl bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600">
                            Enregistrer la dette
                          </button>
                          <button onClick={() => setShowDebtForm(null)}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-xs text-gray-700">Annuler</button>
                        </div>
                      </div>
                    )}

                    {/* Liste des dettes */}
                    {s.supplierDebts?.length ? (
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Dettes ({s.supplierDebts.length})</p>
                        <div className="space-y-2">
                          {s.supplierDebts.map((d: SupplierDebt) => (
                            <div key={d.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Total : {fmt(d.totalAmount)}
                                  {d.note && <span className="ml-2 text-xs text-gray-400">— {d.note}</span>}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Payé : {fmt(d.paidAmount)} • Reste : <span className={d.remaining > 0 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>{fmt(d.remaining)}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${d.status === "PAID" ? "bg-emerald-100 text-emerald-700" : d.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                  {d.status === "PAID" ? "Soldée" : d.status === "PARTIAL" ? "Partielle" : "Non payée"}
                                </span>
                                {d.status !== "PAID" && (
                                  <button
                                    onClick={() => {
                                      if (!cashOpen) {
                                        toast.error("⚠️ La caisse est fermée.", { duration: 4000 });
                                        return;
                                      }
                                      openPayment(s.id, d);
                                    }}
                                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition ${cashOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 cursor-not-allowed"}`}>
                                    <CreditCard size={12} /> Payer
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Aucune dette enregistrée.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}