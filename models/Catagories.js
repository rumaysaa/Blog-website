const mongoose = require('mongoose')

const Catagories = mongoose.model('catagories', new mongoose.Schema(
    {
        catName : {type: String}  //unique
    }
))


module.exports = {Catagories}