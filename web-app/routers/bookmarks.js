const express = require('express')
const router = express.Router()
const bookmarks = require('../modules/bookmarks')

router.post('/toggle', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({success: false, message: 'Please login to bookmark articles'})
        }
        
        const articleID = req.body.articleID
        const userID = req.session.user._id
        
        const existingBookmark = await bookmarks.checkBookmark(articleID, userID)
        
        if(existingBookmark) {
            await bookmarks.removeBookmark(articleID, userID)
            return res.json({success: true, bookmarked: false})
        } else {
            await bookmarks.addBookmark(articleID, userID)
            return res.json({success: true, bookmarked: true})
        }
    } catch(err) {
        console.error('Error toggling bookmark:', err)
        res.status(500).json({success: false, message: 'Error processing request'})
    }
})

router.get('/check/:articleID', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({bookmarked: false})
        }
        
        const bookmark = await bookmarks.checkBookmark(req.params.articleID, req.session.user._id)
        res.json({bookmarked: !!bookmark})
    } catch(err) {
        console.error('Error checking bookmark:', err)
        res.status(500).json({error: 'Error processing request'})
    }
})

router.get('/', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login to view bookmarks')
        }
        
        const userBookmarks = await bookmarks.getUserBookmarks(req.session.user._id)
        const data = { bookmarks: userBookmarks }
        res.render('bookmarks', {data})
    } catch(err) {
        console.error('Error loading bookmarks:', err)
        res.status(500).send('Error loading bookmarks')
    }
})

module.exports = router
