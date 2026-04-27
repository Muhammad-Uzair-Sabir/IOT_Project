import { Device } from "./models/Device.js";

const defaults = [
  { deviceId: "ac", name: "Air Conditioner", type: "hvac", mqttTopic: "home/ac" },
  { deviceId: "lights", name: "Lights", type: "lighting", mqttTopic: "home/lights" },
  { deviceId: "fridge", name: "Refrigerator", type: "appliance", mqttTopic: "home/fridge" },
];

export async function seedDevices() {
  for (const d of defaults) {
    await Device.updateOne({ deviceId: d.deviceId }, { $setOnInsert: d }, { upsert: true });
  }
}
