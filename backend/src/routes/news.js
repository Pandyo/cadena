const router = require("express").Router();
const ctrl = require("../controllers/newsController");

router.get("/", ctrl.getNews);
router.post("/update-price", ctrl.triggerPriceUpdate);

module.exports = router;
