import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser } from "../services/index";
import type { User } from "../types/index";
import { getStoredUser } from "../types/auth";

const emptyForm = { name: "", email: "", password: "", role: "EMPLOYEE" };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const currentUser = getStoredUser();

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch { toast.error("Erreur chargement utilisateurs"); }
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
        const data: any = { name: form.name, role: form.role };
        if (form.password) data.password = form.password;
        await updateUser(editingId, data);
        toast.success("Utilisateur modifié");
      } else {
        await createUser(form);
        toast.success("Utilisateur créé");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      toast.success(user.isActive ? "Compte désactivé" : "Compte activé");
      await fetchUsers();
    } catch { toast.error("Erreur"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await deleteUser(id);
      toast.success("Utilisateur supprimé");
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur suppression");
    }
  };

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? "Modifier" : "Nouvel"} utilisateur</h3>
            <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" placeholder="Prénom Nom" />
            </div>
            {!editingId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" placeholder="email@boutique.com" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{editingId ? "Nouveau mot de passe" : "Mot de passe *"}</label>
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rôle</label>
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500">
                <option value="EMPLOYEE">Employé</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Créer"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {!users.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Aucun utilisateur trouvé.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-gray-500">
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rôle</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {user.name}
                      {user.id === currentUser?.id && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">Vous</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {user.role === "ADMIN" ? "Admin" : "Employé"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {user.id !== currentUser?.id && (
                      <div className="flex gap-2">
                        <button onClick={() => { setForm({ name: user.name, email: user.email, password: "", role: user.role }); setEditingId(user.id); setShowForm(true); }}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">Modifier</button>
                        <button onClick={() => handleToggleActive(user)}
                          className={`rounded-lg border px-3 py-1 text-xs ${user.isActive ? "border-yellow-200 text-yellow-600 hover:bg-yellow-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                          {user.isActive ? "Désactiver" : "Activer"}
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}