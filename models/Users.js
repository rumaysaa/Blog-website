const mongoose = require('mongoose')

const Users = mongoose.model('Users', new mongoose.Schema(
    {
        name : String, 
        mail : {type: String, unique: true },
        password : String,
        active: { type: Boolean, default: false},
        code: String,
        profilePhoto: Buffer,
        interestCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'catagories' }],
        createdAt: { type: Date, default: Date.now }
    }
))


module.exports = {Users}