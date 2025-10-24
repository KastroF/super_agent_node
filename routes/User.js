const express = require("express"); 

const router = express.Router(); 

const userCtrl = require("../controllers/User"); 
const auth = require("../middleware/auth");

router.post("/adduser", userCtrl.addUser); 
router.post("/signin", userCtrl.signIn)
router.get("/getuser", auth, userCtrl.getUser);
router.post("/modifypass", auth, userCtrl.modifyPass);
router.post("/updatebalance", auth, userCtrl.updateBalance);

module.exports = router; 