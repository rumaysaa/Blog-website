const express = require('express')
const router = express.Router()
const article = require('../modules/article')
const catagories = require('../modules/catagories')
const comments = require('../modules/comments')

router.get('/' , async(req,res) => {
    try {
    const list = await article.getArticles()
    const data = {list}
    res.render('articles' , {data} )
    }catch(e) {
        console.log(e)
        res.send(e)
    }
})

router.get('/json' , async(req,res) => {    
    const list = await article.getArticles()
    res.send(list)
})

router.get('/form' , async(req,res) =>{
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
})

router.post('/add', (req,res) => {
    if(req.body.articleID)
        article.editArticleById(req.body).then(result => res.redirect('/comments/?id='+req.body.articleID))
    else
        article.addArticle(req.body).then(result => res.redirect('/articles'))
})


router.get('/delete' , async (req,res) => {
    const id = await req.query.id
    article.removeArticleById(id).then(res.redirect('/articles'))
})




module.exports = router