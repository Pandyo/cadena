import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { useMarket } from "../contexts/MarketContext";
import api from "../api/client";
import { ethers } from "ethers";

export default function TradePanel() {
  const { user, ethBalance, fetchUser, fetchEthBalance, account } = useWallet();
  const { currentPrice, fetchHistory } = useMarket();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // currentPrice is now in ETH (e.g. 0.0001)
  const costEth = amount ? Number(amount) * currentPrice : 0;
  const maxBuy = ethBalance && currentPrice > 0 ? Math.floor(Number(ethBalance) / currentPrice) : 0;
  const maxSell = user?.cdaBalance || 0;

  const handleTrade = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setMsg(null);
    try {
      const cdaAmount = Number(amount);
      if (mode === "buy") {
        if (!window.ethereum) throw new Error("MetaMask가 필요합니다.");
        
        const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS;
        if (!treasuryAddress) throw new Error("서버 지갑 주소가 설정되지 않았습니다.");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(costEth.toString()),
        });

        // 백엔드에 거래 전송 기록 알림
        await api.post("/trade/buy", { cdaAmount, txHash: tx.hash });
        setMsg({ type: "success", text: `${cdaAmount} CDA 매수 완료!` });
      } else {
        await api.post("/trade/sell", { cdaAmount });
        setMsg({ type: "success", text: `${cdaAmount} CDA 매도 완료!` });
      }
      setAmount("");
      fetchUser();
      fetchEthBalance(account);
      fetchHistory();
    } catch (err) {
      console.error("Trade error:", err);
      setMsg({ type: "error", text: err.response?.data?.error || err.message || "거래 실패" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trade-panel">
      <h2>CDA 거래</h2>
      <div className="price-display">
        <span>현재가</span>
        <strong>{currentPrice} ETH</strong>
      </div>

      <div className="mode-toggle">
        <button
          className={`toggle-btn ${mode === "buy" ? "active-buy" : ""}`}
          onClick={() => { setMode("buy"); setAmount(""); setMsg(null); }}
        >
          매수
        </button>
        <button
          className={`toggle-btn ${mode === "sell" ? "active-sell" : ""}`}
          onClick={() => { setMode("sell"); setAmount(""); setMsg(null); }}
        >
          매도
        </button>
      </div>

      <div className="trade-form">
        <label>CDA 수량</label>
        <div className="input-group">
          <input
            type="number"
            min="1"
            max={mode === "buy" ? maxBuy : maxSell}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`최대 ${mode === "buy" ? maxBuy : maxSell} CDA`}
          />
          <button className="btn-max" onClick={() => setAmount(mode === "buy" ? maxBuy : maxSell)}>
            MAX
          </button>
        </div>

        <div className="trade-summary">
          <span>ETH {mode === "buy" ? "필요" : "수령"}</span>
          <strong>{costEth.toFixed(6)} ETH</strong>
        </div>

        <div className="balance-hint">
          ETH 잔액: {Number(ethBalance).toFixed(4)} ETH | CDA 잔액: {user?.cdaBalance || 0} CDA
        </div>

        <button
          className={`btn-trade ${mode === "buy" ? "btn-buy" : "btn-sell"}`}
          onClick={handleTrade}
          disabled={loading || !amount}
        >
          {loading ? "처리 중..." : mode === "buy" ? "매수하기" : "매도하기"}
        </button>

        {msg && <div className={`trade-msg ${msg.type}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
