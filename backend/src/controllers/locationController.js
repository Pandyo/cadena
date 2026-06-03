const User = require("../models/User");
const Transaction = require("../models/Transaction");

const COOLDOWN_HOURS = Number(process.env.LOCATION_COOLDOWN_HOURS) || 24;
const REWARD_CDA = Number(process.env.LOCATION_REWARD_CDA) || 100;

const CAMPUS_LAT = 37.713203;
const CAMPUS_LNG = 126.890075;
// 허용 반경 (단위: km) - 500미터 이내 허용
const ALLOWED_RADIUS_KM = 0.5;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.claimReward = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "위치 정보가 필요합니다" });
    }

    const distance = getDistanceFromLatLonInKm(
      CAMPUS_LAT,
      CAMPUS_LNG,
      latitude,
      longitude
    );

    if (distance > ALLOWED_RADIUS_KM) {
      return res.status(403).json({
        error: `학교 캠퍼스 반경 500m 이내에서만 인증이 가능합니다. (현재 캠퍼스와의 거리: 약 ${(
          distance * 1000
        ).toFixed(0)}m)`,
      });
    }

    const user = await User.findOne({ walletAddress: req.user.address });
    const now = new Date();

    if (user.lastLocationClaim) {
      const diff = (now - user.lastLocationClaim) / (1000 * 60 * 60);
      if (diff < COOLDOWN_HOURS) {
        const remaining = Math.ceil(COOLDOWN_HOURS - diff);
        return res
          .status(429)
          .json({ error: `${remaining}시간 후에 다시 수령 가능합니다` });
      }
    }

    user.cdaBalance += REWARD_CDA;
    user.lastLocationClaim = now;
    user.locationClaimCount += 1;
    await user.save();

    await Transaction.create({
      walletAddress: req.user.address,
      type: "location_reward",
      cdaAmount: REWARD_CDA,
      note: `위치인증 보상 (${latitude.toFixed(4)}, ${longitude.toFixed(
        4
      )}) - 캠퍼스 인증`,
    });

    res.json({
      success: true,
      reward: REWARD_CDA,
      cdaBalance: user.cdaBalance,
      claimCount: user.locationClaimCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
