const PriceHistory = require('../models/PriceHistory')

exports.getCurrentPrice = async (req, res) => {
  try {
    const latest = await PriceHistory.findOne().sort({ createdAt: -1 })
    const price = latest
      ? latest.price
      : Number(process.env.CDA_BASE_PRICE) || 1000

    res.json({
      price,
      changePercent: latest?.changePercent || 0,
      changeAmount: latest?.changeAmount || 0,
      sentimentScore: latest?.sentimentScore || 0,
      newsCount: latest?.newsCount || 0,
      previousPrice: latest?.previousPrice || price,
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
    res.json(history.reverse())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
