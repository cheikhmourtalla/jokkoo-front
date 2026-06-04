import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Search, AlertTriangle, ChevronDown, ChevronUp, Upload, Trash2 } from "lucide-react";
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, getSuppliers, addStockEntry, api,
} from "../services/index";
import type { Product, Category, Supplier } from "../types/index";
import { isAdmin } from "../types/auth";

const emptyForm = {
  name: "", description: "", reference: "",
  categoryId: "" as string | number,
  quantity: 0, purchasePrice: 0, salePrice: 0,
  alertThreshold: 5, imageUrl: "",
  semiWholesalePrice: "" as number | string,
  semiWholesaleMinQty: "" as number | string,
  wholesalePrice: "" as number | string,
  wholesaleMinQty: "" as number | string,
};
const emptySupplierForm = { supplierId: 0, createDebt: false, unitCost: 0, paidAmount: 0 };
const fmt = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [showSupplierSection, setShowSupplierSection] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Upload image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const admin = isAdmin();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, cats, sups] = await Promise.all([
        getProducts({ search, categoryId: categoryFilter, page, limit: 6 }),
        getCategories(),
        getSuppliers(),
      ]);
      setProducts(prodRes.data);
      setTotal(prodRes.pagination.total);
      setTotalPages(prodRes.pagination.totalPages);
      setCategories(cats);
      setSuppliers(sups);
    } catch { toast.error("Erreur chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, categoryFilter, page]);

  const totalCost = supplierForm.unitCost > 0 && form.quantity > 0
    ? supplierForm.unitCost * Number(form.quantity) : 0;
  const reste = totalCost > 0 ? totalCost - supplierForm.paidAmount : 0;

  const resetForm = () => {
    setForm(emptyForm);
    setSupplierForm(emptySupplierForm);
    setShowSupplierSection(false);
    setEditingId(null);
    setShowForm(false);
    setImagePreview("");
  };

  // ── Upload image ──────────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immédiat
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/upload/product-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((p) => ({ ...p, imageUrl: res.data.imageUrl }));
      toast.success("Image uploadée");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur upload");
      setImagePreview("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setForm((p) => ({ ...p, imageUrl: "" }));
    setImagePreview("");
  };

  // ── Soumettre le formulaire ───────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.purchasePrice || !form.salePrice) {
      return toast.error("Nom, prix d'achat et prix de vente obligatoires");
    }
    if (showSupplierSection && supplierForm.createDebt && !supplierForm.supplierId) {
      return toast.error("Sélectionnez un fournisseur");
    }
    if (showSupplierSection && supplierForm.createDebt && supplierForm.unitCost <= 0) {
      return toast.error("Entrez le coût unitaire");
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        alertThreshold: Number(form.alertThreshold),
        imageUrl: form.imageUrl || undefined,
        semiWholesalePrice: form.semiWholesalePrice !== "" ? Number(form.semiWholesalePrice) : null,
        semiWholesaleMinQty: form.semiWholesaleMinQty !== "" ? Number(form.semiWholesaleMinQty) : null,
        wholesalePrice: form.wholesalePrice !== "" ? Number(form.wholesalePrice) : null,
        wholesaleMinQty: form.wholesaleMinQty !== "" ? Number(form.wholesaleMinQty) : null,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success("Produit modifié");
      } else {
        const created = await createProduct(payload);
        if (showSupplierSection && created.id && Number(form.quantity) > 0) {
          await addStockEntry({
            productId: created.id,
            quantity: Number(form.quantity),
            note: "Stock initial",
            supplierId: supplierForm.supplierId || undefined,
            unitCost: supplierForm.unitCost || undefined,
            paidAmount: supplierForm.paidAmount || undefined,
            createDebt: supplierForm.createDebt,
          } as any);
        }
        toast.success("Produit créé");
      }
      resetForm();
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name, description: p.description || "", reference: p.reference || "",
      categoryId: p.categoryId || "", quantity: p.quantity,
      purchasePrice: p.purchasePrice, salePrice: p.salePrice,
      alertThreshold: p.alertThreshold, imageUrl: p.imageUrl || "",
      semiWholesalePrice: p.semiWholesalePrice ?? "",
      semiWholesaleMinQty: p.semiWholesaleMinQty ?? "",
      wholesalePrice: p.wholesalePrice ?? "",
      wholesaleMinQty: p.wholesaleMinQty ?? "",
    });
    setImagePreview(p.imageUrl || "");
    setEditingId(p.id);
    setShowSupplierSection(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try { await deleteProduct(id); toast.success("Produit supprimé"); await fetchData(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      toast.success("Catégorie créée");
      setNewCategoryName(""); setShowCategoryForm(false);
      const cats = await getCategories();
      setCategories(cats);
    } catch (error: any) { toast.error(error?.response?.data?.message || "Erreur"); }
  };

  return (
    <section className="space-y-6">

      {/* Barre de recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un produit..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500" />
        </div>
        <select value={categoryFilter ?? ""}
          onChange={(e) => { setCategoryFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {admin && (
          <>
            <button onClick={() => setShowCategoryForm((v) => !v)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              + Catégorie
            </button>
            <button onClick={() => { setShowForm(true); resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus size={16} /> Nouveau produit
            </button>
          </>
        )}
      </div>

      {/* Nouvelle catégorie */}
      {showCategoryForm && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          <button onClick={handleCreateCategory} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white">Créer</button>
          <button onClick={() => setShowCategoryForm(false)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700">Annuler</button>
        </div>
      )}

      {/* Formulaire produit */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? "Modifier le produit" : "Nouveau produit"}
            </h3>
            <button onClick={resetForm}><X size={20} className="text-gray-400" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* ── Upload image ──────────────────────────── */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Image du produit</label>
                <div className="flex items-start gap-4">
                  {/* Zone preview / placeholder */}
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative flex h-32 w-32 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition overflow-hidden
                      ${imagePreview ? "border-emerald-300 bg-emerald-50" : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"}`}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Upload size={24} />
                        <span className="text-xs">Cliquer pour uploader</span>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      </div>
                    )}
                  </div>

                  {/* Infos + actions */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      <Upload size={15} />
                      {uploading ? "Upload en cours..." : imagePreview ? "Changer l'image" : "Choisir une image"}
                    </button>

                    {imagePreview && (
                      <button type="button" onClick={handleRemoveImage}
                        className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 size={14} /> Supprimer l'image
                      </button>
                    )}

                    <p className="text-xs text-gray-400">JPG, PNG ou WebP — max 5MB</p>

                    {/* URL manuelle en fallback */}
                    {!imagePreview && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Ou entrer une URL directe :</p>
                        <input type="text" value={form.imageUrl}
                          onChange={(e) => { setForm((p) => ({ ...p, imageUrl: e.target.value })); setImagePreview(e.target.value); }}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          placeholder="https://..." />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nom */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom du produit *</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Ex: Chemise blanche taille M" required />
              </div>

              {/* Référence */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Référence</label>
                <input type="text" value={form.reference}
                  onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="Ex: REF-001" />
              </div>

              {/* Catégorie */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie</label>
                <select value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500">
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Prix achat */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix d'achat (FCFA) *</label>
                <input type="number" min={0} value={form.purchasePrice}
                  onChange={(e) => setForm((p) => ({ ...p, purchasePrice: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required />
              </div>

              {/* Prix vente */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix de vente conseillé (FCFA) *</label>
                <input type="number" min={0} value={form.salePrice}
                  onChange={(e) => setForm((p) => ({ ...p, salePrice: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" required />
              </div>

              {/* Quantité */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quantité initiale</label>
                <input type="number" min={0} value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
              </div>

              {/* Seuil alerte */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Seuil d'alerte</label>
                <input type="number" min={0} value={form.alertThreshold}
                  onChange={(e) => setForm((p) => ({ ...p, alertThreshold: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
              </div>

              {/* Description */}
              {/* Niveaux tarifaires */}
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Niveaux tarifaires</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Optionnel — le prix sera suggéré automatiquement selon la quantité à la vente.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white p-3 space-y-2 border border-gray-200">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Demi-gros</p>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Qté minimum</label>
                        <input type="number" min={1} value={form.semiWholesaleMinQty}
                          onChange={(e) => setForm((p) => ({ ...p, semiWholesaleMinQty: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          placeholder="Ex: 10" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Prix demi-gros (FCFA)</label>
                        <input type="number" min={0} value={form.semiWholesalePrice}
                          onChange={(e) => setForm((p) => ({ ...p, semiWholesalePrice: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          placeholder="Ex: 850" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 space-y-2 border border-gray-200">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Gros</p>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Qté minimum</label>
                        <input type="number" min={1} value={form.wholesaleMinQty}
                          onChange={(e) => setForm((p) => ({ ...p, wholesaleMinQty: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          placeholder="Ex: 50" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Prix gros (FCFA)</label>
                        <input type="number" min={0} value={form.wholesalePrice}
                          onChange={(e) => setForm((p) => ({ ...p, wholesalePrice: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          placeholder="Ex: 700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500 min-h-20"
                  placeholder="Description optionnelle..." />
              </div>
            </div>

            {/* Section fournisseur (création uniquement) */}
            {!editingId && (
              <div className="border-t pt-4">
                <button type="button" onClick={() => setShowSupplierSection((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  {showSupplierSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showSupplierSection ? "Masquer" : "Lier à un fournisseur (optionnel)"}
                </button>

                {showSupplierSection && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 space-y-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Fournisseur pour le stock initial</p>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur</label>
                      <select value={supplierForm.supplierId}
                        onChange={(e) => setSupplierForm((p) => ({ ...p, supplierId: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500">
                        <option value={0}>Sélectionner un fournisseur</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={supplierForm.createDebt}
                        onChange={(e) => setSupplierForm((p) => ({ ...p, createDebt: e.target.checked }))}
                        className="h-4 w-4 accent-emerald-600" />
                      <span className="text-sm text-gray-700">Créer une dette fournisseur</span>
                    </label>
                    {supplierForm.createDebt && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Coût unitaire (FCFA)</label>
                          <input type="number" min={0} value={supplierForm.unitCost}
                            onChange={(e) => setSupplierForm((p) => ({ ...p, unitCost: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Acompte versé (FCFA)</label>
                          <input type="number" min={0} value={supplierForm.paidAmount}
                            onChange={(e) => setSupplierForm((p) => ({ ...p, paidAmount: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500" />
                        </div>
                        {totalCost > 0 && (
                          <div className={`col-span-2 rounded-xl px-4 py-3 text-sm font-medium ${reste > 0 ? "bg-yellow-50 text-yellow-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {reste > 0 ? `⚠️ Reste dû : ${fmt(reste)}` : "✅ Entièrement payé"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting || uploading}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Créer le produit"}
              </button>
              <button type="button" onClick={resetForm}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-sm text-gray-500">{total} produit(s)</p>

      {/* Grille produits */}
      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">Chargement...</div>
      ) : !products.length ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-400">
          {search ? `Aucun résultat pour "${search}"` : "Aucun produit enregistré."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const isLow = product.quantity > 0 && product.quantity <= product.alertThreshold;
            const isOut = product.quantity === 0;
            return (
              <div key={product.id} className="rounded-2xl bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                {/* Image */}
                <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-5xl font-bold text-slate-200">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Badge stock */}
                  {(isLow || isOut) && (
                    <div className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${isOut ? "bg-red-500 text-white" : "bg-yellow-400 text-yellow-900"}`}>
                      <AlertTriangle size={11} />
                      {isOut ? "Rupture" : "Faible"}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold text-slate-900 leading-tight">{product.name}</h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {product.category && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          {product.category.name}
                        </span>
                      )}
                      {product.reference && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {product.reference}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-gray-400">Achat</p>
                      <p className="font-semibold text-slate-700">{fmt(product.purchasePrice)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="text-emerald-600">Détail</p>
                      <p className="font-semibold text-emerald-700">{fmt(product.salePrice)}</p>
                    </div>
                    {product.semiWholesalePrice && (
                      <div className="rounded-lg bg-blue-50 p-2">
                        <p className="text-blue-600">Demi-gros (≥{product.semiWholesaleMinQty})</p>
                        <p className="font-semibold text-blue-700">{fmt(product.semiWholesalePrice)}</p>
                      </div>
                    )}
                    {product.wholesalePrice && (
                      <div className="rounded-lg bg-purple-50 p-2">
                        <p className="text-purple-600">Gros (≥{product.wholesaleMinQty})</p>
                        <p className="font-semibold text-purple-700">{fmt(product.wholesalePrice)}</p>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    isOut ? "bg-red-100 text-red-700"
                    : isLow ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {isOut ? "Rupture de stock"
                      : isLow ? `⚠ Stock faible — ${product.quantity} restant(s)`
                      : `Stock : ${product.quantity} unité(s)`}
                  </div>

                  {admin && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleEdit(product)}
                        className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(product.id)}
                        className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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