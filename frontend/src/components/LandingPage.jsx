import { Wallet, Shield, TrendingUp, Newspaper, ArrowRight, Check } from "lucide-react";
import logoImage from "../imports/logo.png";

export function LandingPage({ onConnect }) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(234, 179, 8, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
              transform: "perspective(500px) rotateX(60deg)",
              transformOrigin: "center bottom",
            }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <img
                src={logoImage}
                alt="Cadena Logo"
                className="h-64 w-auto object-contain animate-pulse"
                style={{ filter: "drop-shadow(0 0 30px rgba(234, 179, 8, 0.6))" }}
              />
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
              보안이슈 연동 변동형
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              가상 암호화폐 거래소 플랫폼
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              블록체인 기술과 보안 뉴스를 기반으로 한 혁신적인 암호화폐 거래 플랫폼입니다.
              보안 사고와 연동된 실시간 가격 변동 시스템을 경험하세요.
            </p>

            {/* CTA Button */}
            <button
              onClick={onConnect}
              className="group px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 rounded-xl text-lg font-medium transition-all transform hover:scale-105 flex items-center gap-3 mx-auto shadow-lg shadow-yellow-500/50"
            >
              <Wallet className="w-6 h-6" />
              MetaMask로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-sm text-gray-500 mt-4">Team. 정재성 거래소</p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-yellow-500 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-yellow-500 rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            프로젝트 <span className="text-yellow-500">목표</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all group">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Newspaper className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">보안 뉴스 기반 거래 시스템</h3>
              <p className="text-gray-400">
                실시간 보안 사고 및 뉴스를 분석하여 암호화폐 가격 변동에 반영합니다.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all group">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">가격변동 거래소 기능</h3>
              <p className="text-gray-400">
                보안 위협 수준에 따라 동적으로 변화하는 가격 시스템으로 실시간 거래가 가능합니다.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-yellow-500/50 transition-all group">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">블록체인 기반 코인 거래 시스템</h3>
              <p className="text-gray-400">
                MetaMask 연동을 통한 안전한 지갑 관리와 투명한 거래 내역을 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Functions Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            프로젝트 <span className="text-yellow-500">핵심 기능</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-2xl p-8 border border-yellow-700/50 mb-4">
                <div className="text-6xl font-bold text-yellow-500 mb-4">01</div>
                <h3 className="text-2xl font-bold mb-4">가상 거래소</h3>
                <ul className="text-left space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>MetaMask 연동을 통한 안전한 로그인</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>실시간 거래 차트</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>보안 뉴스 기반 가격 변동 모니터링</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-2xl p-8 border border-yellow-700/50 mb-4">
                <div className="text-6xl font-bold text-yellow-500 mb-4">02</div>
                <h3 className="text-2xl font-bold mb-4">코인 지급</h3>
                <ul className="text-left space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>일일 뉴스 기반 거래 지급</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>랜덤 위치 도착 시 인센티브 지급</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>출석 수당 발급</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-2xl p-8 border border-yellow-700/50 mb-4">
                <div className="text-6xl font-bold text-yellow-500 mb-4">03</div>
                <h3 className="text-2xl font-bold mb-4">변동성</h3>
                <ul className="text-left space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>보안 뉴스 수집</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>보안 사고 리스크 반영 변동</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>각 수에 따른 코인 변동성 연계 반영</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onConnect}
              className="group px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 rounded-xl text-lg font-medium transition-all transform hover:scale-105 inline-flex items-center gap-3 shadow-lg shadow-yellow-500/50"
            >
              <Wallet className="w-6 h-6" />
              지금 바로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="container mx-auto px-6 text-center text-gray-500">
          <p>&copy; 2026 Cadena. Team 정재성 거래소. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
