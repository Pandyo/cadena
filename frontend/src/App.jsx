import { useEffect, useState } from 'react'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import { MarketProvider } from './contexts/MarketContext'
import Header from './components/Header'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import TradingDashboard from './components/TradingDashboard'
import LocationVerify from './components/LocationVerify'
import NewsFeed from './components/NewsFeed'

function AppContent() {
  const { user, connect, loading } = useWallet()
  const [enteredExchange, setEnteredExchange] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('cadena-active-tab')
    return ['dashboard', 'trade', 'location', 'news'].includes(savedTab)
      ? savedTab
      : 'dashboard'
  })

  useEffect(() => {
    localStorage.setItem('cadena-active-tab', activeTab)
  }, [activeTab])

  const handleLandingStart = async () => {
    if (user) {
      setEnteredExchange(true)
      return
    }

    await connect()
    if (localStorage.getItem('cadana_token')) {
      setEnteredExchange(true)
    }
  }

  if (!enteredExchange) {
    return <LandingPage onStart={handleLandingStart} loading={loading} />
  }

  return (
    <div className="app-layout">
      <Header />
      <nav className="tab-nav">
        {['dashboard', 'trade', 'location', 'news'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dashboard' && '대시보드'}
            {tab === 'trade' && '거래 & 차트'}
            {tab === 'location' && '위치 보상'}
            {tab === 'news' && '보안 뉴스'}
          </button>
        ))}
      </nav>
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard onOpenLocation={() => setActiveTab('location')} />
        )}
        {activeTab === 'trade' && <TradingDashboard />}
        {activeTab === 'location' && <LocationVerify />}
        {activeTab === 'news' && <NewsFeed />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </WalletProvider>
  )
}
