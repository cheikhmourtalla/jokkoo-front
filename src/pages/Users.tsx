import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, UserCog } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser } from "../services/index";
import type { User } from "../types/index";

const emptyForm = { name: "", email: "", password: "", role: "EMPLOYEE" };

const roleLabel: Record<string, string> = {
  ADMIN: "Administrateur",
  EMPLOYEE: "Employé",
};
const roleBadge: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  EMPLOYEE: "bg-blue-100 text-blue-700",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try { setUsers(await getUsers()); }
    catch { toast.error("Erreur chargement utilisateurs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error("Nom et email obligatoires");
    if (!editingId && !form.password) return toast.error("Mot de passe obligatoire");
    setSubmitting(true);
    try {
      if (editingId) {
        await updateUser(editingId, { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) });
        toast.success("Utilisateur modifié");
      } else {
        await createUser(form);
        toast.success("Utilisateur créé");
      }
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try { await deleteUser(id); toast.success("Utilisateur supprimé"); await fetchUsers(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <section className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom complet *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                placeholder="Ex: Fatou Diallo" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={!!editingId}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="email@boutique.com" required={!editingId} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mot de passe {editingId ? "(laisser vide pour ne pas changer)" : "*"}
              </label>
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                placeholder="••••••••" required={!editingId} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rôle</label>
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500">
                <option value="EMPLOYEE">Employé</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={submitting}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition">
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

      {/* Liste utilisateurs */}
      {!users.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
          <UserCog size={40} className="mx-auto mb-3 text-gray-300" />
          <p>Aucun utilisateur enregistré.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Avatar + infos */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[user.role]}`}>
                        {roleLabel[user.role]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => {
                    setForm({ name: user.name, email: user.email, password: "", role: user.role });
                    setEditingId(user.id);
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(user.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}