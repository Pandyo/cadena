const User = require("../models/User");
const Transaction = require("../models/Transaction");
const PriceHistory = require("../models/PriceHistory");
const { ethers } = require("ethers");

async function getCurrentPrice() {
  const latest = await PriceHistory.findOne().sort({ createdAt: -1 });
  if (!latest) return Number(process.env.CDA_BASE_PRICE_ETH) || 0.0001;

  // DB의 KRW 스케일(1000~10000)을 ETH 스케일(0.00005~0.0005)로 변환
  let ethPrice = latest.price / 20000000;
  ethPrice = Math.max(0.00005, Math.min(0.0005, ethPrice));
  
  return Number(ethPrice.toFixed(6));
}

exports.buy = async (req, res) => {
  try {
    const { cdaAmount, txHash } = req.body;
    if (!cdaAmount || cdaAmount <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (!txHash) return res.status(400).json({ error: "트랜잭션 해시가 필요합니다." });

    const user = await User.findOne({ walletAddress: req.user.address });
    const price = await getCurrentPrice();
    const costEth = cdaAmount * price;

    // 실제 프로덕션에서는 ethers.js를 사용해 txHash가 유효한지, 
    // 수신자가 서버 지갑이 맞는지, 전송된 금액이 costEth 이상인지 검증해야 합니다.
    // 여기서는 프로토타입이므로 트랜잭션이 존재한다고 가정하고 바로 지급합니다.

    user.cdaBalance += cdaAmount;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "buy",
      cdaAmount,
      ethAmount: costEth,
      price,
      note: `tx: ${txHash}`
    });

    res.json({ success: true, cdaBalance: user.cdaBalance, price, cost: costEth });
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

    const revenueEth = cdaAmount * price;

    // 서버 지갑에서 사용자 지갑으로 ETH 전송 (실제 송금)
    const privateKey = process.env.TREASURY_PRIVATE_KEY;
    
    let txHash = "mock_tx_hash";

    if (privateKey) {
      try {
        // 커스텀 RPC 대신 ethers 기본 제공 다중 Provider(Infura, Alchemy 등 자동 폴백) 사용
        const provider = ethers.getDefaultProvider("sepolia");
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log("송금 시작...", revenueEth.toString(), "ETH to", user.walletAddress);
        const tx = await wallet.sendTransaction({
          to: user.walletAddress,
          value: ethers.parseEther(revenueEth.toString())
        });
        console.log("송금 전송 완료, 채굴 대기 중...", tx.hash);
        await tx.wait(); // 트랜잭션 채굴 대기
        txHash = tx.hash;
        console.log("송금 채굴 완료!");
      } catch (txErr) {
        console.error("ETH 송금 실패:", txErr);
        return res.status(500).json({ error: "이더리움 송금에 실패했습니다. (가스 부족, 네트워크 오류 등)" });
      }
    } else {
      console.warn("TREASURY_PRIVATE_KEY가 설정되지 않아 모의 처리됩니다.");
    }

    user.cdaBalance -= cdaAmount;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "sell",
      cdaAmount,
      ethAmount: revenueEth,
      price,
      note: `tx: ${txHash}`
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
