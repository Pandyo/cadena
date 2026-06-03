import { useEffect, useState } from "react";
import { useMarket } from "../contexts/MarketContext";
import NewsCalendar from "./NewsCalendar";

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
    newArticleAlert,
    fetchNews,
    setNewArticleAlert,
  } = useMarket();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [toastClosing, setToastClosing] = useState(false);

  useEffect(() => {
    fetchNews(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!newArticleAlert) return undefined;
    setToastClosing(false);
    const closeStart = setTimeout(() => setToastClosing(true), 4700);
    const closeEnd = setTimeout(() => setNewArticleAlert(null), 5000);
    return () => {
      clearTimeout(closeStart);
      clearTimeout(closeEnd);
    };
  }, [newArticleAlert, setNewArticleAlert]);

  const handleToday = () => {
    setSelectedDate(getKoreanToday());
  };

  const handleShowLatest = () => {
    setSelectedDate("");
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleToastClick = () => {
    setSelectedDate("");
    setToastClosing(false);
    setNewArticleAlert(null);
  };

  const emptyMessage = selectedDate
    ? selectedDate > getKoreanToday()
      ? `${selectedDate} 은(는) 아직 도래하지 않은 날짜입니다. 기사가 존재하지 않습니다.`
      : `${selectedDate} 에 수집된 보안뉴스 기사가 없습니다.`
    : "보안뉴스 기사가 없습니다.";

  return (
    <div className="news-panel">
      <h2>보안 뉴스 피드</h2>

      <NewsCalendar
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
      />

      <div className="news-toolbar">
        <button type="button" className="today-btn" onClick={handleToday}>
          오늘
        </button>
        <input
          type="date"
          className="news-date-picker"
          value={selectedDate}
          onChange={(event) => handleDateSelect(event.target.value)}
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
          <p className="empty">{emptyMessage}</p>
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

      {newArticleAlert && (
        <div className={`news-toast ${toastClosing ? "closing" : ""}`} onClick={handleToastClick}>
          <span className="news-toast-icon">🔒</span>
          <div>
            <p className="news-toast-title">새 보안 뉴스 {newArticleAlert.count}건</p>
            <p className="news-toast-body">{newArticleAlert.title}</p>
          </div>
          <button
            type="button"
            className="news-toast-close"
            onClick={(event) => {
              event.stopPropagation();
              setNewArticleAlert(null);
            }}
            aria-label="새 보안 뉴스 알림 닫기"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}