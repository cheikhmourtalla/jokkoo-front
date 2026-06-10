import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Wallet, TrendingUp, TrendingDown, X, ChevronDown, ChevronUp } from "lucide-react";
import { getCurrentCash, openCash, closeCash, addCashTransaction, getCashHistory, getCashById } from "../services/index";
import { exportCashReportPDF } from "../utils/exportPDF";
import { Download } from "lucide-react";
import PaymentMethodSelect, { PAYMENT_METHOD_LABELS } from "../components/Paymentmethodselect";
import type { CashRegister, CashTransaction } from "../types/index";
import { getStoredUser } from "../types/auth";

const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

export default function Cash() {
  const user = getStoredUser();
  const [cashState, setCashState] = useState<{ open: boolean; cashRegister: CashRegister | null }>({ open: false, cashRegister: null });
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<Record<number, CashRegister>>({});

  // Formulaires
  const [openAmount, setOpenAmount] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<"IN" | "OUT">("IN");
  const [txAmount, setTxAmount] = useState("");
  const [txLabel, setTxLabel] = useState("");
  const [txMethod, setTxMethod] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [current, hist] = await Promise.all([
        getCurrentCash(),
        getCashHistory({ page: historyPage, limit: 10 }),
      ]);
      setCashState(current);
      setHistory(hist.data || []);
      setHistoryTotal(hist.pagination?.total || 0);
      setHistoryTotalPages(hist.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [historyPage]);

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openAmount || Number(openAmount) < 0) return toast.error("Montant invalide");
    setSubmitting(true);
    try {
      await openCash({ openingAmount: Number(openAmount), note: openNote || undefined });
      toast.success("Caisse ouverte");
      setShowOpenForm(false);
      setOpenAmount("");
      setOpenNote("");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const [closureSummary, setClosureSummary] = useState<any>(null);

  const handleCloseCash = async () => {
    if (!cashState.cashRegister) return;
    if (!confirm("Fermer la caisse ? Un rapport de clôture sera généré.")) return;
    try {
      const res = await closeCash(cashState.cashRegister.id);
      toast.success("Caisse fermée ✅");
      if (res.summary) setClosureSummary(res.summary);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    }
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txLabel) return toast.error("Montant et libellé obligatoires");
    setSubmitting(true);
    try {
      await addCashTransaction({ type: txType, amount: Number(txAmount), label: txLabel, paymentMethod: txMethod } as any);
      toast.success("Transaction enregistrée");
      setShowTxForm(false);
      setTxAmount("");
      setTxLabel("");
      setTxMethod("CASH");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const loadSessionDetail = async (id: number) => {
    if (sessionDetail[id]) {
      setExpandedSession(expandedSession === id ? null : id);
      return;
    }
    try {
      const data = await getCashById(id);
      setSessionDetail((prev) => ({ ...prev, [id]: data }));
      setExpandedSession(id);
    } catch { toast.error("Erreur chargement session"); }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  const cr = cashState.cashRegister;

  return (
    <section className="space-y-6">

      {/* Rapport de clôture */}
      {closureSummary && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">📊 Rapport de clôture</h3>
            <button onClick={() => setClosureSummary(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{closureSummary.date} • Ouvert à {new Date(closureSummary.openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — Fermé à {new Date(closureSummary.closedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>

          {/* Résumé global */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            {[
              { label: "Ouverture", value: fmt(closureSummary.openingAmount), color: "bg-slate-50 text-slate-700" },
              { label: "Entrées", value: fmt(closureSummary.totalIn), color: "bg-emerald-50 text-emerald-700" },
              { label: "Sorties", value: fmt(closureSummary.totalOut), color: "bg-red-50 text-red-700" },
              { label: "Clôture", value: fmt(closureSummary.closingAmount), color: "bg-slate-900 text-white" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <p className="text-xs opacity-70 mb-1">{s.label}</p>
                <p className="font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Résumé par mode de paiement */}
          {closureSummary.paymentMethodSummary?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Répartition par mode de paiement</p>
              <div className="space-y-2">
                {closureSummary.paymentMethodSummary.map((m: any) => (
                  <div key={m.method} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{
                        m.method === "CASH" ? "💵" :
                        m.method === "WAVE" ? "🔵" :
                        m.method === "ORANGE_MONEY" ? "🟠" :
                        m.method === "FREE_MONEY" ? "🟣" :
                        m.method === "BANK" ? "🏦" : "📱"
                      }</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.label}</p>
                        <p className="text-xs text-gray-400">
                          +{fmt(m.totalIn)} entré • -{fmt(m.totalOut)} sorti
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${m.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                <span className="text-sm font-semibold">Total encaissé net</span>
                <span className="font-bold">{fmt(closureSummary.totalIn - closureSummary.totalOut)}</span>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 text-center">
            {closureSummary.transactionCount} transaction(s) • Géré par {closureSummary.openedBy}
          </p>
        </div>
      )}

      {/* ── Caisse fermée ─────────────────────────────── */}
      {!cashState.open ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-yellow-100 p-5">
              <Wallet size={32} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Caisse fermée</h3>
              <p className="mt-1 text-sm text-gray-500">Ouvrez la caisse pour commencer les transactions du jour.</p>
            </div>
            <button onClick={() => setShowOpenForm(true)}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition">
              Ouvrir la caisse
            </button>
          </div>

          {showOpenForm && (
            <div className="mt-6 border-t pt-6 max-w-sm mx-auto space-y-4">
              <form onSubmit={handleOpenCash} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Montant d'ouverture (FCFA)</label>
                  <input type="number" min="0" value={openAmount} onChange={(e) => setOpenAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Ex: 50000" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Note (optionnel)</label>
                  <input type="text" value={openNote} onChange={(e) => setOpenNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Ex: Fonds de caisse matin" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                    {submitting ? "Ouverture..." : "Confirmer l'ouverture"}
                  </button>
                  <button type="button" onClick={() => setShowOpenForm(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700">Annuler</button>
                </div>
              </form>
            </div>
          )}
        </div>

      ) : (
        <>
          {/* ── Caisse ouverte - résumé ─────────────────── */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-xs text-white/60">Solde actuel</p>
              <p className="mt-2 text-2xl font-bold">{fmt(cr?.currentBalance ?? 0)}</p>
              <p className="mt-1 text-xs text-white/40">Ouvert à {new Date(cr?.openedAt ?? "").toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">Montant d'ouverture</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{fmt(cr?.openingAmount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="text-xs text-emerald-700">Total encaissements</p>
              <p className="mt-2 text-xl font-bold text-emerald-800">{fmt(cr?.totalIn ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-5">
              <p className="text-xs text-red-700">Total décaissements</p>
              <p className="mt-2 text-xl font-bold text-red-800">{fmt(cr?.totalOut ?? 0)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setTxType("IN"); setShowTxForm(true); }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition">
              <TrendingUp size={16} /> Encaissement manuel
            </button>
            <button onClick={() => { setTxType("OUT"); setShowTxForm(true); }}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition">
              <TrendingDown size={16} /> Décaissement manuel
            </button>
            <button onClick={handleCloseCash}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              🔒 Fermer la caisse
            </button>
            {cr && (
              <button onClick={() => exportCashReportPDF(cr, user?.shopName || "Boutique")}
                className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <Download size={15} /> Rapport PDF
              </button>
            )}
          </div>

          {/* Formulaire transaction manuelle */}
          {showTxForm && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {txType === "IN" ? "Encaissement manuel" : "Décaissement manuel"}
                </h3>
                <button onClick={() => setShowTxForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddTx} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Montant (FCFA)</label>
                  <input type="number" min="1" value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Ex: 5000" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</label>
                  <PaymentMethodSelect value={txMethod} onChange={setTxMethod} className="w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Libellé</label>
                  <input type="text" value={txLabel} onChange={(e) => setTxLabel(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Ex: Achat fournitures, Dépense transport..." required />
                </div>
                <div className="flex gap-3 sm:col-span-3">
                  <button type="submit" disabled={submitting}
                    className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 transition ${txType === "IN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"}`}>
                    {submitting ? "Enregistrement..." : "Confirmer"}
                  </button>
                  <button type="button" onClick={() => setShowTxForm(false)}
                    className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700">Annuler</button>
                </div>
              </form>
            </div>
          )}

          {/* Répartition par moyen de paiement */}
          {cr?.transactions?.length ? (() => {
            const byMethod: Record<string, { in: number; out: number }> = {};
            cr.transactions.forEach((tx: any) => {
              const m = tx.paymentMethod || "CASH";
              if (!byMethod[m]) byMethod[m] = { in: 0, out: 0 };
              if (tx.type === "IN") byMethod[m].in += tx.amount;
              else byMethod[m].out += tx.amount;
            });
            const methodEmojis: Record<string, string> = {
              CASH: "💵", WAVE: "🔵", ORANGE_MONEY: "🟠", FREE_MONEY: "🟣", BANK: "🏦", OTHER: "📱"
            };
            const methodNames: Record<string, string> = {
              CASH: "Espèces", WAVE: "Wave", ORANGE_MONEY: "Orange Money",
              FREE_MONEY: "Free Money", BANK: "Virement", OTHER: "Autre"
            };
            const entries = Object.entries(byMethod);
            return (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">💳 Répartition par moyen de paiement</h3>
                <div className="space-y-3">
                  {entries.map(([method, amounts]) => (
                    <div key={method} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{methodEmojis[method] || "📱"}</span>
                        <div>
                          <p className="font-semibold text-slate-800">{methodNames[method] || method}</p>
                          <p className="text-xs text-gray-400">
                            +{fmt(amounts.in)} encaissé
                            {amounts.out > 0 && ` • -${fmt(amounts.out)} décaissé`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700 text-lg">{fmt(amounts.in)}</p>
                        {amounts.out > 0 && <p className="text-xs text-red-500">-{fmt(amounts.out)}</p>}
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white mt-2">
                    <span className="font-semibold">Total encaissé</span>
                    <span className="font-bold text-lg">{fmt(cr.totalIn)}</span>
                  </div>
                </div>
              </div>
            );
          })() : null}

          {/* Transactions du jour */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Transactions du jour</h3>
            {!cr?.transactions?.length ? (
              <p className="text-sm text-gray-400">Aucune transaction pour le moment.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {cr.transactions.map((tx: CashTransaction) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-1.5 ${tx.type === "IN" ? "bg-emerald-100" : "bg-red-100"}`}>
                        {tx.type === "IN"
                          ? <TrendingUp size={13} className="text-emerald-600" />
                          : <TrendingDown size={13} className="text-red-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tx.label}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleTimeString("fr-FR")} •{" "}
                          {PAYMENT_METHOD_LABELS[(tx as any).paymentMethod || "CASH"]}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "IN" ? "+" : "-"}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Historique journalier ──────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Historique journalier</h3>
          <span className="text-sm text-gray-400">{historyTotal} session(s)</span>
        </div>

        {!history.length ? (
          <p className="text-sm text-gray-400">Aucun historique disponible.</p>
        ) : (
          <div className="space-y-3">
            {history.map((session) => (
              <div key={session.id} className="rounded-2xl border border-gray-200 overflow-hidden">
                {/* En-tête session */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => loadSessionDetail(session.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {new Date(session.openedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${session.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {session.status === "OPEN" ? "En cours" : "Clôturée"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ouvert {new Date(session.openedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {session.closedAt && ` • Fermé ${new Date(session.closedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                      {(session as any).user?.name && ` • ${(session as any).user.name}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      <p className="text-gray-400 text-xs">Ouverture</p>
                      <p className="font-medium">{fmt(session.openingAmount)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-emerald-600 text-xs">+Entrées</p>
                      <p className="font-medium text-emerald-700">{fmt(session.totalIn)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-red-500 text-xs">-Sorties</p>
                      <p className="font-medium text-red-600">{fmt(session.totalOut)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-400 text-xs">Clôture</p>
                      <p className="font-bold text-slate-900">
                        {session.closingAmount != null ? fmt(session.closingAmount) : fmt((session as any).currentBalance ?? 0)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sessionDetail[session.id]) {
                          exportCashReportPDF(sessionDetail[session.id], user?.shopName || "Boutique");
                        } else {
                          loadSessionDetail(session.id).then(() => {
                            // Le détail sera chargé, l'utilisateur peut recliquer
                          });
                          toast("Cliquez à nouveau pour télécharger après chargement", { icon: "ℹ️", duration: 3000 });
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Download size={12} /> PDF
                    </button>
                  {expandedSession === session.id
                      ? <ChevronUp size={18} className="text-gray-400" />
                      : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Détail transactions */}
                {expandedSession === session.id && sessionDetail[session.id] && (
                  <div className="border-t bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-3">
                      Détail des transactions ({sessionDetail[session.id].transactions?.length || 0})
                    </p>
                    {!sessionDetail[session.id].transactions?.length ? (
                      <p className="text-sm text-gray-400">Aucune transaction enregistrée.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sessionDetail[session.id].transactions?.map((tx: CashTransaction) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-1 ${tx.type === "IN" ? "bg-emerald-100" : "bg-red-100"}`}>
                                {tx.type === "IN"
                                  ? <TrendingUp size={12} className="text-emerald-600" />
                                  : <TrendingDown size={12} className="text-red-600" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800">{tx.label}</p>
                                <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleTimeString("fr-FR")}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${tx.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                              {tx.type === "IN" ? "+" : "-"}{fmt(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination historique */}
        {historyTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">Page {historyPage} / {historyTotalPages}</span>
            <button onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              Suivant →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}