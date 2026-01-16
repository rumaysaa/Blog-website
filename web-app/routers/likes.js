const express = require('express')
const router = express.Router()
const likes = require('../modules/likes')

router.post('/toggle', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({success: false, message: 'Please login to like articles'})
        }
        
        const articleID = req.body.articleID
        const userID = req.session.user._id
        
        const existingLike = await likes.checkLike(articleID, userID)
        
        if(existingLike) {
            await likes.removeLike(articleID, userID)
            return res.json({success: true, liked: false})
        } else {
            await likes.addLike(articleID, userID)
            return res.json({success: true, liked: true})
        }
    } catch(err) {
        console.error('Error toggling like:', err)
        res.status(500).json({success: false, message: 'Error processing request'})
    }
})

router.get('/check/:articleID', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({liked: false})
        }
        
        const like = await likes.checkLike(req.params.articleID, req.session.user._id)
        res.json({liked: !!like})
    } catch(err) {
        console.error('Error checking like:', err)
        res.status(500).json({error: 'Error processing request'})
    }
})

module.exports = router
