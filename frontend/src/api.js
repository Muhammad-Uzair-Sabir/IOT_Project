const API_BASE = "";

function authHeaders() {
  const token = localStorage.getItem("token");
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return res.text();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Config failed");
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handle(res);
}

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders() });
  return handle(res);
}

export async function fetchData(limit = 300) {
  const res = await fetch(`${API_BASE}/data?limit=${limit}`, { headers: authHeaders() });
  return handle(res);
}

export async function fetchDeviceData(device, limit = 300) {
  const res = await fetch(`${API_BASE}/data/${device}?limit=${limit}`, { headers: authHeaders() });
  return handle(res);
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, { headers: authHeaders() });
  return handle(res);
}

export async function fetchPrediction() {
  const res = await fetch(`${API_BASE}/prediction`, { headers: authHeaders() });
  return handle(res);
}

export async function downloadCsv(device) {
  const q = device ? `?device=${encodeURIComponent(device)}` : "";
  const res = await fetch(`${API_BASE}/export/csv${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "energy_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
