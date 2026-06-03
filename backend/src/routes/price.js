const router = require('express').Router()
const ctrl = require('../controllers/priceController')
const { updatePriceFromNews } = require('../services/newsService')

router.get('/current', ctrl.getCurrentPrice)
router.get('/history', ctrl.getPriceHistory)

// 수동 트리거: 보안뉴스 기반 가격 업데이트
router.post('/update-from-news', async (req, res) => {
  try {
    const result = await updatePriceFromNews()
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
