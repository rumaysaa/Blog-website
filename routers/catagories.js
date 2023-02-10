const express = require('express')
const router = express.Router()
const catagories = require('../modules/catagories')

router.get('/', (req, res) => {
    const msg = req.query.Error
    catagories.getCatagories().then(cat => {
        const data = {msg,cat}
        res.render('catagories', {data})
    })
})

router.post('/' , async (req,res) => {
    const catagory = await req.body.catName
    const getCat = await catagories.searchCat(catagory)
    //console.log(getCat)
    if(getCat !== null){
        const msg = "Catagory already exist!"
        res.redirect('/catagories?Error='+ msg)
    }
    else
        catagories.addCatagory(req.body).then(result => res.redirect('/catagories'))
})



module.exports = router