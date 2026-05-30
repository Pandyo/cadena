const PriceHistory = require("../models/PriceHistory");

async function seedInitialPrice() {
  const count = await PriceHistory.countDocuments();
  if (count === 0) {
    const basePrice = Number(process.env.CDA_BASE_PRICE) || 1000;
    await PriceHistory.create({ price: basePrice, newsCount: 0, source: "seed" });
    console.log("Initial price seeded:", basePrice);
  }
}

module.exports = { seedInitialPrice };
