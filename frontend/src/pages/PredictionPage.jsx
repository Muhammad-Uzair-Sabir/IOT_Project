import { useEffect, useState } from "react";
import { fetchPrediction } from "../api.js";

export function PredictionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const p = await fetchPrediction();
      setData(p);
    } catch (e) {
      setError(e.message || "Prediction failed. Is Python + scikit-learn installed?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) return <p className="loading">Running ML model…</p>;

  return (
    <>
      <div className="toolbar no-print" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, flex: 1, fontSize: "1.35rem" }}>Prediction & recommendations</h1>
        <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {data && (
        <div className="grid grid-2">
          <div className="card">
            <h2>Next hour (estimate)</h2>
            <div className="kpi">{data.nextHourWhEstimate != null ? `${data.nextHourWhEstimate} Wh` : "—"}</div>
            <div className="kpi-sub">Linear regression on recent power trend</div>
          </div>
          <div className="card">
            <h2>Next day (scaled)</h2>
            <div className="kpi">{data.nextDayWhEstimate != null ? `${data.nextDayWhEstimate} Wh` : "—"}</div>
            <div className="kpi-sub">24× hourly heuristic from model</div>
          </div>
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h2>Model output</h2>
            <p style={{ color: "var(--muted)", margin: "0 0 0.75rem" }}>
              Predicted next reading:{" "}
              <strong>{data.predictedNextReadingWatts != null ? `${data.predictedNextReadingWatts} W` : "—"}</strong>
              {" · "}
              Samples: {data.trainingSamples ?? "—"} ({data.model})
            </p>
            {data.deviceAveragesWatts && (
              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)" }}>
                {Object.entries(data.deviceAveragesWatts).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v} W avg
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h2>Recommendations</h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {(data.recommendations || []).map((r, i) => (
                <li key={i} style={{ marginBottom: "0.35rem" }}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
