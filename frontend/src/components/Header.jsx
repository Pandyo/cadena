import { useWallet } from "../contexts/WalletContext";
import { useMarket } from "../contexts/MarketContext";

export default function Header() {
  const { account, disconnect } = useWallet();
  const { currentPrice } = useMarket();

  return (
    <header className="header">
      <div className="header-brand">
        <span className="logo">&#8383;</span>
        <h1>Cadena Exchange</h1>
      </div>
      <div className="header-info">
        <span className="price-badge">CDA &#8361;{currentPrice.toLocaleString()}</span>
        <span className="address-badge">
          {account?.slice(0, 6)}...{account?.slice(-4)}
        </span>
        <button className="btn-outline" onClick={disconnect}>
          연결 해제
        </button>
      </div>
    </header>
  );
}
