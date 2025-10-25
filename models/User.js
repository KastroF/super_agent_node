const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  amPhone: { type: String },
  mmPhone: { type: String },
  amSolde: { type: Number },
  mmSolde: { type: Number },
  amPass: { type: String },
  mmPass: { type: String },
  mmPin: { type: String },
  password: { type: String, required: true },
  active: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["superagent", "partner", "user"], default: "user" },
  superagentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  services: { type: [String], default: [] },
  count: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", userSchema);
