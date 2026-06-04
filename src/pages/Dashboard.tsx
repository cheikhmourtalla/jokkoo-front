import { useEffect, useState } from "react";
import {
  Boxes, AlertTriangle, Ban, Wallet,
  ShoppingCart, BarChart3, Users, Truck,
  TrendingUp, CreditCard,
} from "lucide-react";
import { getDashboardStats } from "../services/index";
import type { DashboardStats } from "../types/index";

function StatCard({
  title, value, subtitle, icon, color = "slate",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color?: "slate" | "emerald" | "yellow" | "red" | "blue" | "orange";
}) {
  const colors = {
    slate:   "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    yellow:  "bg-yellow-100 text-yellow-700",
    red:     "bg-red-100 text-red-700",
    blue:    "bg-blue-100 text-blue-700",
    orange:  "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-gray-400">
        Chargement du tableau de bord...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Alerte caisse fermée */}
      {!stats?.cashOpen && (
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-5 py-4 text-sm text-yellow-800">
          ⚠️ La caisse n'est pas encore ouverte. Rendez-vous dans{" "}
          <a href="/cash" className="font-semibold underline">Caisse</a> pour l'ouvrir avant toute transaction.
        </div>
      )}

      {/* Stats produits & stock */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Produits & Stock</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total produits" value={stats?.totalProducts ?? 0} subtitle="Produits actifs" icon={<Boxes size={20} />} color="slate" />
          <StatCard title="Stock faible" value={stats?.lowStockProducts ?? 0} subtitle="Sous le seuil d'alerte" icon={<AlertTriangle size={20} />} color="yellow" />
          <StatCard title="Rupture de stock" value={stats?.outOfStockProducts ?? 0} subtitle="Produits épuisés" icon={<Ban size={20} />} color="red" />
          <StatCard title="Valeur du stock" value={fmt(stats?.stockValue ?? 0)} subtitle="Prix d'achat total" icon={<Wallet size={20} />} color="emerald" />
        </div>
      </div>

      {/* Stats ventes */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Ventes & Finances</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total ventes" value={stats?.totalSales ?? 0} subtitle="Ventes enregistrées" icon={<ShoppingCart size={20} />} color="blue" />
          <StatCard title="Chiffre d'affaires" value={fmt(stats?.totalSalesAmount ?? 0)} subtitle="Montant total facturé" icon={<BarChart3 size={20} />} color="emerald" />
          <StatCard title="Créances clients" value={fmt(stats?.totalClientDebt ?? 0)} subtitle="Montants non encaissés" icon={<CreditCard size={20} />} color="orange" />
          <StatCard title="Dettes fournisseurs" value={fmt(stats?.totalSupplierDebt ?? 0)} subtitle="Montants à payer" icon={<TrendingUp size={20} />} color="red" />
        </div>
      </div>

      {/* Stats clients & fournisseurs */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Clients & Fournisseurs</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard title="Total clients" value={stats?.totalClients ?? 0} subtitle="Clients enregistrés" icon={<Users size={20} />} color="blue" />
          <StatCard title="Total fournisseurs" value={stats?.totalSuppliers ?? 0} subtitle="Fournisseurs enregistrés" icon={<Truck size={20} />} color="slate" />
        </div>
      </div>

      {/* Détails financiers + top produits */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Situation financière */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Situation financière</h3>
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-xs text-white/60">Valeur du stock</p>
              <p className="mt-1 text-xl font-bold">{fmt(stats?.stockValue ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">Chiffre d'affaires total</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">{fmt(stats?.totalSalesAmount ?? 0)}</p>
            </div>
            {stats?.cashOpen && stats.currentBalance !== null && (
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs text-blue-700">Solde caisse actuel</p>
                <p className="mt-1 text-xl font-bold text-blue-800">{fmt(stats.currentBalance ?? 0)}</p>
              </div>
            )}
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs text-orange-700">Ventes des 7 derniers jours</p>
              <p className="mt-1 text-xl font-bold text-orange-800">{fmt(stats?.recentSalesAmount ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Top produits */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Top 5 produits vendus</h3>
          {!stats?.topProducts?.length ? (
            <p className="text-sm text-gray-400">Aucune vente enregistrée pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{p.productName}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {p.totalQuantity ?? 0} unités
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}