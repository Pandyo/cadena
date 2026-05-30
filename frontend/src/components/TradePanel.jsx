import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { useMarket } from "../contexts/MarketContext";
import api from "../api/client";

export default function TradePanel() {
  const { user, fetchUser } = useWallet();
  const { currentPrice, fetchHistory } = useMarket();
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const cost = amount ? Math.round(Number(amount) * currentPrice) : 0;
  const maxBuy = user ? Math.floor(user.krwBalance / currentPrice) : 0;
  const maxSell = user?.cdaBalance || 0;

  const handleTrade = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setMsg(null);
    try {
      const cdaAmount = Number(amount);
      if (mode === "buy") {
        await api.post("/trade/buy", { cdaAmount });
        setMsg({ type: "success", text: `${cdaAmount} CDA 매수 완료!` });
      } else {
        await api.post("/trade/sell", { cdaAmount });
        setMsg({ type: "success", text: `${cdaAmount} CDA 매도 완료!` });
      }
      setAmount("");
      fetchUser();
      fetchHistory();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "거래 실패" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trade-panel">
      <h2>CDA 거래</h2>
      <div className="price-display">
        <span>현재가</span>
        <strong>&#8361;{currentPrice.toLocaleString()}</strong>
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
          <span>KRW {mode === "buy" ? "필요" : "수령"}</span>
          <strong>&#8361;{cost.toLocaleString()}</strong>
        </div>

        <div className="balance-hint">
          KRW 잔액: &#8361;{Math.round(user?.krwBalance || 0).toLocaleString()} | CDA 잔액: {user?.cdaBalance || 0} CDA
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
