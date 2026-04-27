import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String },
  mqttTopic: { type: String, required: true },
});

export const Device = mongoose.model("Device", deviceSchema);
