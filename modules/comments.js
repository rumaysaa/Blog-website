const mongoose = require('mongoose')
const Model = require('../models/Comments2')


async function addComment(comment){
    return await Model.Comments.create(comment)
}

async function getArticleById(id){
    return await Model.Comments.find({articleID : id}).populate('userID',' -__v ').lean()
}

async function removeCommentById(id){
    return await Model.Comments.findByIdAndDelete(id)
}

module.exports = {getArticleById, addComment,removeCommentById}