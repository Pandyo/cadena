import { useMarket } from "../contexts/MarketContext";

export default function NewsFeed() {
  const { news, currentPrice, priceUpdatedAt } = useMarket();

  return (
    <div className="news-panel">
      <h2>보안 뉴스 피드</h2>
      <div className="price-mechanism-card">
        <h3>가격 결정 메커니즘</h3>
        <p>당일 수집된 보안 뉴스 기사 수에 따라 CDA 가격이 자동 조정됩니다.</p>
        <ul>
          <li>기사 5건 초과: 건당 +2% 상승</li>
          <li>기사 5건 미만: 건당 -1% 하락</li>
        </ul>
        <div className="price-now">
          현재 CDA: <strong>&#8361;{currentPrice.toLocaleString()}</strong>
          {priceUpdatedAt && (
            <span className="small"> (최종 업데이트: {new Date(priceUpdatedAt).toLocaleString("ko-KR")})</span>
          )}
        </div>
      </div>

      <div className="news-list">
        {news.length === 0 && <p className="empty">뉴스를 불러오는 중...</p>}
        {news.map((article, i) => (
          <a
            key={i}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item"
          >
            <div className="news-source">{article.source}</div>
            <div className="news-title">{article.title}</div>
            <div className="news-date">
              {article.pubDate ? new Date(article.pubDate).toLocaleString("ko-KR") : ""}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
