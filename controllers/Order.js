const Order = require("../models/Order");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid"); 

exports.addOrder = async (req, res) => {
  try {
    const { amount, clientPhone, type } = req.body;


    if (!amount || !clientPhone || !type) {
      return res.status(400).json({
        status: 1,
        message: "Les champs amount, clientPhone et type sont requis",
      });
    }

   
    const newOrder = new Order({
      amount,
      clientPhone,
      type,
      userId: req.auth.userId, 
      operation: "depot",
      transId: uuidv4(), 
      status: "pending"
    });


    await newOrder.save();

    res.status(201).json({
      status: 0,
      message: "Commande enregistrée avec succès",
      order: newOrder,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
  }
};




exports.updateOrCreateOrder = async (req, res) => {
  
    try {
    const { amount, balance, clientPhone, type, transId } = req.body;

    if (!balance || !type) {
      return res.status(400).json({ status: 1, message: "Champs requis manquants (balance, type)" });
    }

    // Champ à mettre à jour selon le type
    const soldeField = type === "am" ? "amSolde" : "mmSolde";

    // ✅ Mise à jour du solde du user

    if(balance && parseInt(balance) > 0){

        await User.updateOne(
            { _id: req.auth.userId },
            { $set: { [soldeField]: balance } }
          );

    }


    // Vérifie si on a assez d’infos pour rechercher un order
    if (amount && clientPhone) {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      const existingOrder = await Order.findOne({
        clientPhone,
        amount,
        type,
        date: { $gte: threeMinutesAgo }
      }).sort({ date: -1 });

      if (existingOrder) {
        // ✅ On marque comme lu
        existingOrder.read = true;
        existingOrder.isUse = true;
        existingOrder.balance = balance;
        await existingOrder.save();

        return res.status(200).json({
          status: 0,
          message: "Commande mise à jour et solde actualisé",
          order: existingOrder
        });
      }
    }

    // ✅ Aucun order trouvé → on crée un nouveau
    const newOrder = new Order({
      amount,
      balance,
      clientPhone,
      operation: "depot",
      status: "success",
      type,
      transId: transId || `ORD-${Date.now()}`,
      userId: req.auth.userId,
      read: true
    });

    await newOrder.save();

    return res.status(201).json({
      status: 0,
      message: "Nouvelle commande créée et solde mis à jour",
      order: newOrder
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
  }
};


exports.addOrderR = async (req, res) => {
    try {
      const { amount, balance, clientPhone, type, transId } = req.body;
  
      if (!balance || !type) {
        return res.status(400).json({ status: 1, message: "Champs requis manquants (balance, type)" });
      }
  
      // Mise à jour du solde selon le type
      const soldeField = type === "am" ? "amSolde" : "mmSolde";
      if (balance && parseInt(balance) > 0) {
        await User.updateOne(
          { _id: req.auth.userId },
          { $set: { [soldeField]: balance } }
        );
      }
  
      // Vérifie si un order avec le même transId existe déjà
      if (transId) {
        const existingByTransId = await Order.findOne({ transId });
        if (existingByTransId) {
  
          return res.status(200).json({
            status: 0,
            message: "Commande existante mise à jour via transId",
            order: existingByTransId
          });
        }
      }
  
      
      const newOrder = new Order({
        amount,
        balance,
        clientPhone,
        operation: "retrait",
        type,
        transId: transId || `ORD-${Date.now()}`,
        userId: req.auth.userId,
        read: true, 
        status: "success"
      });
  
      await newOrder.save();
  
      return res.status(201).json({
        status: 0,
        message: "Nouvelle commande créée avec opération retrait",
        order: newOrder
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  };
  

  exports.updateOrder = async (req, res) => {

        try{


            const {id} = req.body; 

            await Order.updateOne({_id}, {$set: {status: "success"}}); 

            res.status(201).json({status: 0, message: "Tout est Ok"}); 

        }catch (err) {
        console.error(err);
        res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  }