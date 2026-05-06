import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    passwordHash: { type: String, default: null },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
