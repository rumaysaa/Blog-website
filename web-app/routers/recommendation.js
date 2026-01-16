const axios = require('axios')
const ArticleModel = require('../models/Article')
const LikeModel = require('../models/Likes')
const BookmarkModel = require('../models/Bookmarks')
const UserReadModel = require('../models/UserReads')
const UserModel = require('../models/Users')

const ML_URL = 'http://localhost:8001/recommend'

function articleToText(article){
    return `
        ${article.heading}
        ${article.categoryID.catName}
        ${article.tags.join(' ')}
        ${article.description}
    `
}

async function getRecommendations(userID){
    // 1. Load user with interests
    const user = await UserModel.findById(userID)
        .populate('interestCategories')
        .lean()

    // 2. Load all articles
    const articles = await ArticleModel.find({})
        .populate('categoryID')
        .lean()

    // 3. Index mapping
    const indexMap = {}
    articles.forEach((a, i) => {
        indexMap[a._id.toString()] = i
    })

    // 4. Prepare article texts
    const articleTexts = articles.map(articleToText)

    // 5. Load user signals
    const likes = await LikeModel.find({ userID }).lean()
    const bookmarks = await BookmarkModel.find({ userID }).lean()
    const reads = await UserReadModel.find({ userID }).lean()

    const likedIndexes = likes.map(l => indexMap[l.articleID.toString()])
    const bookmarkedIndexes = bookmarks.map(b => indexMap[b.articleID.toString()])
    const readIndexes = reads.map(r => indexMap[r.articleID.toString()])

    // 6. Interest category based indexes
    const interestCategoryIndexes = articles
        .map((a, i) =>
            user.interestCategories.some(c => c._id.equals(a.categoryID._id))
                ? i
                : null
        )
        .filter(i => i !== null)

    // 7. Call ML service
    const response = await axios.post(ML_URL, {
        articles: articleTexts,
        liked: likedIndexes,
        bookmarked: bookmarkedIndexes,
        read: readIndexes,
        interest_category_indexes: interestCategoryIndexes,
        top_k: 5
    })

    return response.data.recommended_indexes.map(i => articles[i])
}

module.exports = { getRecommendations }
