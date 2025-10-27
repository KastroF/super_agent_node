const express = require("express"); 

const router = express.Router(); 

const partnerCtrl = require("../controllers/Partners"); 
const auth = require("../middleware/auth");

router.get("/getpartners", auth, partnerCtrl.getPartners); 
router.post("/addpartner", auth, partnerCtrl.addPartner);
router.post("/lockorunlock", auth, partnerCtrl.lockOrUnLockPartner);

module.exports = router; 