const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const SECRET = process.env.CODETOKEN

exports.addUser = async (req, res) => {

    try{

        const {mmPhone, amPhone, password, name} = req.body;

        const existingUser = await User.findOne({$or: [{mmPhone}, {amPhone}]});

        if (existingUser) {
            console.log("On se voit bien dedans")
            return res.status(400).json({ status: 1,  message: "Numéro AM ou Moov Money déjà utilisé" });
          }
      
    
          const hashedPassword = await bcrypt.hash(password, 10);
          
          const newUser = new User({
            mmPhone,
            amPhone,
            name,
            password: hashedPassword,
          });
      
     
          await newUser.save();

          const token = jwt.sign({ userId: newUser._id }, process.env.CODETOKEN);
      
          res.status(201).json({ message: "Utilisateur ajouté avec succès", user: newUser, token });

    }catch(err){

            console.log(err); 
            res.status(505).json({err})
    }

}


exports.signIn = async (req, res) => {
    try {
      const { phone, password } = req.body;
  
      // Recherche de l’utilisateur soit par mmPhone soit par amPhone
      const user = await User.findOne({
        $or: [{ mmPhone: phone }, { amPhone: phone }],
      });
  
      if (!user) {
        return res.status(400).json({ status: 1, message: "Numéro introuvable" });
      }
  
      // Vérifie le mot de passe
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ status: 1, message: "Mot de passe incorrect" });
      }
  
      // Génère un token JWT
      const token = jwt.sign({ userId: user._id }, SECRET);
  
      res.status(200).json({
        status: 0,
        message: "Connexion réussie",
        user: {
          id: user._id,
          name: user.name,
          mmPhone: user.mmPhone,
          amPhone: user.amPhone,
        },
        token,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  };