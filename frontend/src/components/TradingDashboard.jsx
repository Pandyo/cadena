import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useMarket } from '../contexts/MarketContext'
import { createChart } from 'lightweight-charts'
import api from '../api/client'

export default function TradingDashboard() {
  const { user, fetchUser } = useWallet()
  const {
    currentPrice,
    priceHistory,
    priceUpdatedAt,
    priceStats,
    fetchHistory,
  } = useMarket()
  const [mode, setMode] = useState('buy')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [displayPrice, setDisplayPrice] = useState(currentPrice)
  const [sentimentPopup, setSentimentPopup] = useState(null)

  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const seriesRef = useRef(null)
  const lastCandleRef = useRef(null)

  // 차트 초기화 (막대 그래프로 변경)
  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = createChart(chartRef.current, {
      layout: {
        background: { color: '#0f0f1a' },
        textColor: '#e0e0e0',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      width: chartRef.current.clientWidth,
      height: 280,
      timeScale: { timeVisible: true, barSpacing: 50 },
      crosshair: { mode: 0 },
    })

    seriesRef.current = chartInstance.current.addCandlestickSeries({
      upColor: '#ef4444', // 상승: 빨간색
      downColor: '#3b82f6', // 하락: 파란색
      borderDownColor: '#3b82f6',
      borderUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
    })

    return () => {
      chartInstance.current?.remove()
    }
  }, [])

  // 차트 데이터 업데이트 및 감성 팝업
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return

    const data = priceHistory.map((p) => ({
      time: Math.floor(new Date(p.date || p.createdAt).getTime() / 1000),
      open: p.previousPrice || p.price,
      high: Math.max(p.previousPrice || p.price, p.price),
      low: Math.min(p.previousPrice || p.price, p.price),
      close: p.price,
    }))

    seriesRef.current.setData(data)
    chartInstance.current?.timeScale().fitContent()
  }, [priceHistory])

  // 감성 팝업: 마운트 시 즉시 뜨지 않도록 하고, 1분마다 최신 히스토리를 가져와 팝업 표시
  useEffect(() => {
    let mounted = true
    const showPopupTick = async () => {
      try {
        const res = await fetchHistory()
        const latest = res && res.length ? res[res.length - 1] : null
        if (!latest || latest.sentimentScore === undefined) return

        const sentiment = latest.sentimentScore > 0 ? '긍정' : latest.sentimentScore < 0 ? '부정' : '중립'
        const score = Math.abs(latest.sentimentScore)
        let multiplier = 1.0
        if (score >= 10) multiplier = 2.0
        else if (score > 0) multiplier = 1 + score * 0.1

        if (!mounted) return
        setSentimentPopup({
          text: `보안뉴스 동향 (${sentiment}) ${multiplier.toFixed(1)}배 ${latest.changePercent >= 0 ? '상승' : '하락'}`,
          type: sentiment === '긍정' ? 'positive' : sentiment === '부정' ? 'negative' : 'neutral',
        })
        setTimeout(() => setSentimentPopup(null), 5000)
      } catch (e) {
        // ignore
      }
    }

    const interval = setInterval(showPopupTick, 60000) // 1분마다 실행
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [fetchHistory])

  // 실시간 가격 변동 (1초마다 1000~10000 범위에서 ±200원)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPrice((prev) => {
        const change = (Math.random() - 0.5) * 400 // ±200
        let newPrice = prev + change
        newPrice = Math.max(1000, Math.min(10000, newPrice))
        newPrice = Math.round(newPrice)

        // 차트의 실시간 봉 업데이트
        try {
          if (seriesRef.current) {
            const t = Math.floor(Date.now() / 1000)
            const last = lastCandleRef.current
            if (last && last.time === t) {
              const updated = {
                time: t,
                open: last.open,
                high: Math.max(last.high, newPrice),
                low: Math.min(last.low, newPrice),
                close: newPrice,
              }
              lastCandleRef.current = updated
              seriesRef.current.update(updated)
            } else {
              const newCandle = {
                time: t,
                open: last ? last.close : newPrice,
                high: newPrice,
                low: newPrice,
                close: newPrice,
              }
              lastCandleRef.current = newCandle
              seriesRef.current.update(newCandle)
            }
          }
        } catch (e) {
          // chart not ready or update failed
        }

        return newPrice
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // 거래 처리
  const handleTrade = async () => {
    if (!amount || Number(amount) <= 0) return
    setLoading(true)
    setMsg(null)
    try {
      const cdaAmount = Number(amount)
      if (mode === 'buy') {
        await api.post('/trade/buy', { cdaAmount })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매수 완료!` })
      } else {
        await api.post('/trade/sell', { cdaAmount })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매도 완료!` })
      }
      setAmount('')
      fetchUser()
      fetchHistory()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '거래 실패' })
    } finally {
      setLoading(false)
    }
  }

  const cost = amount ? Math.round(Number(amount) * displayPrice) : 0
  const maxBuy = user ? Math.floor(user.krwBalance / displayPrice) : 0
  const maxSell = user?.cdaBalance || 0

  return (
    <div className="trading-dashboard-v2">
      {/* 상단: 차트 */}
      <div className="chart-section-full">
        <div className="chart-header-top">
          <div>
            <h2>CDA/KRW</h2>
            <span className="price-large">
              ₩{displayPrice.toLocaleString()}
            </span>
          </div>
          <div className="chart-stats">
            <div className="stat-box">
              <span className="label">변동률</span>
              <span
                className={`value ${priceStats.changePercent >= 0 ? 'up' : 'down'}`}
              >
                {priceStats.changePercent >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(priceStats.changePercent).toFixed(2)}%
              </span>
            </div>
            <div className="stat-box">
              <span className="label">수집뉴스</span>
              <span className="value">{priceStats.newsCount}개</span>
            </div>
          </div>
        </div>
        <div ref={chartRef} className="chart-container-full" />
        {sentimentPopup && (
          <div className={`sentiment-popup ${sentimentPopup.type}`}>
            <span>📰 {sentimentPopup.text}</span>
          </div>
        )}
      </div>

      {/* 중간: 거래 + 통계 */}
      <div className="middle-section">
        {/* 거래 패널 */}
        <div className="trade-card">
          <h3>거래하기</h3>

          <div className="toggle-group">
            <button
              className={`toggle-btn ${mode === 'buy' ? 'active' : ''}`}
              onClick={() => {
                setMode('buy')
                setAmount('')
              }}
            >
              매수
            </button>
            <button
              className={`toggle-btn ${mode === 'sell' ? 'active' : ''}`}
              onClick={() => {
                setMode('sell')
                setAmount('')
              }}
            >
              매도
            </button>
          </div>

          <div className="trade-input-group">
            <label>수량 (CDA)</label>
            <div className="input-row">
              <input
                type="number"
                min="1"
                max={mode === 'buy' ? maxBuy : maxSell}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <button
                className="max-btn"
                onClick={() => setAmount(mode === 'buy' ? maxBuy : maxSell)}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="trade-summary">
            <div className="summary-row">
              <span>예상 {mode === 'buy' ? '구매가' : '수취액'}</span>
              <strong>₩{cost.toLocaleString()}</strong>
            </div>
            <div className="summary-row">
              <span>평단가</span>
              <strong>₩{displayPrice.toLocaleString()}</strong>
            </div>
          </div>

          <button
            className={`trade-btn ${mode === 'buy' ? 'buy' : 'sell'}`}
            onClick={handleTrade}
            disabled={loading || !amount}
          >
            {loading ? '처리 중...' : mode === 'buy' ? '매수하기' : '매도하기'}
          </button>

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        </div>

        {/* 정보 패널 */}
        <div className="info-card">
          <h3>내 자산</h3>

          <div className="info-row">
            <span className="label">KRW 잔액</span>
            <span className="value">
              ₩{Math.round(user?.krwBalance || 0).toLocaleString()}
            </span>
          </div>

          <div className="info-row">
            <span className="label">CDA 보유</span>
            <span className="value">
              {(user?.cdaBalance || 0).toLocaleString()} CDA
            </span>
          </div>

          <div className="divider"></div>

          <div className="info-row total">
            <span className="label">총 자산</span>
            <span className="value">
              ₩
              {Math.round(
                (user?.krwBalance || 0) +
                  (user?.cdaBalance || 0) * currentPrice,
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
