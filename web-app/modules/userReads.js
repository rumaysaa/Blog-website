const Model = require('../models/userReads')

async function addRead(userID, articleID){
    return await Model.UserReads.create({ userID, articleID })
}

async function getUserReads(userID){
    return await Model.UserReads.find({ userID }).lean()
}

module.exports = { addRead, getUserReads }
