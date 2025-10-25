const express = require("express"); 

const router = express.Router(); 

const orderCtrl = require("../controllers/Order"); 
const auth = require("../middleware/auth");

router.post("/addorder", auth, orderCtrl.addOrder);
router.post("/updateorder", auth, orderCtrl.updateOrCreateOrder); 
router.post("/addorderr", auth, orderCtrl.addOrderR);
router.post("/updateorder2", auth, orderCtrl.updateOrder);

module.exports = router; 