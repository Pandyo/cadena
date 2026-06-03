import { useMarket } from '../contexts/MarketContext'
import { useState } from 'react'

export default function NewsFeed() {
  const { news, currentPrice, priceUpdatedAt } = useMarket()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(news.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const paginatedNews = news.slice(startIdx, endIdx)

  return (
    <div className="news-panel">
      <h2>보안 뉴스 피드</h2>
      <div className="price-mechanism-card">
        <h3>가격 결정 메커니즘</h3>
        <p>수집된 보안 뉴스 기사 수에 따라 CDA 가격이 자동 조정됩니다.</p>
        <ul>
          <li>기사 5건 초과: 건당 +2% 상승</li>
          <li>기사 5건 미만: 건당 -1% 하락</li>
        </ul>
        <div className="price-now">
          현재 CDA: <strong>₩{currentPrice.toLocaleString()}</strong>
          {priceUpdatedAt && (
            <span className="small">
              {' '}
              (최종 업데이트: {new Date(priceUpdatedAt).toLocaleString('ko-KR')}
              )
            </span>
          )}
          <br />
          <span style={{ fontSize: '0.9em', color: '#94a3b8' }}>
            📊 총 수집된 뉴스:{' '}
            <strong style={{ color: '#4ade80' }}>{news.length}개</strong>
          </span>
        </div>
      </div>

      <div className="news-list">
        {news.length === 0 && <p className="empty">뉴스를 불러오는 중...</p>}
        {paginatedNews.map((article, i) => (
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
              {article.pubDate
                ? new Date(article.pubDate).toLocaleString('ko-KR')
                : ''}
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
