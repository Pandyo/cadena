import { useWallet } from "../contexts/WalletContext";

export default function ConnectWallet() {
  const { connect, loading } = useWallet();

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <div className="connect-logo">&#8383;</div>
        <h1>Cadena Exchange</h1>
        <p>블록체인 기반 가상 암호화폐 거래소</p>
        <ul className="feature-list">
          <li>가입 즉시 <strong>100만 KRW</strong> 지급</li>
          <li>GPS 위치 인증 시 <strong>CDA 100개</strong> 보상</li>
          <li>보안 뉴스 기반 <strong>실시간 시세 반영</strong></li>
        </ul>
        <button className="btn-primary btn-large" onClick={connect} disabled={loading}>
          {loading ? "서명 요청 중..." : "MetaMask로 시작하기"}
        </button>
        <p className="hint">MetaMask가 설치되어 있어야 합니다</p>
      </div>
    </div>
  );
}
