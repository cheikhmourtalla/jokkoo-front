import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Upload, Trash2, Save, Building2, Phone, MapPin, User } from "lucide-react";
import { api } from "../services/api";
import { getStoredUser } from "../types/auth";

type ShopInfo = {
  id: number;
  name: string;
  ownerName: string;
  email: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  status: string;
  subscriptions: { plan: string; status: string; endDate: string }[];
  _count: { users: number; products: number; sales: number; clients: number };
};

export default function Settings() {
  const user = getStoredUser();
  const isAdmin = user?.role === "ADMIN";

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "", ownerName: "", phone: "", address: "",
  });

  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchShop = async () => {
    try {
      const res = await api.get("/shop/settings");
      setShop(res.data);
      setForm({
        name: res.data.name,
        ownerName: res.data.ownerName,
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
      setLogoPreview(res.data.logoUrl || "");

      // Sauvegarder le logo en localStorage pour la sidebar et les factures
      if (res.data.logoUrl) {
        localStorage.setItem("shopLogo", res.data.logoUrl);
        localStorage.setItem("shopName", res.data.name);
      }
    } catch {
      toast.error("Erreur chargement paramètres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShop(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ownerName) {
      return toast.error("Nom boutique et propriétaire obligatoires");
    }
    setSaving(true);
    try {
      const res = await api.put("/shop/settings", form);
      setShop(res.data.shop);
      localStorage.setItem("shopName", res.data.shop.name);
      // Mettre à jour le user en localStorage
      const currentUser = getStoredUser();
      if (currentUser) {
        localStorage.setItem("user", JSON.stringify({
          ...currentUser,
          shopName: res.data.shop.name,
        }));
      }
      toast.success("Paramètres sauvegardés");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally {
      setSaving(false); }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immédiat
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await api.post("/shop/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoPreview(res.data.logoUrl);
      localStorage.setItem("shopLogo", res.data.logoUrl);
      toast.success("Logo mis à jour — visible sur vos factures");
      // Forcer le rechargement de la sidebar
      window.dispatchEvent(new Event("shopLogoUpdated"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur upload logo");
      setLogoPreview(shop?.logoUrl || "");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Supprimer le logo de la boutique ?")) return;
    try {
      await api.delete("/shop/logo");
      setLogoPreview("");
      localStorage.removeItem("shopLogo");
      toast.success("Logo supprimé");
      window.dispatchEvent(new Event("shopLogoUpdated"));
    } catch {
      toast.error("Erreur suppression logo");
    }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  const subscription = shop?.subscriptions?.[0];

  return (
    <section className="space-y-6 max-w-3xl">

      {/* Infos boutique rapides */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Produits", value: shop?._count?.products ?? 0 },
          { label: "Clients", value: shop?._count?.clients ?? 0 },
          { label: "Ventes", value: shop?._count?.sales ?? 0 },
          { label: "Utilisateurs", value: shop?._count?.users ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Abonnement */}
      {subscription && (
        <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${
          subscription.status === "ACTIVE" ? "bg-emerald-50 border border-emerald-200"
          : "bg-red-50 border border-red-200"
        }`}>
          <div>
            <p className={`font-semibold ${subscription.status === "ACTIVE" ? "text-emerald-800" : "text-red-800"}`}>
              Abonnement {subscription.plan} —{" "}
              {subscription.status === "ACTIVE" ? "✅ Actif" : "❌ Expiré"}
            </p>
            <p className={`text-sm mt-0.5 ${subscription.status === "ACTIVE" ? "text-emerald-600" : "text-red-600"}`}>
              Expire le {new Date(subscription.endDate).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric"
              })}
            </p>
          </div>
        </div>
      )}

      {/* Logo de la boutique */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-lg font-bold text-slate-900">Logo de la boutique</h3>
        <p className="mb-5 text-sm text-gray-500">
          Ce logo apparaîtra dans la barre latérale et sur toutes vos factures.
        </p>

        <div className="flex items-start gap-6">
          {/* Preview logo */}
          <div
            onClick={() => isAdmin && !uploading && fileInputRef.current?.click()}
            className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 overflow-hidden transition
              ${isAdmin ? "cursor-pointer" : "cursor-default"}
              ${logoPreview ? "border-emerald-300 bg-emerald-50" : "border-dashed border-gray-300 bg-gray-50 hover:border-emerald-400"}`}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo boutique" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Building2 size={28} />
                <span className="text-xs text-center px-1">Pas de logo</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Actions */}
          {isAdmin && (
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload size={15} />
                {uploading ? "Upload en cours..." : logoPreview ? "Changer le logo" : "Uploader un logo"}
              </button>

              {logoPreview && (
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Supprimer le logo
                </button>
              )}

              <p className="text-xs text-gray-400">JPG, PNG, WebP ou SVG — max 3MB</p>
              <p className="text-xs text-emerald-600 font-medium">
                💡 Le logo sera immédiatement visible sur vos nouvelles factures.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Informations de la boutique */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-lg font-bold text-slate-900">Informations de la boutique</h3>
        <p className="mb-5 text-sm text-gray-500">
          Ces informations apparaissent sur vos factures.
          {!isAdmin && <span className="ml-1 text-orange-500">Seul l'administrateur peut modifier ces informations.</span>}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Building2 size={14} className="inline mr-1.5 text-gray-400" />
                Nom de la boutique *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={!isAdmin}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Ex: Boutique Fatou"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <User size={14} className="inline mr-1.5 text-gray-400" />
                Nom du propriétaire *
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
                disabled={!isAdmin}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Ex: Fatou Diallo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Phone size={14} className="inline mr-1.5 text-gray-400" />
                Téléphone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={!isAdmin}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Ex: 77 000 00 00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <MapPin size={14} className="inline mr-1.5 text-gray-400" />
                Adresse
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                disabled={!isAdmin}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Ex: Dakar, Sénégal"
              />
            </div>
          </div>

          {/* Email (non modifiable) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email (identifiant de connexion)</label>
            <input
              type="email"
              value={shop?.email || ""}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">L'email ne peut être modifié que par le Super Administrateur.</p>
          </div>

          {isAdmin && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              <Save size={15} />
              {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
            </button>
          )}
        </form>
      </div>

    </section>
  );
}