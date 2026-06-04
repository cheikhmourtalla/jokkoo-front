import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login } from "../services/index";
import logo from "../assets/logo.svg";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      localStorage.setItem("shopName", res.user.shopName || "Jokko Business");

      // Charger le logo de la boutique après connexion
      try {
        const { api } = await import("../services/api");
        const shopRes = await api.get("/shop/settings");
        if (shopRes.data.logoUrl) {
          localStorage.setItem("shopLogo", shopRes.data.logoUrl);
        } else {
          localStorage.removeItem("shopLogo");
        }
      } catch { /* pas grave si ça échoue */ }

      toast.success("Connexion réussie");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 p-2">
            <img src={logo} alt="Jokko Business" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Jokko Business</h1>
          <p className="mt-2 text-sm text-gray-500">Connectez-vous à votre espace de gestion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="admin@boutique.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Super Administrateur ?{" "}
          <a href="/super-admin" className="text-emerald-600 hover:underline">
            Accès plateforme
          </a>
        </p>
      </div>
    </div>
  );
}