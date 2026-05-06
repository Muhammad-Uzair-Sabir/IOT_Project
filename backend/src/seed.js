import bcrypt from "bcrypt";
import { Device } from "./models/Device.js";
import { User } from "./models/User.js";

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

/** Seeded account: demo@example.com / password from DEMO_PASS or demo123 */
export async function seedDemoUser() {
  const email = "demo@example.com";
  const existing = await User.findOne({ email });
  if (existing) return;
  const plain = process.env.DEMO_PASS || "demo123";
  const passwordHash = await bcrypt.hash(plain, 10);
  await User.create({
    email,
    name: "Demo User",
    passwordHash,
    provider: "local",
  });
}
