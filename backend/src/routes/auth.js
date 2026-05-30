const router = require("express").Router();
const ctrl = require("../controllers/authController");

router.get("/nonce/:address", ctrl.getNonce);
router.post("/verify", ctrl.verifySignature);
router.get("/me", require("../middleware/auth"), ctrl.getMe);

module.exports = router;
