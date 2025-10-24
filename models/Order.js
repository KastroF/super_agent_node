const mongoose = require("mongoose"); 


const orderSchema = mongoose.Schema({

        amount: {type: Number}, 
        clientPhone: {type: String}, 
        type: {type: String}, 
        date: {type: Date, default: Date.now}, 
        userId: {type: String}, 
        isUse: {type: Boolean, default: false}, 
        read: {type: Boolean, default: false}, 
        transId: {type: String}, 
        status: {type: String}, 
        operation: {type: String}

})

module.exports = mongoose.model("Order", orderSchema); 