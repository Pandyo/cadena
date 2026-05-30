import { useWallet } from "../contexts/WalletContext";
import { useMarket } from "../contexts/MarketContext";
import { useState, useEffect } from "react";
import api from "../api/client";

export default function Dashboard() {
  const { user, fetchUser } = useWallet();
  const { currentPrice } = useMarket();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchUser();
    api.get("/trade/history").then((r) => setHistory(r.data)).catch(() => {});
  }, [fetchUser]);

  const portfolioValue = user ? user.cdaBalance * currentPrice : 0;
  const totalAsset = user ? user.krwBalance + portfolioValue : 0;

  return (
    <div className="dashboard">
      <h2>내 자산</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">총 자산 (KRW 환산)</span>
          <span className="stat-value">&#8361;{Math.round(totalAsset).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">KRW 잔액</span>
          <span className="stat-value">&#8361;{Math.round(user?.krwBalance || 0).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">CDA 보유량</span>
          <span className="stat-value">{(user?.cdaBalance || 0).toLocaleString()} CDA</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">CDA 평가액</span>
          <span className="stat-value">&#8361;{Math.round(portfolioValue).toLocaleString()}</span>
        </div>
      </div>

      <h3>거래 내역</h3>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>유형</th>
              <th>CDA</th>
              <th>KRW</th>
              <th>단가</th>
              <th>일시</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5} className="empty">거래 내역이 없습니다</td></tr>
            )}
            {history.map((tx) => (
              <tr key={tx._id}>
                <td>
                  <span className={`badge badge-${tx.type}`}>
                    {tx.type === "buy" && "매수"}
                    {tx.type === "sell" && "매도"}
                    {tx.type === "location_reward" && "위치보상"}
                    {tx.type === "initial" && "초기지급"}
                  </span>
                </td>
                <td>{tx.cdaAmount > 0 ? `+${tx.cdaAmount}` : "-"}</td>
                <td>{tx.krwAmount > 0 ? `&#8361;${Math.round(tx.krwAmount).toLocaleString()}` : "-"}</td>
                <td>{tx.price > 0 ? `&#8361;${tx.price.toLocaleString()}` : "-"}</td>
                <td>{new Date(tx.createdAt).toLocaleString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
