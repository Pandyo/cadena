const User = require("../models/User");
const Transaction = require("../models/Transaction");
const PriceHistory = require("../models/PriceHistory");

async function getCurrentPrice() {
  const latest = await PriceHistory.findOne().sort({ createdAt: -1 });
  return latest ? latest.price : Number(process.env.CDA_BASE_PRICE) || 1000;
}

exports.buy = async (req, res) => {
  try {
    const { cdaAmount } = req.body;
    if (!cdaAmount || cdaAmount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const user = await User.findOne({ walletAddress: req.user.address });
    const price = await getCurrentPrice();
    const cost = cdaAmount * price;

    if (user.krwBalance < cost) return res.status(400).json({ error: "KRW 잔액 부족" });

    user.krwBalance -= cost;
    user.cdaBalance += cdaAmount;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "buy",
      cdaAmount,
      krwAmount: cost,
      price,
    });

    res.json({ success: true, krwBalance: user.krwBalance, cdaBalance: user.cdaBalance, price, cost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sell = async (req, res) => {
  try {
    const { cdaAmount } = req.body;
    if (!cdaAmount || cdaAmount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const user = await User.findOne({ walletAddress: req.user.address });
    const price = await getCurrentPrice();

    if (user.cdaBalance < cdaAmount) return res.status(400).json({ error: "CDA 잔액 부족" });

    const revenue = cdaAmount * price;
    user.cdaBalance -= cdaAmount;
    user.krwBalance += revenue;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "sell",
      cdaAmount,
      krwAmount: revenue,
      price,
    });

    res.json({ success: true, krwBalance: user.krwBalance, cdaBalance: user.cdaBalance, price, revenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const txs = await Transaction.find({ walletAddress: req.user.address })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
