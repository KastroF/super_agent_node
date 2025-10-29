const express = require("express"); 

const router = express.Router(); 

const orderCtrl = require("../controllers/Order"); 
const auth = require("../middleware/auth");

router.post("/addorder", auth, orderCtrl.addOrder);
router.post("/updateorder", auth, orderCtrl.updateOrCreateOrder); 
router.post("/addorderr", auth, orderCtrl.addOrderR);
router.post("/updateorder2", auth, orderCtrl.updateOrder);
router.get("/getpendingorder", auth, orderCtrl.getPendingOrder);
router.post("/getpaginatedorders", auth, orderCtrl.getPaginatedOrders);
router.post("/useorder", auth, orderCtrl.useOrder);
router.post("/canceledorder", auth, orderCtrl.canceledOrder); 
router.post("/extractamcomission", auth, orderCtrl.extractAmCommission);
router.post("/getpaginatedorders2", auth, orderCtrl.getPaginatedOrders2);

module.exports = router; 