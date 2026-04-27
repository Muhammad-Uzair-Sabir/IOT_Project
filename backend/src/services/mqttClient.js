import mqtt from "mqtt";
import { EnergyData } from "../models/EnergyData.js";

const topicToDevice = {
  "home/ac": "Air Conditioner",
  "home/lights": "Lights",
  "home/fridge": "Refrigerator",
};

export function connectMqtt(url, onReading) {
  const client = mqtt.connect(url, { reconnectPeriod: 2000 });

  client.on("connect", () => {
    console.log("MQTT connected");
    client.subscribe(["home/ac", "home/lights", "home/fridge"], (err) => {
      if (err) console.error("MQTT subscribe error", err);
    });
  });

  client.on("message", async (topic, payload) => {
    const deviceName = topicToDevice[topic];
    if (!deviceName) return;

    let energyValue;
    try {
      const parsed = JSON.parse(payload.toString());
      energyValue = Number(parsed.energyValue ?? parsed.watts ?? parsed.value);
    } catch {
      energyValue = Number.parseFloat(payload.toString());
    }
    if (!Number.isFinite(energyValue)) return;

    const doc = await EnergyData.create({
      deviceName,
      energyValue,
      timestamp: new Date(),
    });

    const reading = {
      _id: doc._id.toString(),
      deviceName: doc.deviceName,
      energyValue: doc.energyValue,
      timestamp: doc.timestamp.toISOString(),
    };

    onReading(reading);
  });

  client.on("error", (e) => console.error("MQTT error", e));
  return client;
}
