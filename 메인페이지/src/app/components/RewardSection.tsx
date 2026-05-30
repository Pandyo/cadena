import { Gift, TrendingUp, Shield, Award } from 'lucide-react';

const rewardActivities = [
  {
    id: 1,
    activity: '보안 뉴스 읽기',
    reward: 50,
    status: 'available',
    description: '최신 보안 뉴스를 읽고 코인을 받으세요'
  },
  {
    id: 2,
    activity: '보안 사고 리포트 작성',
    reward: 200,
    status: 'available',
    description: '발견한 보안 이슈를 공유하세요'
  },
  {
    id: 3,
    activity: '일일 출석 체크',
    reward: 30,
    status: 'completed',
    description: '오늘의 출석 완료!'
  },
  {
    id: 4,
    activity: '거래 안전도 평가',
    reward: 100,
    status: 'available',
    description: '거래 위험도를 분석하고 보상받기'
  },
];

export function RewardSection() {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-500" />
          위치보상
        </h2>
        <div className="text-right">
          <div className="text-sm text-gray-400">누적 보상</div>
          <div className="text-2xl text-yellow-400">1,250 CADENA</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-xl p-4 border border-yellow-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-400">오늘</span>
          </div>
          <div className="text-xl text-yellow-400">+230</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl p-4 border border-green-700/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-400">이번주</span>
          </div>
          <div className="text-xl text-green-400">+850</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl p-4 border border-purple-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-400">등급</span>
          </div>
          <div className="text-xl text-purple-400">Gold</div>
        </div>
      </div>

      <div className="space-y-3">
        {rewardActivities.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border transition-all ${
              item.status === 'completed'
                ? 'bg-gray-800/30 border-gray-700/50 opacity-60'
                : 'bg-gray-800/50 border-gray-700 hover:border-yellow-600/50 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{item.activity}</h3>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-medium">+{item.reward}</span>
                <span className="text-xs text-gray-400">CADENA</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{item.description}</p>
              {item.status === 'available' ? (
                <button className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm transition-colors">
                  받기
                </button>
              ) : (
                <span className="px-4 py-1.5 bg-gray-700 rounded-lg text-sm text-gray-400">
                  완료
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 rounded-lg p-4 border border-yellow-700/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <Shield className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">보안 뉴스 기반 보상 시스템</h4>
              <p className="text-sm text-gray-400">
                보안 뉴스를 읽고 공유하면 CADENA 코인을 받을 수 있습니다.
                보안 사고가 많을수록 보상이 증가합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
