import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { getStoredUser } from "../types/auth";
import NotificationBell from "./NotificationBell";

const pageConfig: Record<string, { title: string; description: string }> = {
  "/":          { title: "Tableau de bord",  description: "Vue d'ensemble de votre activité." },
  "/products":  { title: "Produits",         description: "Gérez vos produits et alertes de stock." },
  "/clients":   { title: "Clients",          description: "Gérez vos clients et suivez leurs comptes." },
  "/suppliers": { title: "Fournisseurs",     description: "Gérez vos fournisseurs et dettes." },
  "/stock":     { title: "Stock",            description: "Enregistrez les entrées et sorties de stock." },
  "/sales":     { title: "Ventes",           description: "Enregistrez et suivez vos ventes." },
  "/invoices":  { title: "Factures",         description: "Consultez, recherchez et gérez vos factures." },
  "/cash":      { title: "Caisse",           description: "Gérez votre caisse journalière." },
  "/users":     { title: "Utilisateurs",     description: "Gérez les comptes de votre boutique." },
  "/settings":  { title: "Paramètres",         description: "Gérez les informations et le logo de votre boutique." },
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();

  const currentPage = pageConfig[location.pathname] || {
    title: "Jokko Business",
    description: "Gestion commerciale intelligente.",
  };

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="rounded-2xl bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{currentPage.title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{currentPage.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-gray-400">
              {user?.role === "ADMIN" ? "Administrateur" : "Employé"} • {user?.shopName}
            </p>
            <p className="text-xs capitalize text-gray-400">{currentDate}</p>
          </div>
          <NotificationBell />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <button type="button" onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition">
            <LogOut size={15} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}