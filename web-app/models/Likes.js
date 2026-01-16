const mongoose = require('mongoose')

const Likes = mongoose.model('Likes', new mongoose.Schema(
    {
        articleID : {type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true},
        userID : {type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true},
        createdAt: { type: Date, default: Date.now }
    }
))

module.exports = {Likes}
