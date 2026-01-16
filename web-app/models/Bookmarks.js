const mongoose = require('mongoose')

const Bookmarks = mongoose.model('Bookmarks', new mongoose.Schema(
    {
        articleID : {type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true},
        userID : {type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true},
        createdAt: { type: Date, default: Date.now }
    }
))

module.exports = {Bookmarks}
