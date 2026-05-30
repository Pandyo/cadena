const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    krwBalance: { type: Number, default: 1000000 },
    cdaBalance: { type: Number, default: 0 },
    lastLocationClaim: { type: Date, default: null },
    locationClaimCount: { type: Number, default: 0 },
    nonce: { type: String, default: () => Math.floor(Math.random() * 1000000).toString() },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
