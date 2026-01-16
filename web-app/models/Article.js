const mongoose = require('mongoose')

const Article = mongoose.model('Article' , new mongoose.Schema(
    {
        categoryID : {type: mongoose.Schema.Types.ObjectId, ref: 'catagories' },
        userID : {type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        heading : String,
        description : String,
        coverPhoto : String,
        tags: [String],
        likes: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }
))


module.exports = {Article}