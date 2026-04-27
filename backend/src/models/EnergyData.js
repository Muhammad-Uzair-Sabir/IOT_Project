import mongoose from "mongoose";

const energyDataSchema = new mongoose.Schema({
  deviceName: { type: String, required: true, index: true },
  energyValue: { type: Number, required: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
});

export const EnergyData = mongoose.model("EnergyData", energyDataSchema);
