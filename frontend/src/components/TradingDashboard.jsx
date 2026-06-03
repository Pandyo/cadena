import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useMarket } from '../contexts/MarketContext'
import { createChart } from 'lightweight-charts'
import api from '../api/client'
import { ethers } from 'ethers'

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

        const sentiment =
          latest.sentimentScore > 0
            ? '긍정'
            : latest.sentimentScore < 0
              ? '부정'
              : '중립'
        const score = Math.abs(latest.sentimentScore)
        let multiplier = 1.0
        if (score >= 10) multiplier = 2.0
        else if (score > 0) multiplier = 1 + score * 0.1

        if (!mounted) return
        setSentimentPopup({
          text: `보안뉴스 동향 (${sentiment}) ${multiplier.toFixed(1)}배 ${latest.changePercent >= 0 ? '상승' : '하락'}`,
          type:
            sentiment === '긍정'
              ? 'positive'
              : sentiment === '부정'
                ? 'negative'
                : 'neutral',
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

  // 실시간 가격 변동 (1초마다 ETH 기준 변동, 예: ±0.00002)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPrice((prev) => {
        // ETH 기준 미세 변동 (±0.00002)
        const change = (Math.random() - 0.5) * 0.00004
        let newPrice = prev + change
        // 가격 범위: 0.00005 ~ 0.0005 ETH
        newPrice = Math.max(0.00005, Math.min(0.0005, newPrice))
        // 소수점 6자리까지
        newPrice = Number(newPrice.toFixed(6))

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
        if (!window.ethereum) throw new Error("MetaMask가 필요합니다.")
        
        const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS
        if (!treasuryAddress) throw new Error("서버 지갑 주소가 설정되지 않았습니다.")

        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        const tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(costEth.toString()),
        })

        // 백엔드에 거래 전송 기록 알림
        await api.post("/trade/buy", { cdaAmount, txHash: tx.hash })
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
      console.error("Trade error:", err)
      setMsg({ type: 'error', text: err.response?.data?.error || err.message || '거래 실패' })
    } finally {
      setLoading(false)
    }
  }

  const costEth = amount ? Number((Number(amount) * displayPrice).toFixed(6)) : 0
  const maxBuy = ethBalance && displayPrice > 0 ? Math.floor(Number(ethBalance) / displayPrice) : 0
  const maxSell = user?.cdaBalance || 0

  return (
    <div className="trading-dashboard-v2">
      {/* 상단: 차트 */}
      <div className="chart-section-full">
        <div className="chart-header-top">
          <div>
            <h2>CDA/ETH</h2>
            <span className="price-large">
              {displayPrice.toFixed(6)} ETH
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
              <strong>{costEth} ETH</strong>
            </div>
            <div className="summary-row">
              <span>평단가</span>
              <strong>{displayPrice.toFixed(6)} ETH</strong>
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
            <span className="label">ETH 잔액</span>
            <span className="value">
              {Number(ethBalance).toFixed(4)} ETH
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
            <span className="label">총 자산 (ETH 환산)</span>
            <span className="value">
              {(
                Number(ethBalance) +
                  (user?.cdaBalance || 0) * currentPrice
              ).toFixed(4)} ETH
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
