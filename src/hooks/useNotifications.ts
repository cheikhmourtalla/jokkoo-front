import { useEffect, useState, useRef, useCallback } from "react";
import { getProducts } from "../services/index";

type StockAlert = {
  id: number;
  name: string;
  quantity: number;
  alertThreshold?: number;
};

type NotificationState = {
  lowStock: StockAlert[];
  outOfStock: StockAlert[];
  total: number;
  lastUpdate: Date | null;
};

const API_URL = import.meta.env.VITE_API_URL || "https://jokko-back.onrender.com/api";

export function useNotifications() {
  const [alerts, setAlerts] = useState<NotificationState>({
    lowStock: [],
    outOfStock: [],
    total: 0,
    lastUpdate: null,
  });
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement initial : calcule les alertes depuis la liste actuelle des produits
  const loadInitialAlerts = useCallback(async () => {
    try {
      const res = await getProducts({ limit: 1000 });
      const products = res.data || [];

      const lowStock: StockAlert[] = [];
      const outOfStock: StockAlert[] = [];

      products.forEach((p: any) => {
        if (!p.isActive) return;
        if (p.quantity === 0) {
          outOfStock.push({ id: p.id, name: p.name, quantity: p.quantity, alertThreshold: p.alertThreshold });
        } else if (p.quantity > 0 && p.quantity <= (p.alertThreshold ?? 5)) {
          lowStock.push({ id: p.id, name: p.name, quantity: p.quantity, alertThreshold: p.alertThreshold });
        }
      });

      setAlerts({
        lowStock,
        outOfStock,
        total: lowStock.length + outOfStock.length,
        lastUpdate: new Date(),
      });
    } catch (e) {
      console.error("Erreur chargement alertes initiales", e);
    }
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_URL}/notifications/stream`;
    const es = new EventSource(`${url}?token=${token}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.addEventListener("stock_alert", (e) => {
      const data = JSON.parse(e.data);
      setAlerts({
        lowStock: data.lowStock || [],
        outOfStock: data.outOfStock || [],
        total: data.total || 0,
        lastUpdate: new Date(),
      });
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, []);

  useEffect(() => {
    loadInitialAlerts();
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect, loadInitialAlerts]);

  return { alerts, connected };
}