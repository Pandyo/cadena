import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api/client";

const MarketContext = createContext(null);

function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const convertToEth = (price) => {
  const ethPrice = 0.0005 + ((price - 1000) / 9000) * 0.0005;
  return Number(Math.max(0.0005, Math.min(0.001, ethPrice)).toFixed(7));
};

export function MarketProvider({ children }) {
  const [currentPrice, setCurrentPrice] = useState(0.000750);
  const [priceHistory, setPriceHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState(null);

  const [priceStats, setPriceStats] = useState({
    changePercent: 0,
    changeAmount: 0,
    sentimentScore: 0,
    newsCount: 0,
    previousPrice: 0.000750,
  });

  const [monthlyCount, setMonthlyCount] = useState({});
  const [newArticleAlert, setNewArticleAlert] = useState(null);

  const activeNewsDateRef = useRef("");

  const fetchPrice = async () => {
    try {
      const res = await api.get("/price/current");

      const ethPrice = convertToEth(res.data.price);
      const ethPrev = convertToEth(res.data.previousPrice || res.data.price);

      setCurrentPrice(ethPrice);
      setPriceUpdatedAt(res.data.updatedAt);

      setPriceStats({
        changePercent: res.data.changePercent || 0,
        changeAmount: Number((ethPrice - ethPrev).toFixed(7)),
        sentimentScore: res.data.sentimentScore || 0,
        newsCount: res.data.newsCount || 0,
        previousPrice: ethPrev,
      });
    } catch {
      // 필요하면 에러 상태 추가 가능
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/price/history?limit=30");
      const converted = res.data.map((p) => {
        const ethPrice = convertToEth(p.price);
        const ethPrev = convertToEth(p.previousPrice || p.price);
        return {
          ...p,
          price: ethPrice,
          previousPrice: ethPrev,
          changeAmount: Number((ethPrice - ethPrev).toFixed(7)),
        };
      });
      setPriceHistory(converted);
      return converted;
    } catch {
      return [];
    }
  };

  const fetchNews = async (date) => {
    activeNewsDateRef.current = date || "";
    setNewsLoading(true);
    setNewsError("");

    try {
      if (date && date > getKoreanToday()) {
        setNews([]);
        return [];
      }

      const res = await api.get(date ? `/news?date=${encodeURIComponent(date)}` : "/news");
      const slicedNews = res.data.slice(0, 30);

      setNews(slicedNews);
      return slicedNews;
    } catch {
      setNews([]);
      setNewsError("보안뉴스를 불러오지 못했습니다.");
      return [];
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchMonthlyCount = async (year, month) => {
    try {
      const res = await api.get(
        `/news/monthly-count?year=${year}&month=${String(month).padStart(2, "0")}`
      );

      setMonthlyCount(res.data);
      return res.data;
    } catch {
      setMonthlyCount({});
      return {};
    }
  };

  useEffect(() => {
    fetchPrice();
    fetchHistory();

    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let knownLinks = new Set();

    const checkNewArticles = async () => {
      try {
        const res = await api.get("/news");
        const displayArticles = res.data.slice(0, 30);
        const latest = displayArticles.slice(0, 10);

        if (knownLinks.size > 0) {
          const newArticles = latest.filter((article) => !knownLinks.has(article.link));

          if (newArticles.length > 0) {
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("🔒 새 보안 뉴스", {
                body: `${newArticles.length}건의 새 보안 기사가 등록되었습니다.\n${newArticles[0].title}`,
                icon: "/favicon.ico",
              });
            }

            setNewArticleAlert({
              count: newArticles.length,
              title: newArticles[0].title,
            });
          }
        }

        knownLinks = new Set(latest.map((article) => article.link));

        if (!activeNewsDateRef.current) {
          setNews(displayArticles);
        }
      } catch {
        // 자동 새 기사 확인 실패는 조용히 무시
      }
    };

    checkNewArticles();

    const interval = setInterval(checkNewArticles, 30000);

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
        priceStats,

        monthlyCount,
        newArticleAlert,

        fetchPrice,
        fetchHistory,
        fetchNews,
        fetchMonthlyCount,
        setNewArticleAlert,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);