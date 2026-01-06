const express = require('express')
const router = express.Router()
const article = require('../modules/article')
const catagories = require('../modules/catagories')
const comments = require('../modules/comments')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
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
        
        if (req.file) {
            articleData.coverPhoto = req.file.filename;
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




module.exports = router