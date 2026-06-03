const PriceHistory = require("../models/PriceHistory");

async function seedInitialPrice() {
  const count = await PriceHistory.countDocuments();
  if (count === 0) {
    const basePrice = Number(process.env.CDA_BASE_PRICE) || 5500;
    await PriceHistory.create({ price: basePrice, newsCount: 0, source: "seed" });
    console.log("Initial price seeded:", basePrice);
  }
}

// PriceHistory 전체 삭제 후 중간값(5500)으로 재시드
async function resetPrice() {
  await PriceHistory.deleteMany({});
  const basePrice = Number(process.env.CDA_BASE_PRICE) || 5500;
  await PriceHistory.create({ price: basePrice, newsCount: 0, source: "seed_reset" });
  console.log("Price history reset. New seed price:", basePrice);
  return basePrice;
}

module.exports = { seedInitialPrice, resetPrice };
