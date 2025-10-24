const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const SECRET = process.env.CODETOKEN

exports.addUser = async (req, res) => {

    try{

        const {mmPhone, amPhone, password, name} = req.body;

        const existingUser = await User.findOne({$or: [{mmPhone}, {amPhone}]});

        if (existingUser) {
            
            return res.status(200).json({ status: 1,  message: "Numéro Airtel Money ou Moov Money déjà utilisé" });
          }
      
    
          const hashedPassword = await bcrypt.hash(password, 10);
          
          const newUser = new User({
            mmPhone,
            amPhone,
            name,
            status: "superagent",
            password: hashedPassword,
          });
      
     
          await newUser.save();

          const token = jwt.sign({ userId: newUser._id }, process.env.CODETOKEN);
      
          res.status(201).json({ status: 0, message: "Utilisateur ajouté avec succès", user: newUser, token });

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
        return res.status(200).json({ status: 1, message: "Numéro introuvable" });
      }
  
      // Vérifie le mot de passe
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(200).json({ status: 1, message: "Mot de passe incorrect" });
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
  exports.getUser = async (req, res) => {
    try {
      // Récupération de l'utilisateur connecté
      const user = await User.findById(req.auth.userId).lean(); // .lean() renvoie un objet JS pur
  
      if (!user) {
        return res.status(404).json({ status: 1, error: "Utilisateur introuvable" });
      }
  
      let count = 0;
  
      // Vérifie si c’est un superagent
      if (user.status === "superagent") {
        // 🔥 Correction de la faute de frappe: countDocuments (pas counDocuments)
        // 🔥 Correction du champ: superagentId (pas superagent)
        count = await User.countDocuments({ superagentId: user._id });
      }
  
      // On ajoute dynamiquement le nombre de sous-utilisateurs
      user.count = count;
  
      // Supprimer le mot de passe du retour
      delete user.password;
  
      res.status(200).json({ status: 0, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  };
  exports.modifyPass = async (req, res) => {
    try {
      const { servicename, pass } = req.body;
  
      if (!servicename || pass === undefined) {

        return res.status(200).json({ status: 1, message: "Paramètres manquants" });

      }
  
      const body = servicename === "am" ? { amPass: pass } : { mmPass: pass };
  
      await User.updateOne({ _id: req.auth.userId }, { $set: body });
  
      res.status(200).json({
        status: 0,
        message: `Mot de passe  ${servicename.toUpperCase()} mis à jour avec succès.`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  };
  

  exports.updateBalance = async (req, res) => {

        try{

            const {balance, servicename} = req.body; 

            let body = servicename === "am" ? {amSolde: balance} : {mmSolde: balance}; 

            await User.updateOne({_id: req.auth.userId}, {$set: body}); 

            res.status(201).json({status: 0});



        }catch(err){

            console.log(err); 
            res.status(500).json({err})
        }
  }