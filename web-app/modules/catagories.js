const Model = require('../models/Catagories')


async function getCatagories(){
    const sort = {catName:1}
    return await Model.Catagories.find({}).sort(sort).lean()
}

async function searchCat(catagory){
    return await Model.Catagories.findOne({"catName" : catagory}).select(' -__v').lean()
}

async function addCatagory(catagory){
    return await Model.Catagories.create(catagory)
}


module.exports = {getCatagories , addCatagory, searchCat}