const express = require('express')
const router = express.Router()
const article = require('../modules/article')
const catagories = require('../modules/catagories')
const comments = require('../modules/comments')
const multer = require('multer')
const path = require('path')
const bookmarks = require('../modules/bookmarks')
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'))
    },
    filename: (req, file, cb) => {
        cb(null, 'article-' + Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const ext = allowedTypes.test(file.originalname.toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (mime && ext) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
})

router.get('/' , async(req,res) => {
    try {
        const list = await article.getArticles()
        let recommendations = []
        let userLikes = []
        let userBookmarks = []
        
        if(req.session.user && req.session.user._id) {
            try {
                const recommendation = require('../modules/recommendation')
                recommendations = await recommendation.getRecommendations(req.session.user._id)
            } catch(recommendErr) {
                console.log('Recommendation system error:', recommendErr.message)
                recommendations = []
            }
            
            const { Likes: likeModel } = require('../models/Likes')
            const userLikesData = await likeModel.find({userID: req.session.user._id}).select('articleID').lean()
            userLikes = userLikesData.map(l => l.articleID.toString())
            
            const { Bookmarks: bookmarkModel } = require('../models/Bookmarks')
            const userBookmarksData = await bookmarkModel.find({userID: req.session.user._id}).select('articleID').lean()
            userBookmarks = userBookmarksData.map(b => b.articleID.toString())
        }
        
        const recentArticles = await article.getRecentArticles(20)
        const bookmarksModule = require('../modules/bookmarks')
        
        // Get recommendation IDs to filter duplicates
        const recommendationIds = recommendations.map(r => r._id.toString())
        
        // Filter out articles that are already in recommendations
        const filteredRecentArticles = recentArticles.filter(art => 
            !recommendationIds.includes(art._id.toString())
        ).slice(0, 10)
        
        const recentWithComments = await Promise.all(filteredRecentArticles.map(async (art) => {
            const commentCount = await comments.countCommentsByArticleId(art._id)
            const bookmarkCount = await bookmarksModule.countBookmarksByArticleId(art._id)
            return {...art, commentCount, bookmarkCount}
        }))
        
        const recommendationsWithComments = await Promise.all(recommendations.map(async (art) => {
            const commentCount = await comments.countCommentsByArticleId(art._id)
            const bookmarkCount = await bookmarksModule.countBookmarksByArticleId(art._id)
            return {...art, commentCount, bookmarkCount}
        }))
        
        const data = {list, recommendations: recommendationsWithComments, recentArticles: recentWithComments, userLikes, userBookmarks}
        res.render('articles' , {data} )
    }catch(e) {
        console.log(e)
        res.send(e)
    }
})

router.get('/my-articles', async(req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login to view your articles')
        }
        
        const userArticles = await article.getArticles()
        const myArticles = userArticles.filter(art => art.userID && art.userID._id.toString() === req.session.user._id.toString())
        
        
        const myArticlesWithComments = await Promise.all(myArticles.map(async (art) => {
            const commentCount = await comments.countCommentsByArticleId(art._id)
            const bookmarkCount = await bookmarks.countBookmarksByArticleId(art._id)
            return {...art, commentCount, bookmarkCount}
        }))
        
        let userLikes = []
        let userBookmarks = []
        
        const { Likes: likeModel } = require('../models/Likes')
        const { Bookmarks: bookmarkModel } = require('../models/Bookmarks')
        
        const userLikesData = await likeModel.find({userID: req.session.user._id}).select('articleID').lean()
        userLikes = userLikesData.map(l => l.articleID.toString())
        
        const userBookmarksData = await bookmarkModel.find({userID: req.session.user._id}).select('articleID').lean()
        userBookmarks = userBookmarksData.map(b => b.articleID.toString())
        
        const data = {myArticles: myArticlesWithComments, userLikes, userBookmarks}
        res.render('myArticles', {data})
    } catch(e) {
        console.log(e)
        res.send(e)
    }
})

router.get('/json' , async(req,res) => {    
    const list = await article.getArticles()
    res.send(list)
})

router.get('/form' , async(req,res) =>{
    try {
        const cats = await catagories.getCatagories()
        const id =  await req.query.id
        const art = await article.getArticleById(id)
        const data = {cats,art}
        if(req.session.user){
            res.render('addArticle' , {data})
        }
        else{
            res.redirect('/users/login?msg=To Write An Article,Please Log In First!!&url=/articles/form')
        }
    } catch(err) {
        console.error('Error in /form route:', err)
        res.status(500).send('Error loading form')
    }
})

router.post('/add', (req, res, next) => {
    upload.single('coverPhoto')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'FILE_TOO_LARGE') {
                return res.redirect('/articles/form?msg=File is too large. Maximum size is 5MB');
            }
            return res.redirect('/articles/form?msg=Error uploading file');
        } else if (err) {
            return res.redirect('/articles/form?msg=' + err.message);
        }
        next();
    });
}, async (req, res) => {
    try {
        const articleData = req.body;
        
        const heading = articleData.heading ? articleData.heading.trim() : '';
        const description = articleData.description ? articleData.description.trim() : '';
        const categoryID = articleData.categoryID ? articleData.categoryID.trim() : '';
        
        if (!heading) {
            return res.redirect('/articles/form?msg=Article title is required');
        }
        
        if (!description) {
            return res.redirect('/articles/form?msg=Article content is required');
        }
        
        if (!categoryID) {
            return res.redirect('/articles/form?msg=Category is required');
        }
        
        if (!req.file && !articleData.coverPhoto) {
            return res.redirect('/articles/form?msg=Cover photo is required');
        }
        
        if (req.file) {
            console.log('File uploaded:', req.file.filename, 'Path:', req.file.path);
            articleData.coverPhoto = req.file.filename;
        }
        
        if (articleData.tags) {
            articleData.tags = articleData.tags.split(',').filter(tag => tag.trim()).map(tag => tag.trim());
        } else {
            articleData.tags = [];
        }
        
        if(req.body.articleID) {
            await article.editArticleById(articleData)
        } else {
            await article.addArticle(articleData)
        }
        res.redirect('/articles')
    } catch(err) {
        console.error('Error adding/editing article:', err)
        res.status(500).send('Error saving article')
    }
})


router.get('/delete' , async (req,res) => {
    try {
        const id = await req.query.id
        await article.removeArticleById(id)
        res.redirect('/articles')
    } catch(err) {
        console.error('Error deleting article:', err)
        res.status(500).send('Error deleting article')
    }
})

router.get('/search', async(req, res) => {
    try {
        const query = req.query.q || ''
        
        if (!query.trim()) {
            return res.render('searchResults', {searchResults: [], query: '', userLikes: [], userBookmarks: []})
        }
        
        const searchRegex = new RegExp(query, 'i')
        const Model = require('../models/Article')
        
        const searchResults = await Model.Article.find({
            $or: [
                {heading: {$regex: searchRegex}},
                {description: {$regex: searchRegex}},
                {tags: {$in: [searchRegex]}}
            ]
        })
        .populate('categoryID', '-_id -__v')
        .populate('userID', '-mail -password -__v')
        .select('-__v')
        .sort({createdAt: -1})
        .lean()
        
        let userLikes = []
        let userBookmarks = []
        
        if(req.session.user && req.session.user._id) {
            const { Likes: likeModel } = require('../models/Likes')
            const { Bookmarks: bookmarkModel } = require('../models/Bookmarks')
            
            const userLikesData = await likeModel.find({userID: req.session.user._id}).select('articleID').lean()
            userLikes = userLikesData.map(l => l.articleID.toString())
            
            const userBookmarksData = await bookmarkModel.find({userID: req.session.user._id}).select('articleID').lean()
            userBookmarks = userBookmarksData.map(b => b.articleID.toString())
        }
        
        const searchResultsWithComments = await Promise.all(searchResults.map(async (art) => {
            const commentCount = await comments.countCommentsByArticleId(art._id)
            const bookmarkCount = await bookmarks.countBookmarksByArticleId(art._id)
            return {...art, commentCount, bookmarkCount}
        }))
        
        res.render('searchResults', {searchResults: searchResultsWithComments, query, userLikes, userBookmarks})
    } catch(err) {
        console.error('Error in search:', err)
        res.status(500).send('Error searching articles')
    }
})

module.exports = router