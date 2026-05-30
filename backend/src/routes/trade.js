const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/tradeController");

router.post("/buy", auth, ctrl.buy);
router.post("/sell", auth, ctrl.sell);
router.get("/history", auth, ctrl.getHistory);

module.exports = router;
