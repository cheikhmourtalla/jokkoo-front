import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { getClients, createClient, updateClient, deleteClient } from "../services/index";
import { exportClientsToExcel } from "../utils/exportExcel";
import { Download } from "lucide-react";
import { getStoredUser } from "../types/auth";
import type { Client } from "../types/index";
import { isAdmin } from "../types/auth";

const emptyForm = { name: "", phone: "", email: "", address: "" };
const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const admin = isAdmin();

  const fetchClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
      setFiltered(data);
    } catch { toast.error("Erreur chargement clients"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ));
  }, [search, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error("Nom et téléphone obligatoires");
    setSubmitting(true);
    try {
      if (editingId) {
        await updateClient(editingId, form);
        toast.success("Client modifié");
      } else {
        await createClient(form);
        toast.success("Client créé");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchClients();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const handleEdit = (c: Client) => {
    setForm({ name: c.name, phone: c.phone, email: c.email || "", address: c.address || "" });
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce client ?")) return;
    try {
      await deleteClient(id);
      toast.success("Client supprimé");
      await fetchClients();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur suppression");
    }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <section className="space-y-6">
      {/* Barre actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
        >
          <Plus size={16} /> Nouveau client
        </button>
        <button onClick={() => exportClientsToExcel(clients, user?.shopName || "Boutique")}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
          <Download size={15} /> Excel
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? "Modifier" : "Nouveau"} client</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Nom *", key: "name", placeholder: "Prénom Nom", type: "text" },
              { label: "Téléphone *", key: "phone", placeholder: "77 000 00 00", type: "tel" },
              { label: "Email", key: "email", placeholder: "email@client.com", type: "email" },
              { label: "Adresse", key: "address", placeholder: "Quartier, Ville", type: "text" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={submitting}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Créer"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} client(s)</p>

      {/* Liste clients */}
      {!filtered.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
          {search ? `Aucun client pour "${search}"` : "Aucun client enregistré."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <div key={client.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.phone}{client.email ? ` • ${client.email}` : ""}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Solde restant */}
                  {(client.totalRemaining ?? 0) > 0 && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      Doit : {fmt(client.totalRemaining ?? 0)}
                    </span>
                  )}
                  {(client.totalRemaining ?? 0) === 0 && (client.totalPurchases ?? 0) > 0 && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      À jour
                    </span>
                  )}

                  <button onClick={() => handleEdit(client)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    Modifier
                  </button>
                  {admin && (
                    <button onClick={() => handleDelete(client.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Supprimer
                    </button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                    className="text-gray-400 hover:text-gray-600">
                    {expandedId === client.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Détails financiers */}
              {expandedId === client.id && (
                <div className="border-t bg-slate-50 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-400">Total acheté</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{fmt(client.totalPurchases ?? 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-400">Total payé</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">{fmt(client.totalPaid ?? 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-400">Reste à payer</p>
                      <p className={`mt-1 text-sm font-bold ${(client.totalRemaining ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmt(client.totalRemaining ?? 0)}
                      </p>
                    </div>
                  </div>
                  {client.address && (
                    <p className="mt-3 text-sm text-gray-500">📍 {client.address}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}