import { Newspaper, AlertTriangle, Info, TrendingUp, ExternalLink } from 'lucide-react';

const newsItems = [
  {
    id: 1,
    title: '대규모 랜섬웨어 공격, 글로벌 기업 타겟',
    severity: 'high',
    time: '2시간 전',
    impact: '+15%',
    description: 'LockBit 3.0 랜섬웨어가 다수의 기업을 공격하여 시스템 마비 발생',
  },
  {
    id: 2,
    title: '새로운 제로데이 취약점 발견 (CVE-2026-1234)',
    severity: 'critical',
    time: '4시간 전',
    impact: '+25%',
    description: 'Apache 웹서버에서 원격 코드 실행이 가능한 취약점 발견',
  },
  {
    id: 3,
    title: '암호화폐 거래소 해킹 시도 차단',
    severity: 'medium',
    time: '6시간 전',
    impact: '+8%',
    description: '국내 주요 거래소, DDoS 공격 성공적으로 방어',
  },
  {
    id: 4,
    title: '피싱 메일 대량 유포 주의보',
    severity: 'medium',
    time: '8시간 전',
    impact: '+5%',
    description: '금융권을 사칭한 피싱 메일이 대량으로 유포 중',
  },
  {
    id: 5,
    title: 'AI 기반 보안 솔루션 효과 입증',
    severity: 'low',
    time: '10시간 전',
    impact: '-3%',
    description: '기업들의 AI 보안 도입으로 침해사고 감소 추세',
  },
];

const severityConfig = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: '긴급' },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', label: '높음' },
  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: '보통' },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', label: '낮음' },
};

export function SecurityNewsSection() {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-yellow-500" />
          보안뉴스
        </h2>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">활성 위협: 12건</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-xl p-4 border border-red-700/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-400">위험도 지수</span>
          </div>
          <div className="text-2xl text-red-400">높음</div>
          <div className="text-xs text-gray-400 mt-1">평균 대비 +35%</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-xl p-4 border border-yellow-700/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-400">변동성 영향</span>
          </div>
          <div className="text-2xl text-yellow-400">+18%</div>
          <div className="text-xs text-gray-400 mt-1">보안 사고 증가 중</div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
        {newsItems.map((news) => {
          const config = severityConfig[news.severity as keyof typeof severityConfig];
          return (
            <div
              key={news.id}
              className={`p-4 rounded-lg border ${config.border} ${config.bg} hover:border-opacity-100 transition-all cursor-pointer group`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 ${config.bg} ${config.text} text-xs rounded border ${config.border}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-400">{news.time}</span>
                  </div>
                  <h3 className="font-medium mb-1 group-hover:text-yellow-400 transition-colors">
                    {news.title}
                  </h3>
                  <p className="text-sm text-gray-400">{news.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className={`text-sm font-medium ${news.impact.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>
                    {news.impact}
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2">
          <Info className="w-4 h-4" />
          <span>더 많은 뉴스 보기</span>
        </button>
      </div>
    </div>
  );
}
