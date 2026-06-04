import { useState, useEffect } from "react";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart,
  Menu, X, ChevronRight, Users, Truck, Wallet,
  UserCog, FileText, Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.svg";

const allLinks = [
  { name: "Tableau de bord", path: "/",         icon: LayoutDashboard, adminOnly: false },
  { name: "Caisse",          path: "/cash",      icon: Wallet,          adminOnly: false },
  { name: "Produits",        path: "/products",  icon: Package,         adminOnly: false },
  { name: "Clients",         path: "/clients",   icon: Users,           adminOnly: false },
  { name: "Fournisseurs",    path: "/suppliers", icon: Truck,           adminOnly: false },
  { name: "Stock",           path: "/stock",     icon: Boxes,           adminOnly: false },
  { name: "Ventes",          path: "/sales",     icon: ShoppingCart,    adminOnly: false },
  { name: "Factures",        path: "/invoices",  icon: FileText,        adminOnly: false },
  { name: "Utilisateurs",    path: "/users",     icon: UserCog,         adminOnly: true  },
  { name: "Paramètres",      path: "/settings",  icon: Settings,        adminOnly: true  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const role = JSON.parse(localStorage.getItem("user") || "{}").role;
  const links = allLinks.filter((l) => !l.adminOnly || role === "ADMIN");

  // Logo dynamique de la boutique
  const [shopLogo, setShopLogo] = useState<string>(
    localStorage.getItem("shopLogo") || ""
  );
  const shopName = JSON.parse(localStorage.getItem("user") || "{}").shopName || "Jokko Business";

  useEffect(() => {
    const handler = () => setShopLogo(localStorage.getItem("shopLogo") || "");
    window.addEventListener("shopLogoUpdated", handler);
    return () => window.removeEventListener("shopLogoUpdated", handler);
  }, []);

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {shopLogo ? (
              <img src={shopLogo} alt={shopName}
                className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
            ) : (
              <img src={logo} alt="Jokko Business"
                className="h-10 w-10 rounded-xl bg-white p-1 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold truncate max-w-[130px]">{shopName}</h1>
              <p className="text-xs text-white/50">Gestion commerciale</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10 md:hidden">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink key={link.path} to={link.path} onClick={onClose} end={link.path === "/"}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }>
              <div className="flex items-center gap-3">
                <Icon size={17} />
                <span>{link.name}</span>
              </div>
              <ChevronRight size={14} className="opacity-30 group-hover:opacity-60" />
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold text-white/80">v1.0</p>
          <p className="text-xs text-white/40">Jokko Business SaaS</p>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-slate-900 p-3 text-white shadow-lg md:hidden">
        <Menu size={20} />
      </button>
      <aside className="hidden min-h-screen w-64 shrink-0 md:flex">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}