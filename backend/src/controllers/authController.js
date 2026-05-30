const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

exports.getNonce = async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    let user = await User.findOne({ walletAddress: address });

    if (!user) {
      user = new User({ walletAddress: address });
      await user.save();

      await Transaction.create({
        walletAddress: address,
        type: "initial",
        krwAmount: 1000000,
        note: "초기 가입 자금",
      });
    }

    res.json({ nonce: user.nonce });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifySignature = async (req, res) => {
  try {
    const { address, signature } = req.body;
    const lower = address.toLowerCase();
    const user = await User.findOne({ walletAddress: lower });

    if (!user) return res.status(404).json({ error: "User not found" });

    const message = `Cadena 로그인 인증\nNonce: ${user.nonce}`;
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();

    if (recovered !== lower) return res.status(401).json({ error: "Signature mismatch" });

    user.nonce = Math.floor(Math.random() * 1000000).toString();
    await user.save();

    const token = jwt.sign(
      { address: lower },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "24h" }
    );

    res.json({ token, user: { walletAddress: lower, krwBalance: user.krwBalance, cdaBalance: user.cdaBalance } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.address });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      walletAddress: user.walletAddress,
      krwBalance: user.krwBalance,
      cdaBalance: user.cdaBalance,
      lastLocationClaim: user.lastLocationClaim,
      locationClaimCount: user.locationClaimCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
