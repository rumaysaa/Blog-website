const express = require('express')
const router = express.Router()
const comments = require('../modules/comments')
const article = require('../modules/article')
const users = require('../modules/users')


router.post('/', async (req, res) => {
    try {
        const result = await comments.addComment(req.body)
        res.redirect('/comments?id=' + req.body.articleID)
    } catch(err) {
        console.error('Error adding comment:', err)
        res.status(500).send('Error adding comment')
    }
})


router.get('/', async (req, res) => {
    try {
        const id = req.query.id
        const Article = await article.getArticleById(id)
        const com = await comments.getArticleById(id)
        
        const allComments = await Promise.all(com.map(async data => {
            if (data.userID && data.userID.profilePhoto) {
                data.imageBase64 = data.userID.profilePhoto.toString('base64')
            } else {
                data.imageBase64 = ''
            }
            return data
        }))
        
        let imageBase64=""
        if (req.session.user) {
            if(req.session.user.profilePhoto){
                const img = await users.findUserById(req.session.user._id)
                if(img && img.profilePhoto){
                    imageBase64 = img.profilePhoto.toString('base64')
                }
            }
        }

        const data = { Article, com: allComments, imageBase64 }
        res.render('readArticle', { data })
    } catch(err) {
        console.error('Error loading comments:', err)
        res.status(500).send('Error loading article')
    }
})

router.get('/json', async (req, res) => {
    try {
        const id = req.query.id
        const Article = await article.getArticleById(id)
        const com = await comments.getArticleById(id)
        const imageBase64 = ""
        const data = { Article, com, imageBase64 }
        res.send(data)
    } catch(err) {
        console.error('Error in /json route:', err)
        res.status(500).send({ error: 'Error loading data' })
    }
})

router.get('/delete' , async (req,res) => {
    try {
        const id = await req.query.id
        await comments.removeCommentById(id)
        res.redirect('/comments?id='+ req.query.articleID)
    } catch(err) {
        console.error('Error deleting comment:', err)
        res.status(500).send('Error deleting comment')
    }
})

module.exports = router
