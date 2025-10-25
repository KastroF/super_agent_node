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

    const user = await User.findOne({_id: req.auth.userId}); 

   
    const newOrder = new Order({
      amount,
      clientPhone,
      type,
      userId: req.auth.userId, 
      operation: "depot",
      transId: uuidv4(), 
      status: "pending", 
      superagentId: user.superagentId
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
        status: "success",
        date: { $gte: threeMinutesAgo }
      }).sort({ date: -1 });

      if (existingOrder) {
        // ✅ On marque comme lu
        existingOrder.read = true;
     
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
      superagentId: req.auth.userId,
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

  exports.getPendingOrder = async (req, res) => {

    try{

      const order = await Order.find({status: "pending"}).sort({date: 1}).limit(1); 

      res.status(200).json({status: 0, order}); 

    }catch(err){

          console.log(err); 
          res.status(505).json({err})
      }
}
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


exports.getPaginatedOrders = async (req, res) => {
  try {
    const startAt = parseInt(req.body.startAt) || 0;

    // 🔍 Récupération du user connecté
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ status: 1, message: "Utilisateur introuvable" });
    }

    let filter;

    if (user.status === "superagent") {
      // 🎯 Si superagent → ses propres commandes
      filter = { superagentId: new ObjectId(req.auth.userId) };
    } else {
      // 🎯 Si partner → ses commandes + retraits non utilisés de son superagent
      const userObjId = new ObjectId(req.auth.userId);
      const superagentObjId = user.superagentId
        ? new ObjectId(user.superagentId)
        : null;

      filter = {
        $or: [
          { userId: userObjId },
          ...(superagentObjId
            ? [
                {
                  operation: "retrait",
                  isUse: false,
                  superagentId: superagentObjId,
                },
              ]
            : []),
        ],
      };
    }

    // 📦 Récupération paginée
    const orders = await Order.find(filter)
      .sort({ date: -1 })
      .skip(startAt)
      .limit(10);

    const nextStartAt = orders.length === 10 ? startAt + 10 : null;

    return res.status(200).json({
      status: 0,
      message: "Commandes récupérées avec succès",
      orders,
      nextStartAt,
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des commandes:", err);
    return res.status(500).json({
      status: 1,
      message: "Erreur interne du serveur",
    });
  }
};

exports.useOrder = async (req, res) => {

        try{

            const {_id, clientPhone} = req.body; 

            const order = await Order.findById({_id}); 

            if(order.clientPhone !== clientPhone){

                return res.status(200).json({status: 1, message: "Le numéro que vous avez communiqué est incorrect"})
            }

            
            res.status(200).json({status: 0})




        }catch(err){

            console.log(err)
            res.status(500).json({err})
        }
}