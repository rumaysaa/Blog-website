const mongoose = require('mongoose')

const Article = mongoose.model('article' , new mongoose.Schema(
    {
        categoryID : {type: mongoose.Schema.Types.ObjectId, ref: 'catagories' },
        userID : {type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        heading : String,
        description : String
    }
))


module.exports = {Article}