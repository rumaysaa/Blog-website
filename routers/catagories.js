const express = require('express')
const router = express.Router()
const catagories = require('../modules/catagories')

router.get('/', async (req, res) => {
    try {
        const msg = req.query.Error
        const cat = await catagories.getCatagories()
        const data = {msg,cat}
        res.render('catagories', {data})
    } catch(err) {
        console.error('Error loading categories:', err)
        res.status(500).send('Error loading categories')
    }
})

router.post('/' , async (req,res) => {
    try {
        if (!req.body.catName) {
            return res.redirect('/catagories?Error=Category name required')
        }
        const catagory = await req.body.catName
        const getCat = await catagories.searchCat(catagory)
        if(getCat !== null){
            const msg = "Category already exists!"
            res.redirect('/catagories?Error='+ msg)
        }
        else {
            await catagories.addCatagory(req.body)
            res.redirect('/catagories')
        }
    } catch(err) {
        console.error('Error adding category:', err)
        res.status(500).send('Error adding category')
    }
})



module.exports = router