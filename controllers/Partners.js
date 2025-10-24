const Partner = require("../models/Partner"); 
const bcrypt = require("bcrypt");


exports.getPartners = async (req, res) => {

    try{

        const partners = await Partner.find({superagentId: req.auth.userId}).lean(); 

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

    // Vérifier les champs obligatoires
    if (!name || !password) {
      return res.status(400).json({ status: 1, message: "Nom et mot de passe requis" });
    }

    // Vérifie s’il existe déjà un partenaire avec le même nom pour ce superagent
    const existingPartner = await Partner.findOne({
      name,
      superagentId: req.auth.userId
    });

    if (existingPartner) {
      return res.status(400).json({ status: 1, message: "Un partenaire avec ce nom existe déjà" });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création du partenaire
    const newPartner = new Partner({
      name,
      password: hashedPassword,
      services: services || [],
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
