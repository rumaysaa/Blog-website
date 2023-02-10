const express = require('express')
const router = express.Router()
const comments = require('../modules/comments')
const article = require('../modules/article')
const users = require('../modules/users')


router.post('/', async (req, res) => {
    const result = await comments.addComment(req.body)
    res.redirect('/comments?id=' + req.body.articleID)
})


router.get('/', async (req, res) => {
    const id = req.query.id
    const Article = await article.getArticleById(id)
    const com = await comments.getArticleById(id)
    const allComments = await com.map(async data => {
        data.imageBase64 = await data.userID.profilePhoto.toString('base64')
        return data
    })
    let imageBase64=""
    if (req.session.user) {
        if(req.session.user.profilePhoto){
        const img = await users.findUserById(req.session.user._id)
        imageBase64 = img.profilePhoto.toString('base64')
        }
    }

    const data = { Article, com, imageBase64 }
    //console.log(data.com)
    res.render('readArticle', { data })
})

router.get('/json', async (req, res) => {
    const id = req.query.id
    const Article = await article.getArticleById(id)
    const com = await comments.getArticleById(id)
    const imageBase64 = ""
    const data = { Article, com, imageBase64 }
    //console.log(data);
    res.send(data)
})

router.get('/delete' , async (req,res) => {
    const id = await req.query.id
    comments.removeCommentById(id).then(res.redirect('/comments?id='+ req.query.articleID))
})

module.exports = router
