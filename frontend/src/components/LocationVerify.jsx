import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import api from "../api/client";

export default function LocationVerify() {
  const { user, fetchUser } = useWallet();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const canClaim = () => {
    if (!user?.lastLocationClaim) return true;
    const diff = (Date.now() - new Date(user.lastLocationClaim)) / (1000 * 60 * 60);
    return diff >= 24;
  };

  const nextClaimTime = () => {
    if (!user?.lastLocationClaim) return null;
    const next = new Date(user.lastLocationClaim);
    next.setHours(next.getHours() + 24);
    return next;
  };

  const handleClaim = () => {
    setLoading(true);
    setStatus(null);
    if (!navigator.geolocation) {
      setStatus({ type: "error", text: "이 브라우저는 GPS를 지원하지 않습니다" });
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post("/location/claim", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setStatus({
            type: "success",
            text: `${res.data.reward} CDA 수령 완료! (총 ${res.data.claimCount}회)`,
          });
          fetchUser();
        } catch (err) {
          setStatus({ type: "error", text: err.response?.data?.error || "수령 실패" });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setStatus({ type: "error", text: "위치 정보 접근 실패: " + err.message });
        setLoading(false);
      }
    );
  };

  const next = nextClaimTime();
  const eligible = canClaim();

  return (
    <div className="location-panel">
      <h2>위치 인증 보상</h2>
      <div className="location-info-card">
        <div className="location-icon">&#128205;</div>
        <p>GPS 위치를 인증하면 <strong>CDA 100개</strong>를 받을 수 있습니다.</p>
        <p className="hint">24시간마다 1회 수령 가능합니다.</p>
      </div>

      <div className="claim-stats">
        <div className="stat-row">
          <span>총 수령 횟수</span>
          <strong>{user?.locationClaimCount || 0}회</strong>
        </div>
        <div className="stat-row">
          <span>누적 보상</span>
          <strong>{(user?.locationClaimCount || 0) * 100} CDA</strong>
        </div>
        {!eligible && next && (
          <div className="stat-row">
            <span>다음 수령 가능</span>
            <strong>{next.toLocaleString("ko-KR")}</strong>
          </div>
        )}
      </div>

      <button
        className={`btn-primary btn-large ${!eligible ? "disabled" : ""}`}
        onClick={handleClaim}
        disabled={loading || !eligible}
      >
        {loading ? "위치 확인 중..." : eligible ? "위치 인증하고 CDA 받기" : "24시간 후 다시 가능"}
      </button>

      {status && <div className={`location-msg ${status.type}`}>{status.text}</div>}
    </div>
  );
}
