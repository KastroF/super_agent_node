const mongoose = require("mongoose"); 

const userSchema = mongoose.Schema({

        name: {type: String}, 
        amPhone: {type: String}, 
        mmPhone: {type: String}, 
        password: {type: String}, 
        active: {type: Boolean, default: true},
        date: {type: Date, default: Date.now}
})

module.exports = mongoose.model("User", userSchema);            