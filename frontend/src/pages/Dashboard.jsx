import { useEffect, useMemo, useState } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import { io } from "socket.io-client";
import { fetchData, fetchStats, downloadCsv } from "../api.js";

const socketUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_SOCKET_URL || window.location.origin);

export function Dashboard() {
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, s] = await Promise.all([fetchData(400), fetchStats()]);
        if (!cancelled) {
          setReadings(d);
          setStats(s);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = io(socketUrl, { path: "/socket.io", transports: ["websocket", "polling"] });
    socket.on("energy:reading", (r) => {
      setReadings((prev) => [...prev.slice(-399), r]);
    });
    socket.on("energy:alert", (a) => {
      setAlerts((prev) => [{ ...a, id: Date.now() + Math.random() }, ...prev].slice(0, 5));
    });
    return () => socket.disconnect();
  }, []);

  const total24h = stats?.last24h?.totalWattSum ?? 0;
  const latest = readings[readings.length - 1];

  const lineData = useMemo(() => {
    const slice = readings.slice(-80);
    return {
      labels: slice.map((r) => new Date(r.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: "Power (W)",
          data: slice.map((r) => r.energyValue),
          borderColor: "var(--chart-1)",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          fill: true,
          tension: 0.25,
        },
      ],
    };
  }, [readings]);

  const barData = useMemo(() => {
    const by = stats?.last24h?.byDevice || [];
    return {
      labels: by.map((b) => b._id),
      datasets: [
        {
          label: "24h sum (W·samples)",
          data: by.map((b) => Math.round(b.total)),
          backgroundColor: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"],
        },
      ],
    };
  }, [stats]);

  const pieData = useMemo(() => {
    const by = stats?.last24h?.byDevice || [];
    const sum = by.reduce((s, b) => s + b.total, 0) || 1;
    return {
      labels: by.map((b) => b._id),
      datasets: [
        {
          data: by.map((b) => Math.round((b.total / sum) * 100)),
          backgroundColor: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"],
        },
      ],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "var(--muted)" } } },
    scales: {
      x: { ticks: { color: "var(--muted)", maxRotation: 45 } },
      y: { ticks: { color: "var(--muted)" } },
    },
  };

  if (loading) return <p className="loading">Loading dashboard…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <>
      {(alerts.length > 0 || (stats?.alerts?.length ?? 0) > 0) && (
        <div className="no-print">
          {stats?.alerts?.map((a, i) => (
            <div key={`s-${i}`} className="alert-banner">
              {a.message}
            </div>
          ))}
          {alerts.map((a) => (
            <div key={a.id} className="alert-banner">
              Live: {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="toolbar no-print" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn" onClick={() => downloadCsv()}>
          Export CSV
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Save as PDF (print)
        </button>
        <span className="badge badge-live">Live MQTT</span>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h2>24h aggregate (sum of samples)</h2>
          <div className="kpi">{Math.round(total24h).toLocaleString()}</div>
          <div className="kpi-sub">Combined reported power readings</div>
        </div>
        <div className="card">
          <h2>Latest reading</h2>
          <div className="kpi">{latest ? `${Math.round(latest.energyValue)} W` : "—"}</div>
          <div className="kpi-sub">{latest ? `${latest.deviceName}` : "Waiting for data"}</div>
        </div>
        <div className="card">
          <h2>Devices tracked</h2>
          <div className="kpi">3</div>
          <div className="kpi-sub">AC, Lights, Refrigerator</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ minHeight: 320 }}>
          <h2>Power over time</h2>
          <div style={{ height: 260 }}>
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div className="card" style={{ minHeight: 320 }}>
          <h2>24h load by device</h2>
          <div style={{ height: 260 }}>
            <Bar data={barData} options={{ ...chartOptions, scales: { x: chartOptions.scales.x, y: chartOptions.scales.y } }} />
          </div>
        </div>
        <div className="card" style={{ minHeight: 320 }}>
          <h2>Share of usage (%)</h2>
          <div style={{ height: 260 }}>
            <Pie
              data={pieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "var(--muted)" } } },
              }}
            />
          </div>
        </div>
        <div className="card">
          <h2>Recent readings</h2>
          <div className="list-readings">
            {[...readings].reverse().slice(0, 12).map((r) => (
              <div key={r._id}>
                <span>
                  {r.deviceName} · {Math.round(r.energyValue)} W
                </span>
                <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
