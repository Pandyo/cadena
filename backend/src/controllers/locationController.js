const User = require("../models/User");
const Transaction = require("../models/Transaction");

const COOLDOWN_HOURS = Number(process.env.LOCATION_COOLDOWN_HOURS) || 24;
const REWARD_CDA = Number(process.env.LOCATION_REWARD_CDA) || 100;

exports.claimReward = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "위치 정보가 필요합니다" });
    }

    const user = await User.findOne({ walletAddress: req.user.address });
    const now = new Date();

    if (user.lastLocationClaim) {
      const diff = (now - user.lastLocationClaim) / (1000 * 60 * 60);
      if (diff < COOLDOWN_HOURS) {
        const remaining = Math.ceil(COOLDOWN_HOURS - diff);
        return res.status(429).json({ error: `${remaining}시간 후에 다시 수령 가능합니다` });
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
      note: `위치인증 보상 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
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
