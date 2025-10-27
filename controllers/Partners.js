const bcrypt = require("bcrypt");
const User = require("../models/User");

exports.getPartners = async (req, res) => {

    try{

        const partners = await User.find({superagentId: req.auth.userId}).lean(); 

        if (!partners.length) {
            return res.status(200).json({ status: 0, partners: [], message: "Aucun compte créé pour le moment" });
          }

        res.status(200).json({status: 0, partners}); 


    }catch(err) {

        console.log(err); 
        res.status(505).json({err})
    }

}


exports.addPartner = async (req, res) => {
  try {
    const { name, password, services } = req.body;

    if (!name || !password) {
      return res.status(400).json({ status: 1, message: "Nom et mot de passe requis" });
    }

    // Vérifie si un partenaire avec ce nom existe déjà pour ce superagent
    const existingPartner = await User.findOne({
      name,
      superagentId: req.auth.userId,
      status: "partner"
    });

    if (existingPartner) {
      return res.status(200).json({ status: 1, message: "Un partenaire avec ce nom existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPartner = new User({
      name,
      password: hashedPassword,
      amPhone: name,
      services: services || [],
      status: "partner",
      superagentId: req.auth.userId
    });

    await newPartner.save();

    res.status(201).json({
      status: 0,
      message: "Partenaire ajouté avec succès",
      partner: {
        _id: newPartner._id,
        name: newPartner.name,
        active: newPartner.active,
        date: newPartner.date,
        services: newPartner.services
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
  }
};

exports.lockOrUnLockPartner = async (req, res) => {

    try{

      const {status, _id} = req.body;

      await User.updateOne({_id}, {$set: {active: status}}); 

      const user = await User.findById({_id}); 

      delete user.password; 

      res.status(201).json({status: 0, message: `Ce compte a été ${status ? "débloqué" : "bloqué"} avec succès`, user})

    }catch (err) {
    console.error(err);
    res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
  }
}

exports.modifyPartnerPassword = async (req, res) => {

    try{

      const {password, _id} = req.body; 

      const hashedPassword = await bcrypt.hash(password, 10);

      await User.updateOne({_id}, {$set: {password: hashedPassword}}); 

      

    }catch (err) {
    console.error(err);
    res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
  }
}