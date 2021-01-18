const mongoose = require('mongoose')

const Schema = mongoose.Schema

//bcrypt requirement, for hashing our passwords
const bcrypt = require('bcrypt')

const UserSchema = new Schema({
  //took out required true for development purposes, we want to get email in the database first
  email: {type: String, required: true, minlength: 2, maxlength:50},
  password: {type: String, required: true},
  username: {type: String},
  resetPasswordToken: String,
  resetPasswordExpires: Date
})


//no longer need hashed in the controller
// UserSchema.pre(
//   'save',
//   async function(next) {
//     const user = this
//     const hash = await bcrypt.hash(this.password, 10)
//     this.password = hash
//     next()
//   }
// )



module.exports = mongoose.model('User', UserSchema)