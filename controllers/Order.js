const Order = require("../models/Order");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid"); 
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const moment = require("moment-timezone");


exports.addOrder = async (req, res) => {
  try {
    const { amount, clientPhone, type, password } = req.body;


    if (!amount || !clientPhone || !type) {
      return res.status(400).json({
        status: 1,
        message: "Les champs amount, clientPhone et type sont requis",
      });
    }

    const user = await User.findOne({_id: req.auth.userId}); 


    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(200).json({ status: 1, message: "Mot de passe incorrect" });
    }

    const superAgent = await User.findOne({superagentId: user.superagentId}); 

    if(type === "am" && parseInt(superAgent.amSolde) < parseInt(amount)){

      return res.status(200).json({ status: 1, message: "Solde Airtel Money insuffisant" });

    }

    if(type === "mm" && parseInt(superAgent.mmSolde) < parseInt(amount)){

      return res.status(200).json({ status: 1, message: "Solde Moov Money insuffisant" });

    }

   
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


async function registerOrderAndCommission(order, commission) {
 // const order = await Order.create(orderData);

  // Si l'utilisateur a un superAgentId → commission pour ce super agent
  if (order.userId) {

    const agent = await User.findById(order.userId);

    if (agent) {
      const now = new Date();
      const month = now.getMonth() + 1; // mois actuel
      const year = now.getFullYear();

      const commissionAmount = commission // 💡 ta fonction métier

      // Vérifie si on est toujours dans le même mois
      const lastHistory = agent.commissions.slice(-1)[0];

      if (!lastHistory || lastHistory.month !== month || lastHistory.year !== year) {
        // Nouveau mois → on enregistre le total précédent avant de réinitialiser
        if (agent.currentCommission > 0) {

          superAgent.commissions.push({
            month: now.getMonth(), // le mois précédent
            year: now.getFullYear(),
            total: agent.currentCommission,
          });
        }
        agent.currentCommission = 0;
      }

      // Incrémente la commission courante
      agent.currentCommission += commissionAmount;

      await agent.save();
    }
  }


}

exports.updateOrCreateOrder = async (req, res) => {
  
    try {
    const { amount, balance, clientPhone, commission, type, transId } = req.body;

    if (!balance || !type) {
      return res.status(400).json({ status: 1, message: "Champs requis manquants (balance, type)" });
    }

    // Champ à mettre à jour selon le type
    const soldeField = type === "am" ? "amSolde" : "mmSolde";

    console.log()

    // ✅ Mise à jour du solde du user

    if(balance && parseInt(balance) > 0){

        await User.updateOne(
            { _id: req.auth.userId },
            { $set: { [soldeField]: balance } }
          );

    }


    const user = await User.findOne({  _id: req.auth.userId })


    // Vérifie si on a assez d’infos pour rechercher un order
    if (amount && clientPhone) {   
        
        console.log("On est entré"); 

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      console.log("amount", amount); 
      console.log("phone", clientPhone); 
      console.log("type", type);

      const existingOrder = await Order.findOne({
        clientPhone,
        amount,
        type,
        status: "success",
        superagentId: req.auth.userId,
        date: { $gte: threeMinutesAgo }
      }).sort({ date: -1 });

      

      if (existingOrder) {
        // ✅ On marque comme lu

        console.log("il existe"); 

        if(commission){

          await registerOrderAndCommission(existingOrder, commission);

        }

        existingOrder.read = true;
        existingOrder.transId = transId;
     
        await existingOrder.save();

        return res.status(200).json({
          status: 0,
          user,
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
      user,
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
      console.log("On addorderr", req.body);
      
      const { amount, balance, clientPhone, commission, type, transId } = req.body;
  
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
  
      console.log("On a un transid", transId);

      console.log(req.body);

      let newOrder;

      if(commission){

       newOrder = new Order({
          amount,
          balance,
          clientPhone,
          operation: "retrait",
          type,
          commission,
          transId: transId || `ORD-${Date.now()}`,
          read: true, 
          status: "success", 
          superagentId: req.auth.userId
        });

      }else{

        if(type === "am"){


          newOrder = new Order({
            amount,
            balance,
            clientPhone,
            commission: parseInt(amount) <= 100000 ? parseInt(parseInt(amount)/100) : 1000,
            operation: "retrait",
            type,
            transId: transId || `ORD-${Date.now()}`,
            read: true, 
            status: "success", 
            superagentId: req.auth.userId
          });

        }else{

            newOrder = new Order({
              amount,
              balance,
              clientPhone,
              operation: "retrait",
              type,
              transId: transId || `ORD-${Date.now()}`,
              read: true, 
              status: "success", 
              superagentId: req.auth.userId
            });
          }



      }
      

  
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


            const {_id} = req.body; 

            await Order.updateOne({_id}, {$set: {status: "success"}}); 

            res.status(201).json({status: 0, message: "Tout est Ok"}); 

        }catch (err) {
        console.error(err);
        res.status(500).json({ status: 1, error: "Erreur interne du serveur" });
    }
  }

  exports.getPendingOrder = async (req, res) => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(req.auth.userId);
  
      // 1️⃣ On calcule la date limite : il y a 1 minute
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
      // 2️⃣ Supprimer toutes les commandes pending trop anciennes
      await Order.deleteMany({
        status: "pending",
        superagentId: userObjectId,
        date: { $lt: oneMinuteAgo },
      });
  
      // 3️⃣ Récupérer la commande pending la plus récente (moins d'une minute)
      const order = await Order.find({
        status: "pending",
        superagentId: userObjectId,
        date: { $gte: oneMinuteAgo },
      })
        .sort({ date: 1 })
        .limit(1);
  
      res.status(200).json({ status: 0, order });
    } catch (err) {
      console.error(err);
      res.status(505).json({ err });
    }
  };



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
            
            console.log(order); 

            if(order.clientPhone !== clientPhone){

                return res.status(200).json({status: 1, message: "Le numéro que vous avez communiqué est incorrect"})
            }

            if(order.commision){

                await registerOrderAndCommission(order, order.commision);
            }
            
            await Order.updateOne({_id}, {$set: {userId: req.auth.userId, isUse: true}}); 
            res.status(200).json({status: 0})



        }catch(err){

            console.log(err)
            res.status(500).json({err})
        }
}


exports.canceledOrder = async (req, res) => {

    try{

      const {_id} = req.body; 
      
      await Order.updateOne({_id}, {$set: {canceled: true}}); 

      res.status(201).json({status: 0, message: "Annulation de transaction initié avec succès"}); 




    }catch(err){

            console.log(err)
            res.status(500).json({err})
        }
}

exports.extractAmCommission = async (req, res) => {

    try{

      const {transId, commission} = req.body; 

      const existingOrder = await Order.findOne({transId}); 

      if(!existingOrder){

          return res.status(200).json({status: 1, })
      }

      await registerOrderAndCommission(existingOrder, commission); 

      res.status(201).json({status: 0}); 

    }catch(err){

            console.log(err)
            res.status(500).json({err})
        }
}


exports.getPaginatedOrders2 = async (req, res) => {
  try {
    const startAt = parseInt(req.body.startAt) || 0;

    const {type, _id} = req.body; 

    // 🔍 Récupération du user connecté
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(200).json({ status: 1, message: "Utilisateur introuvable" });
    }

const TZ = "Africa/Libreville";

// Calcul de la plage horaire du jour local
const startOfLocalDay = moment.tz(TZ).startOf("day"); // 29 oct 00h00 heure du Gabon
const endOfLocalDay = moment.tz(TZ).endOf("day");     // 29 oct 23h59:59 heure du Gabon

// Conversion en UTC avant la requête Mongo
const startUTC = startOfLocalDay.clone().utc().toDate();
const endUTC = endOfLocalDay.clone().utc().toDate();

    // 📦 Récupération paginée
    const orders = await Order.find({type, userId: _id ? _id : req.auth.userId, date: {$gte: startUTC, $lt: endUTC} })
      .sort({ date: -1 })
      .skip(startAt)
      .limit(10);
      const totalDepotsAgg = await Order.aggregate([
        {
          $match: {
            userId: _id ? new mongoose.Types.ObjectId(_id) :new  mongoose.Types.ObjectId(req.auth.userId),
            date: { $gte: startUTC, $lt: endUTC },
            type,
            status: "success",
            operation: "depot"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]);
      
      const totalDepots = totalDepotsAgg[0] ? totalDepotsAgg[0].total : 0;
      
      // Total des retraits
      const totalRetraitsAgg = await Order.aggregate([
        {
          $match: {
            userId: _id ? new mongoose.Types.ObjectId(_id) :new  mongoose.Types.ObjectId(req.auth.userId),
            date: { $gte: startUTC, $lt: endUTC },
            type,
            status: "success",
            operation: "retrait"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]);
      
      const totalRetraits = totalRetraitsAgg[0] ? totalRetraitsAgg[0].total : 0;

    const nextStartAt = orders.length === 10 ? startAt + 10 : null;

    return res.status(200).json({
      status: 0,
      message: "Commandes récupérées avec succès",
      orders,
      totalDepots, 
      totalRetraits,
      nextStartAt,
      commission: user.currentCommission
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des commandes:", err);
    return res.status(500).json({
      status: 1,
      message: "Erreur interne du serveur",
    });
  }
};