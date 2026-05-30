import { useEffect, useState } from "react";
import { useMarket } from "../contexts/MarketContext";

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

function formatDateTime(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function NewsFeed() {
  const {
    news,
    newsLoading,
    newsError,
    currentPrice,
    priceUpdatedAt,
    fetchNews,
  } = useMarket();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchNews(selectedDate);
  }, [selectedDate]);

  const handleToday = () => {
    setSelectedDate(getKoreanToday());
  };

  const handleShowLatest = () => {
    setSelectedDate("");
  };

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

      <div className="news-toolbar">
        <button type="button" className="today-btn" onClick={handleToday}>
          오늘
        </button>
        <input
          type="date"
          className="news-date-picker"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          aria-label="조회할 뉴스 날짜"
        />
        <button type="button" className="btn-outline news-reset-btn" onClick={handleShowLatest}>
          최신 보기
        </button>
      </div>

      <div className="news-grid">
        {newsLoading && <p className="empty">보안뉴스를 불러오는 중입니다...</p>}
        {!newsLoading && newsError && <p className="empty error">{newsError}</p>}
        {!newsLoading && !newsError && news.length === 0 && (
          <p className="empty">
            {selectedDate ? "선택한 날짜의 보안뉴스 기사가 없습니다." : "보안뉴스 기사가 없습니다."}
          </p>
        )}
        {news.map((article, i) => (
          <article
            key={`${article.link}-${i}`}
            className="news-item"
            onClick={() => setSelectedArticle(article)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedArticle(article);
              }
            }}
          >
            <div className="news-source">{article.source}</div>
            <div className="news-title">{article.title}</div>
            <div className="news-date">{formatDateTime(article.pubDate)}</div>
            <p className="news-summary">
              {article.summary || "요약 정보가 제공되지 않습니다."}
            </p>
            <div className="news-card-actions">
              <button type="button" className="news-detail-btn">
                자세히 보기
              </button>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link-btn"
                onClick={(event) => event.stopPropagation()}
              >
                원문 링크
              </a>
            </div>
          </article>
        ))}
      </div>

      {selectedArticle && (
        <div
          className="news-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedArticle(null)}
        >
          <section
            className="news-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="news-modal-close"
              onClick={() => setSelectedArticle(null)}
              aria-label="뉴스 상세 닫기"
            >
              ×
            </button>
            <div className="news-source">{selectedArticle.source}</div>
            <h3 id="news-modal-title">{selectedArticle.title}</h3>
            <div className="news-date">{formatDateTime(selectedArticle.pubDate)}</div>
            <p className="news-summary modal-summary">
              {selectedArticle.summary || "요약 정보가 제공되지 않습니다."}
            </p>
            <a
              href={selectedArticle.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary news-original-btn"
            >
              원문 새 탭에서 열기
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
