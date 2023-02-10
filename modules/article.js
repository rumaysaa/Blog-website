const Model = require('../models/Article')

async function getArticles(){
    return await Model.Article.find({}).populate('categoryID','-_id -__v').populate('userID','-mail -password -__v').select(' -__v  -description ').lean()
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

module.exports = {addArticle ,getArticles, getArticleById, removeArticleById, editArticleById}