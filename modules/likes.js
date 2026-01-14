const Model = require('../models/Likes')
const articleModel = require('../models/Article')

async function addLike(articleID, userID){
    const existingLike = await Model.Likes.findOne({articleID, userID}).lean()
    if(existingLike) return null
    
    const like = await Model.Likes.create({articleID, userID})
    await articleModel.Article.findByIdAndUpdate(articleID, {$inc: {likes: 1}})
    return like
}

async function removeLike(articleID, userID){
    await Model.Likes.deleteOne({articleID, userID})
    await articleModel.Article.findByIdAndUpdate(articleID, {$inc: {likes: -1}})
}

async function checkLike(articleID, userID){
    return await Model.Likes.findOne({articleID, userID}).lean()
}

async function getLikeCount(articleID){
    return await Model.Likes.countDocuments({articleID})
}

module.exports = {addLike, removeLike, checkLike, getLikeCount}
