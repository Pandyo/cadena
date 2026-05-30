const router = require("express").Router();
const ctrl = require("../controllers/priceController");

router.get("/current", ctrl.getCurrentPrice);
router.get("/history", ctrl.getPriceHistory);

module.exports = router;
