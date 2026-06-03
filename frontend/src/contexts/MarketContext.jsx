import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [currentPrice, setCurrentPrice] = useState(1000);
  const [priceHistory, setPriceHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState(null);

  const fetchPrice = async () => {
    try {
      const res = await api.get("/price/current");
      setCurrentPrice(res.data.price);
      setPriceUpdatedAt(res.data.updatedAt);
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/price/history?limit=30");
      setPriceHistory(res.data);
    } catch {}
  };

  const fetchNews = async (date) => {
    setNewsLoading(true);
    setNewsError("");
    try {
      const res = await api.get(date ? `/news?date=${encodeURIComponent(date)}` : "/news");
      setNews(res.data.slice(0, 10));
    } catch {
      setNews([]);
      setNewsError("보안뉴스를 불러오지 못했습니다.");
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    fetchHistory();
    fetchNews();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MarketContext.Provider
      value={{
        currentPrice,
        priceHistory,
        news,
        newsLoading,
        newsError,
        priceUpdatedAt,
        fetchPrice,
        fetchHistory,
        fetchNews,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);