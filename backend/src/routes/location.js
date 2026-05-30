const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/locationController");

router.post("/claim", auth, ctrl.claimReward);

module.exports = router;
