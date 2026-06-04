import { useEffect, useState, useRef, useCallback } from "react";

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

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Fermer la connexion précédente si elle existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `http://localhost:5000/api/notifications/stream`;

    // EventSource ne supporte pas les headers — on passe le token en query param
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
      // Reconnexion automatique après 5 secondes
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  return { alerts, connected };
}