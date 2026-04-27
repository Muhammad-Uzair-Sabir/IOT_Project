import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import crypto from "crypto";

import { Device } from "./models/Device.js";
import { EnergyData } from "./models/EnergyData.js";
import { seedDevices } from "./seed.js";
import { connectMqtt } from "./services/mqttClient.js";
import { runPrediction } from "./services/prediction.js";

const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/iot_energy";
const MQTT_URL = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const DEMO_USER = process.env.DEMO_USER || "demo";
const DEMO_PASS = process.env.DEMO_PASS || "demo123";
const SKIP_AUTH = process.env.SKIP_AUTH === "true";

/** Simple signed token (not full JWT) for demo login */
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  if (expect !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  req.user = verifyToken(token);
  next();
}

function requireAuth(req, res, next) {
  if (SKIP_AUTH) return next();
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const HIGH_WATTS = 3500;

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

app.get("/api/config", (_req, res) => {
  res.json({ skipAuth: SKIP_AUTH });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === DEMO_USER && password === DEMO_PASS) {
    const token = signToken({ sub: username, iat: Date.now() });
    return res.json({ token, user: { username } });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: { username: req.user.sub } });
});

app.get("/devices", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const devices = await Device.find().lean();
    res.json(devices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/data", authMiddleware, requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const data = await EnergyData.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json(data.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/data/:device", authMiddleware, requireAuth, async (req, res) => {
  try {
    const { device } = req.params;
    const map = { ac: "Air Conditioner", lights: "Lights", fridge: "Refrigerator" };
    const name = map[device.toLowerCase()] || device;
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const data = await EnergyData.find({ deviceName: name })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json(data.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/stats", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pipeline = [
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: "$deviceName",
          total: { $sum: "$energyValue" },
          avg: { $avg: "$energyValue" },
          count: { $sum: 1 },
          max: { $max: "$energyValue" },
        },
      },
    ];
    const byDevice = await EnergyData.aggregate(pipeline);
    const totalAll = byDevice.reduce((s, d) => s + d.total, 0);
    const latest = await EnergyData.findOne().sort({ timestamp: -1 }).lean();

    const alerts = [];
    for (const d of byDevice) {
      if (d.max >= HIGH_WATTS) {
        alerts.push({
          level: "high",
          device: d._id,
          message: `Peak usage on ${d._id} reached ${Math.round(d.max)} W`,
        });
      }
    }

    res.json({
      last24h: { byDevice, totalWattSum: totalAll },
      latestReading: latest,
      highUsageThresholdWatts: HIGH_WATTS,
      alerts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/prediction", authMiddleware, requireAuth, async (_req, res) => {
  try {
    const rows = await EnergyData.find()
      .sort({ timestamp: -1 })
      .limit(200)
      .select({ energyValue: 1, timestamp: 1, deviceName: 1 })
      .lean();
    const records = rows.reverse().map((r) => ({
      energyValue: r.energyValue,
      timestamp: r.timestamp.toISOString(),
      deviceName: r.deviceName,
    }));
    if (records.length < 5) {
      return res.json({
        nextHourWhEstimate: null,
        nextDayWhEstimate: null,
        recommendations: ["Collect more readings (at least 5) before prediction."],
        model: "linear_regression",
        note: "insufficient_data",
      });
    }
    const result = await runPrediction(records);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Prediction failed" });
  }
});

app.get("/export/csv", authMiddleware, requireAuth, async (req, res) => {
  try {
    const device = req.query.device;
    const map = { ac: "Air Conditioner", lights: "Lights", fridge: "Refrigerator" };
    const filter = device && map[device.toLowerCase()] ? { deviceName: map[device.toLowerCase()] } : {};
    const data = await EnergyData.find(filter).sort({ timestamp: -1 }).limit(5000).lean();
    const header = "deviceName,energyValue,timestamp\n";
    const body = data
      .map((r) => `${r.deviceName},${r.energyValue},${r.timestamp.toISOString()}`)
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=energy_export.csv");
    res.send(header + body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  await seedDevices();
  console.log("MongoDB connected");

  connectMqtt(MQTT_URL, (reading) => {
    io.emit("energy:reading", reading);
    if (reading.energyValue >= HIGH_WATTS) {
      io.emit("energy:alert", {
        level: "high",
        message: `${reading.deviceName} reported ${Math.round(reading.energyValue)} W`,
        reading,
      });
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`API + WebSocket http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
