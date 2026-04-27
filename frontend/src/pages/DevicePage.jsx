import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Line, Bar } from "react-chartjs-2";
import { io } from "socket.io-client";
import { fetchDeviceData, downloadCsv } from "../api.js";

const socketUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_SOCKET_URL || window.location.origin);
const names = {
  ac: "Air Conditioner",
  lights: "Lights",
  fridge: "Refrigerator",
};

export function DevicePage() {
  const { deviceId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchDeviceData(deviceId, 400);
        if (!cancelled) setRows(d);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    const socket = io(socketUrl, { path: "/socket.io", transports: ["websocket", "polling"] });
    const label = names[deviceId];
    socket.on("energy:reading", (r) => {
      if (r.deviceName === label) {
        setRows((prev) => [...prev.slice(-399), r]);
      }
    });
    return () => socket.disconnect();
  }, [deviceId]);

  const title = names[deviceId] || deviceId;

  const stats = useMemo(() => {
    if (!rows.length) return { avg: 0, max: 0, min: 0 };
    const vals = rows.map((r) => r.energyValue);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      avg: sum / vals.length,
      max: Math.max(...vals),
      min: Math.min(...vals),
    };
  }, [rows]);

  const lineData = useMemo(() => {
    const slice = rows.slice(-100);
    return {
      labels: slice.map((r) => new Date(r.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: `${title} (W)`,
          data: slice.map((r) => r.energyValue),
          borderColor: "var(--chart-2)",
          backgroundColor: "rgba(124, 58, 237, 0.12)",
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [rows, title]);

  const barData = useMemo(() => {
    const buckets = rows.slice(-24).map((r) => Math.round(r.energyValue));
    return {
      labels: buckets.map((_, i) => `#${i + 1}`),
      datasets: [{ label: "Recent samples", data: buckets, backgroundColor: "var(--chart-3)" }],
    };
  }, [rows]);

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "var(--muted)" } } },
    scales: {
      x: { ticks: { color: "var(--muted)" } },
      y: { ticks: { color: "var(--muted)" } },
    },
  };

  if (loading) return <p className="loading">Loading device…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <>
      <div className="toolbar no-print" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, flex: 1, fontSize: "1.35rem" }}>{title}</h1>
        <button type="button" className="btn" onClick={() => downloadCsv(deviceId)}>
          Export CSV
        </button>
        <span className="badge badge-live">Live</span>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h2>Average (window)</h2>
          <div className="kpi">{Math.round(stats.avg)} W</div>
        </div>
        <div className="card">
          <h2>Peak</h2>
          <div className="kpi">{Math.round(stats.max)} W</div>
        </div>
        <div className="card">
          <h2>Minimum</h2>
          <div className="kpi">{Math.round(stats.min)} W</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ minHeight: 300 }}>
          <h2>Time vs power</h2>
          <div style={{ height: 240 }}>
            <Line data={lineData} options={opts} />
          </div>
        </div>
        <div className="card" style={{ minHeight: 300 }}>
          <h2>Recent sample bars</h2>
          <div style={{ height: 240 }}>
            <Bar data={barData} options={opts} />
          </div>
        </div>
      </div>
    </>
  );
}
