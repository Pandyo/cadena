import { useState } from "react";
import { WalletProvider, useWallet } from "./contexts/WalletContext";
import { MarketProvider } from "./contexts/MarketContext";
import Header from "./components/Header";
import ConnectWallet from "./components/ConnectWallet";
import Dashboard from "./components/Dashboard";
import TradePanel from "./components/TradePanel";
import PriceChart from "./components/PriceChart";
import LocationVerify from "./components/LocationVerify";
import NewsFeed from "./components/NewsFeed";

function AppContent() {
  const { user } = useWallet();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user) return <ConnectWallet />;

  return (
    <div className="app-layout">
      <Header />
      <nav className="tab-nav">
        {["dashboard", "trade", "chart", "location", "news"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "dashboard" && "대시보드"}
            {tab === "trade" && "거래"}
            {tab === "chart" && "차트"}
            {tab === "location" && "위치 보상"}
            {tab === "news" && "보안 뉴스"}
          </button>
        ))}
      </nav>
      <main className="main-content">
        {activeTab === "dashboard" && (
          <Dashboard onOpenLocation={() => setActiveTab("location")} />
        )}
        {activeTab === "trade" && <TradePanel />}
        {activeTab === "chart" && <PriceChart />}
        {activeTab === "location" && <LocationVerify />}
        {activeTab === "news" && <NewsFeed />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </WalletProvider>
  );
}
