const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    newsCount: { type: Number, default: 0 },
    source: { type: String, default: "manual" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PriceHistory", priceHistorySchema);
