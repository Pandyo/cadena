const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true },
    type: { type: String, enum: ["buy", "sell", "location_reward", "initial"], required: true },
    cdaAmount: { type: Number, default: 0 },
    ethAmount: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
