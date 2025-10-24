const mongoose = require("mongoose"); 

const partnerSchema = mongoose.Schema({

        name: {type: String}, 
        password: {type: String}, 
        active: {type: Boolean, default: true},
        date: {type: Date, default: Date.now}, 
        services: {type: Array}, 
        superagentId: {type: String}, 
        
  
})

module.exports = mongoose.model("Partner", partnerSchema);            