"""
Reads JSON from stdin: { "records": [ { "energyValue", "timestamp", "deviceName" }, ... ] }
Writes JSON to stdout with predictions and recommendations.
"""
import json
import sys
from collections import defaultdict
import numpy as np
from sklearn.linear_model import LinearRegression


def main():
    raw = sys.stdin.read()
    data = json.loads(raw or "{}")
    records = data.get("records") or []
    if len(records) < 3:
        print(json.dumps({
            "nextHourWhEstimate": None,
            "nextDayWhEstimate": None,
            "recommendations": ["Need more historical samples for the model."],
            "model": "linear_regression",
        }))
        return

    y = np.array([float(r["energyValue"]) for r in records], dtype=float)
    X = np.arange(len(y), dtype=float).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, y)

    # Next step index predicts instantaneous power trend; scale to hour/day heuristics
    next_idx = np.array([[len(y)]])
    next_point_w = float(model.predict(next_idx)[0])

    # Rough Wh estimates: assume readings ~every few seconds; use avg interval from timestamps
    # Treat predicted W as representative average power for the next interval; Wh for 1h ≈ W * 1h
    next_hour_wh = max(0, next_point_w * 1.0)
    next_day_wh = next_hour_wh * 24

    by_device = defaultdict(list)
    for r in records:
        by_device[r.get("deviceName", "unknown")].append(float(r["energyValue"]))
    avg_by = {k: float(np.mean(v)) for k, v in by_device.items()}
    sorted_dev = sorted(avg_by.items(), key=lambda x: -x[1])
    top = sorted_dev[0][0] if sorted_dev else None

    recs = []
    if top and top != "unknown":
        recs.append(f"Highest average load is from {top}. Reduce usage during peak hours if possible.")
    recs.append("Turn off unused lights and set AC to eco mode when rooms are empty.")
    if next_point_w > np.percentile(y, 75):
        recs.append("Predicted usage is trending above recent levels; stagger high-draw appliances.")

    out = {
        "nextHourWhEstimate": round(next_hour_wh, 2),
        "nextDayWhEstimate": round(next_day_wh, 2),
        "predictedNextReadingWatts": round(next_point_w, 2),
        "recommendations": recs,
        "model": "linear_regression",
        "trainingSamples": len(y),
        "deviceAveragesWatts": {k: round(v, 2) for k, v in avg_by.items()},
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
