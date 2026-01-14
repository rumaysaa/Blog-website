const Model = require('../models/Bookmarks')

async function addBookmark(articleID, userID){
    const existingBookmark = await Model.Bookmarks.findOne({articleID, userID}).lean()
    if(existingBookmark) return null
    
    return await Model.Bookmarks.create({articleID, userID})
}

async function removeBookmark(articleID, userID){
    return await Model.Bookmarks.deleteOne({articleID, userID})
}

async function checkBookmark(articleID, userID){
    return await Model.Bookmarks.findOne({articleID, userID}).lean()
}

async function getUserBookmarks(userID){
    return await Model.Bookmarks.find({userID}).populate('articleID').populate({
        path: 'articleID',
        populate: [
            { path: 'categoryID', select: '-_id -__v' },
            { path: 'userID', select: '-mail -password -__v' }
        ]
    }).sort({createdAt: -1}).lean()
}

async function countBookmarksByArticleId(articleID){
    return await Model.Bookmarks.countDocuments({articleID})
}

module.exports = {addBookmark, removeBookmark, checkBookmark, getUserBookmarks, countBookmarksByArticleId}
