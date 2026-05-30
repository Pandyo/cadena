import { useEffect, useRef } from "react";
import { useMarket } from "../contexts/MarketContext";
import { createChart } from "lightweight-charts";

export default function PriceChart() {
  const { priceHistory, currentPrice, priceUpdatedAt } = useMarket();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = createChart(chartRef.current, {
      layout: { background: { color: "#1a1a2e" }, textColor: "#e0e0e0" },
      grid: { vertLines: { color: "#2a2a4a" }, horzLines: { color: "#2a2a4a" } },
      width: chartRef.current.clientWidth,
      height: 350,
      timeScale: { timeVisible: true },
    });

    seriesRef.current = chartInstance.current.addLineSeries({
      color: "#4ade80",
      lineWidth: 2,
    });

    return () => { chartInstance.current?.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;
    const data = priceHistory.map((p) => ({
      time: Math.floor(new Date(p.date || p.createdAt).getTime() / 1000),
      value: p.price,
    }));
    seriesRef.current.setData(data);
    chartInstance.current?.timeScale().fitContent();
  }, [priceHistory]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <h2>CDA/KRW 시세 차트</h2>
        <div className="chart-meta">
          <span className="current-price">&#8361;{currentPrice.toLocaleString()}</span>
          {priceUpdatedAt && (
            <span className="update-time">
              업데이트: {new Date(priceUpdatedAt).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
      </div>
      <div ref={chartRef} className="chart-container" />
      <p className="chart-hint">* CDA 가격은 일일 보안 뉴스 건수에 따라 자동 조정됩니다</p>
    </div>
  );
}
