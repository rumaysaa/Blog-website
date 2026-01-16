const axios = require('axios');
const mongoose = require('mongoose');

// Load all schemas so Mongoose registers them
require('../models/Article');
require('../models/Likes');
require('../models/Bookmarks');
require('../models/userReads');
require('../models/Users');
require('../models/Catagories');

const ML_URL = 'http://localhost:8001/recommend';

// In-memory cache for recently recommended articles per user (expires after 30 min)
const recentRecommendationCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000;

// Helper: manage recently shown recommendations cache
function getRecentlyShown(userID) {
    const userID_str = userID.toString();
    const cached = recentRecommendationCache.get(userID_str);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.articles;
    }
    
    return [];
}

function addToRecentlyShown(userID, articleIds) {
    const userID_str = userID.toString();
    const existing = getRecentlyShown(userID);
    const combined = [...existing, ...articleIds].slice(-15);
    
    recentRecommendationCache.set(userID_str, {
        articles: combined,
        timestamp: Date.now()
    });
}

// Helper: get models at runtime
function getModels() {
    return {
        Article: mongoose.model('Article'),
        Likes: mongoose.model('Likes'),
        Bookmarks: mongoose.model('Bookmarks'),
        UserReads: mongoose.model('UserReads'),
        Users: mongoose.model('Users')
    };
}

// Helper: convert article to text for ML
function articleToText(article) {
    try {
        const heading = article.heading || '';
        const category = article.categoryID?.catName || 'uncategorized';
        const tags = Array.isArray(article.tags) ? article.tags.join(' ') : '';
        const description = article.description || '';

        return `${heading} ${category} ${tags} ${description}`;
    } catch {
        return article.heading || '';
    }
}

// Helper: map Mongo documents to article indexes
function getIndexesFromDocuments(docs, indexMap, fieldName = 'articleID') {
    const seen = new Set();
    const indexes = [];

    for (const doc of docs) {
        const idStr = doc[fieldName]?._id?.toString() || doc[fieldName]?.toString();
        const idx = indexMap[idStr];
        if (idx !== undefined && !seen.has(idx)) {
            indexes.push(idx);
            seen.add(idx);
        }
    }

    return indexes;
}

// Behavior-based fallback recommendation
async function getBehaviorBasedRecommendations(userID, maxResults = 10) {
    const { Article, Likes, Bookmarks, UserReads, Users } = getModels();

    try {
        const user = await Users.findById(userID).populate('interestCategories').lean();
        if (!user) return [];

        // Get user interactions
        const likes = await Likes.find({ userID }).select('articleID').lean();
        const bookmarks = await Bookmarks.find({ userID }).select('articleID').lean();
        const reads = await UserReads.find({ userID }).select('articleID').lean();

        const interactedIds = new Set([
            ...likes.map(l => l.articleID.toString()),
            ...bookmarks.map(b => b.articleID.toString()),
            ...reads.map(r => r.articleID.toString())
        ]);

        // Get full articles for interactions to extract patterns
        const likedArticles = await Article.find({ _id: { $in: likes.map(l => l.articleID) } }).lean();
        const bookmarkedArticles = await Article.find({ _id: { $in: bookmarks.map(b => b.articleID) } }).lean();

        const preferredCategoryIds = new Set();
        const preferredTags = new Set();

        // Extract preferred categories and tags from liked/bookmarked articles
        [...likedArticles, ...bookmarkedArticles].forEach(art => {
            if (art.categoryID) preferredCategoryIds.add(art.categoryID.toString());
            if (Array.isArray(art.tags)) art.tags.forEach(tag => preferredTags.add(tag.toLowerCase()));
        });

        // Add user's interest categories
        const userInterestIds = new Set((user.interestCategories || []).map(c => c._id.toString()));
        const allPreferredCategories = new Set([...preferredCategoryIds, ...userInterestIds]);

        // Score articles based on user behavior
        const scoredArticles = await Article.find({
            _id: { $nin: Array.from(interactedIds) }
        })
        .populate('categoryID', 'catName')
        .populate('userID', 'name')
        .lean()
        .then(articles => {
            return articles.map(article => {
                let score = 0;

                // Score based on category match (higher weight for user interactions)
                if (preferredCategoryIds.has(article.categoryID?._id?.toString())) {
                    score += 3;
                }
                // Score for interest categories (lower weight)
                else if (userInterestIds.has(article.categoryID?._id?.toString())) {
                    score += 1;
                }

                // Score based on tag match
                if (Array.isArray(article.tags)) {
                    const matchingTags = article.tags.filter(tag => preferredTags.has(tag.toLowerCase())).length;
                    score += matchingTags * 2;
                }

                // Boost newer articles slightly
                const daysOld = (Date.now() - new Date(article.createdAt)) / (1000 * 60 * 60 * 24);
                if (daysOld < 30) score += 1;

                return { ...article, score };
            });
        });

        // Sort by score (descending) and then by date (newest first)
        const recommended = scoredArticles
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .slice(0, maxResults);

        console.log('Behavior-based recommendations:', recommended.length, 'articles');
        console.log('Scoring breakdown:', recommended.map(r => ({ title: r.heading, score: r.score })));

        return recommended;
    } catch (err) {
        console.error('Behavior-based recommendation error:', err.message);
        return [];
    }
}

// Main function
async function getRecommendations(userID) {
    if (!mongoose.connection.readyState) {
        throw new Error('Mongoose not connected');
    }

    // Get models at runtime
    const { Article, Likes, Bookmarks, UserReads, Users } = getModels();

    try {
        // Load user with interest categories
        const user = await Users.findById(userID).populate('interestCategories').lean();
        if (!user) {
            console.log('User not found:', userID);
            return [];
        }

        // Load all articles
        const articles = await Article.find({}).populate('categoryID', 'catName').lean();
        if (!articles.length) {
            console.log('No articles found');
            return [];
        }

        // Build index map
        const indexMap = {};
        articles.forEach((a, i) => indexMap[a._id.toString()] = i);

        // Prepare text for ML
        const articleTexts = articles.map(articleToText);

        // Load user signals
        const likes = await Likes.find({ userID }).populate('articleID').lean();
        const bookmarks = await Bookmarks.find({ userID }).populate('articleID').lean();
        const reads = await UserReads.find({ userID }).populate('articleID').lean();

        // Map signals to indexes
        const likedIndexes = getIndexesFromDocuments(likes, indexMap);
        const bookmarkedIndexes = getIndexesFromDocuments(bookmarks, indexMap);
        const readIndexes = getIndexesFromDocuments(reads, indexMap);

        // Extract categories and tags from liked/bookmarked articles
        const likedArticles = likes.map(l => articles.find(a => a._id.toString() === (l.articleID?._id?.toString() || l.articleID?.toString()))).filter(Boolean);
        const bookmarkedArticles = bookmarks.map(b => articles.find(a => a._id.toString() === (b.articleID?._id?.toString() || b.articleID?.toString()))).filter(Boolean);

        const interactedCategoryIds = new Set();
        const interactedTags = new Set();

        likedArticles.concat(bookmarkedArticles).forEach(art => {
            if (art.categoryID?._id) interactedCategoryIds.add(art.categoryID._id.toString());
            if (Array.isArray(art.tags)) art.tags.forEach(tag => interactedTags.add(tag.toLowerCase()));
        });

        // Find articles with same categories/tags
        const similarTopicIndexes = articles
            .map((a, i) => {
                const catId = a.categoryID?._id?.toString();
                const hasCategory = catId && interactedCategoryIds.has(catId);
                const hasTag = Array.isArray(a.tags) && a.tags.some(tag => interactedTags.has(tag.toLowerCase()));
                return (hasCategory || hasTag) ? i : null;
            })
            .filter(i => i !== null);

        // Map user interest categories to article indexes
        const userInterestIds = (user.interestCategories || []).map(c => c._id.toString());
        const interestCategoryIndexes = articles
            .map((a, i) => {
                const catId = a.categoryID?._id?.toString();
                return catId && userInterestIds.includes(catId) ? i : null;
            })
            .filter(i => i !== null);

        // Get recently shown articles to exclude them
        const recentlyShown = getRecentlyShown(userID);
        const recentlyShownIndexes = recentlyShown
            .map(id => indexMap[id.toString()])
            .filter(idx => idx !== undefined);

        console.log('Indexes sent to ML:', {
            likedIndexes,
            bookmarkedIndexes,
            readIndexes,
            interestCategoryIndexes,
            similarTopicIndexes,
            excludeIndexes: recentlyShownIndexes
        });

        // Call ML service
        try {
            const response = await axios.post(ML_URL, {
                articles: articleTexts,
                liked: likedIndexes,
                bookmarked: bookmarkedIndexes,
                read: readIndexes,
                interest_category_indexes: interestCategoryIndexes,
                similar_topic_indexes: similarTopicIndexes,
                exclude_indexes: recentlyShownIndexes,
                top_k: 5
            }, { timeout: 5000 });

            const recommendedIndexes = response.data.recommended_indexes || [];
            const recommended = recommendedIndexes
                .map(i => articles[i])
                .filter(Boolean);

            if (recommended.length > 0) {
                addToRecentlyShown(userID, recommended.map(r => r._id));
            }

            console.log('ML recommendations returned:', recommended.length, 'articles');
            return recommended;
        } catch (mlError) {
            console.log('ML service error, using behavior-based fallback:', mlError.message);
            const behaviorRecommendations = await getBehaviorBasedRecommendations(userID);
            if (behaviorRecommendations.length > 0) {
                addToRecentlyShown(userID, behaviorRecommendations.map(r => r._id));
                return behaviorRecommendations;
            }
            throw new Error('ML_SERVICE_FAILED');
        }

    } catch (err) {
        console.error('Recommendation module error:', err.message);
        throw err;
    }
}

module.exports = { getRecommendations, getBehaviorBasedRecommendations };
