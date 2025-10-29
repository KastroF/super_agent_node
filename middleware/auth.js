const User =  require("../models/User"); 
const jwt = require("jsonwebtoken");
require('dotenv').config();

module.exports = async (req, res, next) => {
  
  console.log("Oh Oh Oh")
  
  try{
    
   
     const token = req.headers.authorization.split(" ")[1];
      
 
     const decodedToken = await jwt.verify(
      token,
      process.env.CODETOKEN
    );
    


    const userId = decodedToken.userId;
     
        req.auth = {
      userId: userId,
    };

    User.findOne({
      _id: userId,
    }).then(
      (user) => {
        console.log("ici meme");

        if (user && user.active) {
            
          console.log("c'est ici");

          next();
        } else {
          res.status(200).json({ status: 5, message: "Déconnectez-le" });
        }
      },
      (err) => {
        res.status(402).json({ err });
      }
    );

    
  }catch(e){
    
    console.log(e)
    res.status(505).json({e})
  }
  
}