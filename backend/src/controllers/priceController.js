const PriceHistory = require('../models/PriceHistory')
const { DEFAULT_ETH_PRICE, normalizeToEthPrice, roundEthPrice } = require('../utils/priceScale')

exports.getCurrentPrice = async (req, res) => {
  try {
    const latest = await PriceHistory.findOne().sort({ createdAt: -1 })
    const price = latest ? normalizeToEthPrice(latest.price) : DEFAULT_ETH_PRICE
    const previousPrice = latest?.previousPrice
      ? normalizeToEthPrice(latest.previousPrice)
      : price

    res.json({
      price,
      changePercent: latest?.changePercent || 0,
      changeAmount: latest ? roundEthPrice(price - previousPrice) : 0,
      sentimentScore: latest?.sentimentScore || 0,
      newsCount: latest?.newsCount || 0,
      previousPrice,
      updatedAt: latest?.createdAt || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getPriceHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30
    const history = await PriceHistory.find()
      .sort({ createdAt: -1 })
      .limit(limit)
    res.json(
      history.reverse().map((record) => {
        const price = normalizeToEthPrice(record.price)
        const previousPrice = record.previousPrice
          ? normalizeToEthPrice(record.previousPrice)
          : price

        return {
          ...record.toObject(),
          price,
          previousPrice,
          changeAmount: roundEthPrice(price - previousPrice),
        }
      })
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
