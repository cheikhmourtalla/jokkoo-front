import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Store } from "lucide-react";
import { loginSuperAdmin } from "../services/index";
import type { Shop } from "../types/index";
import logo from "../assets/logo.svg";

export default function SuperAdmin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("sa_token"));
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Shop form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shopName: "", ownerName: "", email: "", phone: "", address: "", adminPassword: "", subscriptionEndDate: "" });
  const [submitting, setSubmitting] = useState(false);

  // Reset password
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchShops = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/super-admin/shops", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setShops(data);
    } catch { toast.error("Erreur chargement boutiques"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchShops(token); }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await loginSuperAdmin({ email, password });
      localStorage.setItem("sa_token", res.token);
      setToken(res.token);
      toast.success("Connexion Super Admin réussie");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Identifiants invalides");
    } finally { setLoginLoading(false); }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName || !form.ownerName || !form.email || !form.adminPassword) {
      return toast.error("Champs obligatoires manquants");
    }
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5000/api/super-admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Boutique créée avec succès");
      setShowForm(false);
      setForm({ shopName: "", ownerName: "", email: "", phone: "", address: "", adminPassword: "", subscriptionEndDate: "" });
      if (token) fetchShops(token);
    } catch (error: any) {
      toast.error(error.message || "Erreur création");
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id: number, status: "ACTIVE" | "SUSPENDED" | "EXPIRED") => {
    try {
      await fetch(`http://localhost:5000/api/super-admin/shops/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      toast.success("Statut mis à jour");
      if (token) fetchShops(token);
    } catch { toast.error("Erreur"); }
  };

  const handleResetPassword = async () => {
    if (!resetId || !newPassword || newPassword.length < 6) return toast.error("Mot de passe trop court");
    try {
      await fetch(`http://localhost:5000/api/super-admin/shops/${resetId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      toast.success("Mot de passe réinitialisé");
      setResetId(null);
      setNewPassword("");
    } catch { toast.error("Erreur"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette boutique définitivement ?")) return;
    try {
      await fetch(`http://localhost:5000/api/super-admin/shops/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Boutique supprimée");
      if (token) fetchShops(token);
    } catch { toast.error("Erreur suppression"); }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    SUSPENDED: "bg-yellow-100 text-yellow-700",
    EXPIRED: "bg-red-100 text-red-700",
  };

  // Page login super admin
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src={logo} alt="Jokko Business" className="mb-4 h-16 w-16 rounded-2xl bg-slate-50 p-2 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900">Super Administration</h1>
            <p className="mt-1 text-sm text-gray-500">Accès réservé à l'administrateur de la plateforme</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="superadmin@jokkobusiness.com" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loginLoading}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {loginLoading ? "Connexion..." : "Accéder au panneau"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-gray-400">
            <a href="/login" className="text-emerald-600 hover:underline">← Retour connexion boutique</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Jokko Business" className="h-10 w-10 rounded-xl bg-slate-50 p-1 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Panneau Super Admin</h1>
              <p className="text-xs text-gray-400">Gestion des boutiques Jokko Business</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus size={16} /> Nouvelle boutique
            </button>
            <button onClick={() => { localStorage.removeItem("sa_token"); setToken(null); }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Déconnexion
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total boutiques", value: shops.length },
            { label: "Actives", value: shops.filter((s) => s.status === "ACTIVE").length },
            { label: "Suspendues / Expirées", value: shops.filter((s) => s.status !== "ACTIVE").length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white p-5 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Formulaire nouvelle boutique */}
        {showForm && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Nouvelle boutique</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateShop} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "Nom de la boutique *", key: "shopName", placeholder: "Ex: Boutique Fatou" },
                { label: "Nom du propriétaire *", key: "ownerName", placeholder: "Ex: Fatou Diallo" },
                { label: "Email (identifiant) *", key: "email", placeholder: "admin@boutique.com" },
                { label: "Téléphone", key: "phone", placeholder: "77 000 00 00" },
                { label: "Adresse", key: "address", placeholder: "Dakar, Sénégal" },
                { label: "Mot de passe admin *", key: "adminPassword", placeholder: "Min. 6 caractères" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={key === "adminPassword" ? "password" : "text"}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fin d'abonnement</label>
                <input type="date" value={form.subscriptionEndDate}
                  onChange={(e) => setForm((p) => ({ ...p, subscriptionEndDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? "Création..." : "Créer la boutique"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700">Annuler</button>
              </div>
            </form>
          </div>
        )}

        {/* Reset password modal */}
        {resetId && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Réinitialiser le mot de passe</h3>
              <button onClick={() => { setResetId(null); setNewPassword(""); }}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-3">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Nouveau mot de passe (min. 6 caractères)" />
              <button onClick={handleResetPassword} className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-medium text-white hover:bg-yellow-600">
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Liste boutiques */}
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>
        ) : !shops.length ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
            <Store size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Aucune boutique enregistrée.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops.map((shop) => (
              <div key={shop.id} className="rounded-2xl bg-white px-6 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{shop.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[shop.status]}`}>
                        {shop.status === "ACTIVE" ? "Active" : shop.status === "SUSPENDED" ? "Suspendue" : "Expirée"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{shop.ownerName} • {shop.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {shop._count?.users ?? 0} utilisateurs • {shop._count?.products ?? 0} produits • {shop._count?.sales ?? 0} ventes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shop.status !== "ACTIVE" && (
                      <button onClick={() => handleStatusChange(shop.id, "ACTIVE")} className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                        Activer
                      </button>
                    )}
                    {shop.status === "ACTIVE" && (
                      <button onClick={() => handleStatusChange(shop.id, "SUSPENDED")} className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200">
                        Suspendre
                      </button>
                    )}
                    <button onClick={() => setResetId(shop.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                      Réinit. MDP
                    </button>
                    <button onClick={() => handleDelete(shop.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}