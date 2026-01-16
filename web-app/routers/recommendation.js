const express = require('express')
const router = express.Router()
const recommendation = require('../modules/recommendation')

router.get('/', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized')

    try {
        const recommendedArticles = await recommendation.getRecommendations(req.session.user._id)
        res.json(recommendedArticles)
    } catch (err) {
        console.error(err)
        res.status(500).send('Error fetching recommendations')
    }
})

module.exports = router
