const mongoose = require('mongoose')

const Comments = mongoose.model('comments' , new mongoose.Schema(
    {
        articleID : {type: mongoose.Schema.Types.ObjectId, ref: 'article' },
        userID : {type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
        time: { type: String, default: 'etc'},
        //default datetime
        comment : String 
    }
))


module.exports = {Comments}