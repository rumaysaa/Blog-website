const Model = require('../models/Article')

async function getArticles(){
    return await Model.Article.find({}).populate('categoryID','-_id -__v').populate('userID','-mail -password -__v').select(' -__v  -description ').lean()
}

async function getRecentArticles(limit = 10){
    return await Model.Article.find({}).populate('categoryID','-_id -__v').populate('userID','-mail -password -__v').select('-__v -description').sort({createdAt: -1}).limit(limit).lean()
}

async function getArticlesByCategory(categoryID, limit = 10){
    return await Model.Article.find({categoryID: categoryID}).populate('categoryID','-_id -__v').populate('userID','-mail -password -__v').select('-__v -description').sort({createdAt: -1}).limit(limit).lean()
}

async function addArticle(article){
    return await Model.Article.create(article)
}

async function getArticleById(id){
    return await Model.Article.findById(id).lean()
}

async function removeArticleById(id){
    return await Model.Article.findByIdAndDelete(id)
}

async function editArticleById(article){
    return await Model.Article.findByIdAndUpdate(article.articleID , article)
}

async function incrementLikes(articleId){
    return await Model.Article.findByIdAndUpdate(articleId, {$inc: {likes: 1}}, {new: true})
}

async function decrementLikes(articleId){
    return await Model.Article.findByIdAndUpdate(articleId, {$inc: {likes: -1}}, {new: true})
}

module.exports = {addArticle ,getArticles, getArticleById, removeArticleById, editArticleById, getRecentArticles, getArticlesByCategory, incrementLikes, decrementLikes}