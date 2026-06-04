import { useState, useRef, useEffect } from "react";
import { Bell, X, AlertTriangle, Ban, Wifi, WifiOff } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { alerts, connected } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fermer le panel si clic à l'extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasAlerts = alerts.total > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
      >
        <Bell size={18} />

        {/* Badge compteur */}
        {hasAlerts && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
            {alerts.total > 9 ? "9+" : alerts.total}
          </span>
        )}

        {/* Indicateur connexion SSE */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${connected ? "bg-emerald-400" : "bg-gray-400"}`} />
      </button>

      {/* Panel notifications */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
          {/* Header panel */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Bell size={16} />
              <span className="text-sm font-semibold">Alertes stock</span>
              {hasAlerts && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">
                  {alerts.total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {connected
                ? <><Wifi size={12} className="text-emerald-400" /><span className="text-xs text-emerald-400">En direct</span></>
                : <><WifiOff size={12} className="text-gray-400" /><span className="text-xs text-gray-400">Reconnexion...</span></>
              }
              <button onClick={() => setOpen(false)} className="ml-2 text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="max-h-96 overflow-y-auto">
            {!hasAlerts ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center px-4">
                <div className="rounded-full bg-emerald-100 p-3">
                  <Bell size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Tout est en ordre ✅</p>
                  <p className="text-xs text-gray-400 mt-0.5">Aucune alerte de stock.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">

                {/* Ruptures */}
                {alerts.outOfStock.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 bg-red-50 px-4 py-2">
                      <Ban size={13} className="text-red-500" />
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                        Rupture ({alerts.outOfStock.length})
                      </span>
                    </div>
                    {alerts.outOfStock.map((p) => (
                      <div key={p.id}
                        onClick={() => { navigate("/stock"); setOpen(false); }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-red-50 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-40">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                          0 unité
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stock faible */}
                {alerts.lowStock.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2">
                      <AlertTriangle size={13} className="text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                        Stock faible ({alerts.lowStock.length})
                      </span>
                    </div>
                    {alerts.lowStock.map((p) => (
                      <div key={p.id}
                        onClick={() => { navigate("/stock"); setOpen(false); }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-yellow-50 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold text-yellow-600">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-40">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-600">
                          {p.quantity} restant{p.quantity > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasAlerts && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
              <button
                onClick={() => { navigate("/stock"); setOpen(false); }}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-medium text-white hover:opacity-90 transition"
              >
                Gérer le stock →
              </button>
              {alerts.lastUpdate && (
                <p className="text-center text-xs text-gray-400">
                  Mis à jour à {alerts.lastUpdate.toLocaleTimeString("fr-FR")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}