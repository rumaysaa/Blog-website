const express = require('express')
const router = express.Router()
const users = require('../modules/users')
const article = require('../modules/article')
const bcrypt = require('bcryptjs')
var dotenv = require('dotenv/config')
var multer = require('multer')

var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
const imgModel = require('../models/Users')

const path = require('path')
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())


var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

router.get('/', (req, res) => {
    const msg = req.query.msg
    const name = req.query.name
    const mail = req.query.mail
    const Mailmsg = req.query.Mailmsg
    const user = {msg,name,mail,Mailmsg}
    res.render('users',{user})
})

router.post('/', async (req, res) => {
    if (req.body.confirmPass === req.body.password) {
        const name = await req.body.name
        const mail = await req.body.mail.toLowerCase()
        const checkMail = await users.findUserByMail(req.body)
        if(checkMail){
            const msg = "Mail Already Exists!"
            res.redirect('/users?Mailmsg='+msg+'&mail='+mail)
        }
        const salt = await bcrypt.genSalt(10)
        const password = await bcrypt.hash(req.body.password, salt)
        const user = { name, mail, password }
        users.createUser(user).then(values => {
            const send = require('gmail-send')({
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD
            });
            send({
                to: req.body.mail,
                subject: 'Account Activation',
                text: 'Welcome!!!!!!',
                html: '<a href="https://theblogosphere.herokuapp.com/users/activate?id=' + values.id + '">click here to Activate Your Account</a>'
            }, (error, result, fullResult) => {
                if (error) console.error(error);
            })
            const activateMsg = "Kindly Check Your Mail to Activate Your Account."
            res.redirect('/users/login?activateMsg=' + activateMsg)
        })
    }
    else {
        res.redirect('/users?msg=Password Does\'nt Match&name='+req.body.name+'&mail='+req.body.mail)
    }
})
router.get('/activate', (req, res) => {
    const msg="Succesfully Activated Your Account. Login to Continue"
    users.activate(req.query.id).then(value => res.redirect('/users/login?msg='+msg))
})

router.get('/login', async (req, res) => {
    const msg = req.query.msg
    const activateMsg = req.query.activateMsg
    const url = req.query.url
    const id = req.query.id
    const mail = req.query.mail
    const passMsg = req.query.passMsg
    const incPass = (passMsg === "Incorrect Password")
    const incMail = (passMsg === "Email not registered!")
    const user = { msg, url, id, mail, passMsg, activateMsg,incPass,incMail }
    res.render('login', {user})
})

router.post('/login', async (req, res) => {
    const foundUser = await users.findUserByMail(req.body)

    if (!foundUser) {
        res.redirect('/users/login?passMsg=Email not registered!');
    }
    const comparePass = await (bcrypt.compare(req.body.password, foundUser.password))
    if (comparePass) {
        if (foundUser.active) {
            req.session.user = foundUser
            if (req.body.url)
                res.redirect(req.body.url+ "?id=" + req.body.articleID)
            else
            //console.log(req.session.user)
            res.redirect('/articles')
        }
        else {
            res.redirect('/users/login?activateMsg=Your Account is not activated.Kindly Check your mail to Activate.')
        }
    }
    else {
        const passMsg = "Incorrect Password"
        const mail = req.body.mail
        res.redirect('/users/login?passMsg=' + passMsg + '&mail=' + mail)
    }
})

router.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
        res.redirect('/articles')
    })
})

router.get('/editUser', async (req, res) => {
    const user = await req.session.user
    const img = await users.findUserById(user._id)
    let imageBase64=""
    if(img.profilePhoto){
    imageBase64 = img.profilePhoto.toString('base64')
    }
    res.render('editUser', { imageBase64,user })
})

router.post('/editUser', upload.single('image'), async (req, res) => {
    const savedUser = await users.updateUser(req.body)
    req.session.user.name = savedUser
    res.redirect('/users/editUser')
})

router.post('/profile', upload.single('image'), async (req, res) => {
    const data = fs.readFileSync(path.join(__dirname + '/../uploads/' + req.file.filename))
    const id = req.session.user._id
    const a = await users.updateProfilePhoto(data,id)
    res.redirect('/users/editUser')
})

router.get('/changePassword', async (req, res) => {
    const id = await req.session.user._id
    const msg = req.query.msg
    const passMatch = req.query.passMatch
    const user = {id,msg,passMatch}
    res.render('changePassword', {user})
})

router.post('/changePassword', async (req, res) => {
    const user = await users.findUserById(req.session.user._id)
    const validPassword = await bcrypt.compare(req.body.oldPass, user.password)
    if (validPassword) {
        const passMatch = req.body.password === req.body.confirmPass
        if (passMatch) {
            const salt = await bcrypt.genSalt(10)
            const password = await bcrypt.hash(req.body.password, salt)
            const user = req.body
            user.password = password
            users.updatePassword(user).then(values => res.redirect('/users/login?msg=Password Changed Successfully!'))
        }
        else {
            const msg = "Confirm Password Does\'nt Match"
            res.redirect('/users/changePassword?msg='+msg+'&passMatch='+passMatch)
        }
    }
    else {
        const msg = "Incorrect Old Password!"
        res.redirect('/users/changePassword?msg='+msg)
    }
})

router.get('/verifyMail', (req, res) => {
    const msg = req.query.msg
    res.render('confirmMail',{msg})
})

router.post('/verifyMail', async (req, res) => {
    const mail = users.findUserByMail(req.body).then(values => {
        if(values){
        const send = require('gmail-send')({
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        });
        let code = Math.floor(1000 + Math.random() * 9999)
        let id = values._id
        const user = { id, code }
        users.updateUserCode(user)
        send({
            to: req.body.mail,
            subject: 'Reset Password',
            html: '<b>To Reset Password, Click the Below Link</b><br>' +
                'Your password reset secred code is <b>' + code + '</b><br>' +
                '<a href="https://theblogosphere.herokuapp.com/users/forgotPassword?id=' + values._id +
                '">click here to Reset Yout Password</a><br> '
        }, (error, result, fullResult) => {
            if (error) console.error(error);
        })
        if (values.mail) {
            const msg = "Please Check your E-mail to reset Your Password."
            res.redirect('/users/login?msg=' + msg)
        }
    }
        else {
            const msg = "This Email is not Registered!"
            res.redirect('/users/verifyMail?msg='+msg)
        }
    
    })
})

router.get('/forgotPassword', (req, res) => {
    const id = req.query.id
    const msg = req.query.msg
    const codeValid = req.query.codeValid
    const codeNotValid = !codeValid
    const code = req.query.code
    const user = {id,msg,code,codeValid,codeNotValid}
    res.render('forgotPassword', { user })
})


router.post('/forgotPassword', async (req, res) => {
    const id = req.body.id
    users.findUserById(id).then(async (values) => {
        if (req.body.code != "" && values.code !== req.body.code) {
            res.redirect('/users/forgotPassword?msg=Invalid Code')
        }
        const checkPass = (req.body.password === req.body.confirmPass)
        const codeValid = (values.code === req.body.code)
        if ((checkPass) && (codeValid)) {
            const salt = await bcrypt.genSalt(10)
            const password = await bcrypt.hash(req.body.password, salt)
            const user = { id, password }
            const msg = "Password Changed!!"
            users.updatePassword(user).then(res.redirect('/users/login?msg=' +msg))
        }
        else {
            const msg = "Password Does not Match"
            const code = req.body.code
            res.redirect('/users/forgotPassword?codeValid='+codeValid+'&msg='
            +msg+'&code='+code+'&id='+id)

        }
    })
})


module.exports = router

