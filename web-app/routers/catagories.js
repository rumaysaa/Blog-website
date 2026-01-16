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

router.post('/add-quick', async (req, res) => {
    try {
        if (!req.body.catName || !req.body.catName.trim()) {
            return res.status(400).json({success: false, message: 'Category name required'})
        }
        
        const catName = req.body.catName.trim()
        const existingCat = await catagories.searchCat(catName)
        
        if (existingCat) {
            return res.status(400).json({success: false, message: 'Category already exists'})
        }
        
        const newCat = await catagories.addCatagory({catName})
        res.json({success: true, category: newCat})
    } catch(err) {
        console.error('Error adding category:', err)
        res.status(500).json({success: false, message: 'Error adding category'})
    }
})



module.exports = router