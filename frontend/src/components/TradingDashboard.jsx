import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useMarket } from '../contexts/MarketContext'
import { createChart } from 'lightweight-charts'
import api from '../api/client'
import { ethers } from 'ethers'

const MIN_PRICE = 0.0005
const MAX_PRICE = 0.001
const RANDOM_TICK_RANGE = 0.000012
const CHART_STORAGE_KEY = 'cadena-trade-chart-candles'
const MAX_STORED_CANDLES = 180

function clampPrice(price) {
  return Number(Math.max(MIN_PRICE, Math.min(MAX_PRICE, price)).toFixed(7))
}

function getSentimentMeta(score) {
  const absScore = Math.abs(score)
  const multiplier = absScore === 0 ? 1 : 1 + Math.min(absScore, 10) * 0.1

  if (score > 0) {
    return { label: '긍정', type: 'positive', direction: '상승', multiplier }
  }

  if (score < 0) {
    return { label: '부정', type: 'negative', direction: '하락', multiplier }
  }

  return { label: '중립', type: 'neutral', direction: '변화 없음', multiplier }
}

function makeHistoryCandle(record) {
  const price = record.price
  const previousPrice = record.previousPrice || price

  return {
    time: Math.floor(new Date(record.date || record.createdAt).getTime() / 1000),
    open: previousPrice,
    high: Math.max(previousPrice, price),
    low: Math.min(previousPrice, price),
    close: price,
  }
}

function loadStoredCandles() {
  try {
    const raw = localStorage.getItem(CHART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((candle) => (
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
      ))
      .slice(-MAX_STORED_CANDLES)
  } catch {
    return []
  }
}

function saveStoredCandles(candles) {
  try {
    localStorage.setItem(
      CHART_STORAGE_KEY,
      JSON.stringify(candles.slice(-MAX_STORED_CANDLES)),
    )
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

export default function TradingDashboard() {
  const { user, ethBalance, fetchUser, fetchEthBalance, account } = useWallet()
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
  const [displayPrice, setDisplayPrice] = useState(MIN_PRICE)
  const [sentimentPopup, setSentimentPopup] = useState(null)

  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const seriesRef = useRef(null)
  const candlesRef = useRef([])
  const lastCandleRef = useRef(null)
  const hasFitContentRef = useRef(false)
  const lastHistoryKeyRef = useRef('')
  const lastPopupUpdateRef = useRef(null)

  useEffect(() => {
    setDisplayPrice(currentPrice)
  }, [currentPrice])

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
      priceFormat: {
        type: 'price',
        precision: 7,
        minMove: 0.0000001,
      },
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    })

    const storedCandles = loadStoredCandles()
    if (storedCandles.length > 0) {
      candlesRef.current = storedCandles
      lastCandleRef.current = storedCandles[storedCandles.length - 1]
      seriesRef.current.setData(storedCandles)
      setDisplayPrice(lastCandleRef.current.close)

      chartInstance.current?.timeScale().fitContent()
      hasFitContentRef.current = true
    }

    const handleResize = () => {
      if (!chartRef.current || !chartInstance.current) return
      chartInstance.current.applyOptions({ width: chartRef.current.clientWidth })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return

    const historyKey = priceHistory
      .map((record) => record.createdAt || record.date || record._id)
      .join('|')

    if (historyKey === lastHistoryKeyRef.current) return
    lastHistoryKeyRef.current = historyKey

    const historyCandles = priceHistory.map(makeHistoryCandle)
    const candleMap = new Map(candlesRef.current.map((candle) => [candle.time, candle]))

    for (const candle of historyCandles) {
      candleMap.set(candle.time, candle)
    }

    const mergedCandles = Array.from(candleMap.values())
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_STORED_CANDLES)
    candlesRef.current = mergedCandles
    lastCandleRef.current = mergedCandles[mergedCandles.length - 1] || null
    seriesRef.current.setData(mergedCandles)
    saveStoredCandles(mergedCandles)

    if (!hasFitContentRef.current) {
      chartInstance.current?.timeScale().fitContent()
      hasFitContentRef.current = true
    }
  }, [priceHistory])

  useEffect(() => {
    if (!priceUpdatedAt || priceStats.newsCount <= 0) return

    if (!lastPopupUpdateRef.current) {
      lastPopupUpdateRef.current = priceUpdatedAt
      return
    }

    if (lastPopupUpdateRef.current === priceUpdatedAt) return

    lastPopupUpdateRef.current = priceUpdatedAt

    const sentiment = getSentimentMeta(priceStats.sentimentScore)

    setSentimentPopup({
      text: `보안뉴스 감성 분석 (${sentiment.label}) ${sentiment.multiplier.toFixed(2)}배 ${sentiment.direction}`,
      type: sentiment.type,
    })

    const timeout = setTimeout(() => setSentimentPopup(null), 5000)
    return () => clearTimeout(timeout)
  }, [priceUpdatedAt, priceStats])

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPrice((prev) => {
        const newPrice = clampPrice(prev + (Math.random() - 0.5) * RANDOM_TICK_RANGE)

        try {
          if (seriesRef.current) {
            const time = Math.floor(Date.now() / 1000)
            const last = lastCandleRef.current

            if (last && last.time === time) {
              const updated = {
                time,
                open: last.open,
                high: Math.max(last.high, newPrice),
                low: Math.min(last.low, newPrice),
                close: newPrice,
              }

              const lastIndex = candlesRef.current.length - 1
              if (lastIndex >= 0) candlesRef.current[lastIndex] = updated
              lastCandleRef.current = updated
              seriesRef.current.update(updated)
              saveStoredCandles(candlesRef.current)
            } else {
              const candle = {
                time,
                open: last ? last.close : newPrice,
                high: newPrice,
                low: newPrice,
                close: newPrice,
              }

              candlesRef.current = [...candlesRef.current, candle].slice(-MAX_STORED_CANDLES)
              lastCandleRef.current = candle
              seriesRef.current.update(candle)
              saveStoredCandles(candlesRef.current)
            }
          }
        } catch {
          // The chart can be unavailable for a moment during startup.
        }

        return newPrice
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleTrade = async () => {
    if (!amount || Number(amount) <= 0) return
    setLoading(true)
    setMsg(null)

    try {
      const cdaAmount = Number(amount)

      if (mode === 'buy') {
        if (!window.ethereum) throw new Error('MetaMask가 필요합니다.')

        const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS
        if (!treasuryAddress) throw new Error('서버 지갑 주소가 설정되지 않았습니다.')

        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        const tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(costEth.toString()),
        })

        await api.post('/trade/buy', { cdaAmount, txHash: tx.hash })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매수 완료!` })
      } else {
        await api.post('/trade/sell', { cdaAmount })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매도 완료!` })
      }

      setAmount('')
      fetchUser()
      fetchEthBalance(account)
      fetchHistory()
    } catch (err) {
      console.error('Trade error:', err)
      setMsg({ type: 'error', text: err.response?.data?.error || err.message || '거래 실패' })
    } finally {
      setLoading(false)
    }
  }

  const costEth = amount ? Number((Number(amount) * displayPrice).toFixed(7)) : 0
  const maxBuy = ethBalance && displayPrice > 0 ? Math.floor(Number(ethBalance) / displayPrice) : 0
  const maxSell = user?.cdaBalance || 0

  return (
    <div className="trading-dashboard-v2">
      <div className="chart-section-full">
        <div className="chart-header-top">
          <div>
            <h2>CDA/ETH</h2>
            <span className="price-large">{displayPrice.toFixed(7)} ETH</span>
          </div>
          <div className="chart-stats">
            <div className="stat-box">
              <span className="label">변동률</span>
              <span className={`value ${priceStats.changePercent >= 0 ? 'up' : 'down'}`}>
                {priceStats.changePercent >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(priceStats.changePercent).toFixed(2)}%
              </span>
            </div>
            <div className="stat-box">
              <span className="label">수집 뉴스</span>
              <span className="value">{priceStats.newsCount}개</span>
            </div>
          </div>
        </div>
        <div ref={chartRef} className="chart-container-full" />
        {sentimentPopup && (
          <div className={`sentiment-popup ${sentimentPopup.type}`}>
            <span>{sentimentPopup.text}</span>
          </div>
        )}
      </div>

      <div className="middle-section">
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
              <span>예상 {mode === 'buy' ? '구매가' : '수령액'}</span>
              <strong>{costEth} ETH</strong>
            </div>
            <div className="summary-row">
              <span>평단가</span>
              <strong>{displayPrice.toFixed(7)} ETH</strong>
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

        <div className="info-card">
          <h3>내 자산</h3>

          <div className="info-row">
            <span className="label">ETH 잔액</span>
            <span className="value">{Number(ethBalance).toFixed(7)} ETH</span>
          </div>

          <div className="info-row">
            <span className="label">CDA 보유</span>
            <span className="value">{(user?.cdaBalance || 0).toLocaleString()} CDA</span>
          </div>

          <div className="divider"></div>

          <div className="info-row total">
            <span className="label">총 자산 (ETH 환산)</span>
            <span className="value">
              {(Number(ethBalance) + (user?.cdaBalance || 0) * currentPrice).toFixed(7)} ETH
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
