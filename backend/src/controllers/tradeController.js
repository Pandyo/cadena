const User = require("../models/User");
const Transaction = require("../models/Transaction");
const PriceHistory = require("../models/PriceHistory");
const { ethers } = require("ethers");
const { DEFAULT_ETH_PRICE, normalizeToEthPrice } = require("../utils/priceScale");

async function getCurrentPrice() {
  const latest = await PriceHistory.findOne().sort({ createdAt: -1 });
  return latest ? normalizeToEthPrice(latest.price) : DEFAULT_ETH_PRICE;
}

function parseEthAmount(amount) {
  return ethers.parseEther(Number(amount).toFixed(18));
}

function formatEthAmount(amount) {
  return Number(ethers.formatEther(amount)).toFixed(7);
}

async function getTreasuryProvider() {
  const providerOptions = { batchMaxCount: 1 };

  if (process.env.PROVIDER_URL) {
    const provider = new ethers.JsonRpcProvider(
      process.env.PROVIDER_URL,
      undefined,
      providerOptions,
    );

    try {
      await provider.getNetwork();
      return provider;
    } catch (err) {
      console.warn(
        "PROVIDER_URL is unavailable. Falling back to public Sepolia RPC:",
        err.message,
      );
    }
  }

  return new ethers.JsonRpcProvider(
    "https://rpc.sepolia.org",
    undefined,
    providerOptions,
  );
}

exports.buy = async (req, res) => {
  try {
    const { cdaAmount, txHash } = req.body;
    if (!cdaAmount || cdaAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!txHash) {
      return res.status(400).json({ error: "트랜잭션 해시가 필요합니다." });
    }

    const user = await User.findOne({ walletAddress: req.user.address });
    const price = await getCurrentPrice();
    const costEth = cdaAmount * price;

    user.cdaBalance += cdaAmount;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "buy",
      cdaAmount,
      ethAmount: costEth,
      price,
      note: `tx: ${txHash}`,
    });

    res.json({ success: true, cdaBalance: user.cdaBalance, price, cost: costEth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sell = async (req, res) => {
  try {
    const { cdaAmount } = req.body;
    if (!cdaAmount || cdaAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findOne({ walletAddress: req.user.address });
    const price = await getCurrentPrice();

    if (!user || user.cdaBalance < cdaAmount) {
      return res.status(400).json({ error: "CDA 잔액이 부족합니다." });
    }

    const revenueEth = cdaAmount * price;
    const privateKey = process.env.TREASURY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({ error: "TREASURY_PRIVATE_KEY가 설정되지 않았습니다." });
    }

    let txHash;

    try {
      const provider = await getTreasuryProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const value = parseEthAmount(revenueEth);
      const feeData = await provider.getFeeData();
      const gasPrice =
        feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits("20", "gwei");
      const estimatedGasCost = gasPrice * 21000n;
      const requiredBalance = value + estimatedGasCost;
      const treasuryBalance = await provider.getBalance(wallet.address);

      if (treasuryBalance < requiredBalance) {
        return res.status(400).json({
          error:
            `서버 지갑 ETH가 부족합니다. 필요: ${formatEthAmount(requiredBalance)} ETH, ` +
            `현재: ${formatEthAmount(treasuryBalance)} ETH. ` +
            `서버 지갑(${wallet.address})에 Sepolia ETH를 충전해주세요.`,
        });
      }

      console.log("ETH transfer start:", revenueEth.toString(), "ETH to", user.walletAddress);
      const tx = await wallet.sendTransaction({
        to: user.walletAddress,
        value,
      });

      console.log("ETH transfer sent:", tx.hash);
      await tx.wait();
      txHash = tx.hash;
      console.log("ETH transfer confirmed:", tx.hash);
    } catch (txErr) {
      console.error("ETH transfer failed:", txErr);
      return res.status(500).json({
        error: txErr.shortMessage || txErr.reason || txErr.message || "ETH transfer failed.",
        code: txErr.code || null,
      });
    }

    user.cdaBalance -= cdaAmount;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "sell",
      cdaAmount,
      ethAmount: revenueEth,
      price,
      note: `tx: ${txHash}`,
    });

    res.json({ success: true, cdaBalance: user.cdaBalance, price, revenue: revenueEth, txHash });
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
