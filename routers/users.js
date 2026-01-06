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
    try {
        if (!req.body.name || !req.body.mail || !req.body.password) {
            return res.redirect('/users?msg=All fields are required')
        }
        if (req.body.password.length < 6) {
            return res.redirect('/users?msg=Password must be at least 6 characters')
        }
        if (req.body.confirmPass === req.body.password) {
            const name = await req.body.name
            const mail = await req.body.mail.toLowerCase()
            const checkMail = await users.findUserByMail(req.body)
            if(checkMail){
                const msg = "Mail Already Exists!"
                res.redirect('/users?Mailmsg='+msg+'&mail='+mail)
                return
            }
            const salt = await bcrypt.genSalt(10)
            const password = await bcrypt.hash(req.body.password, salt)
            const user = { name, mail, password }
            users.createUser(user).then(values => {
                const send = require('gmail-send')({
                    user: process.env.MAIL_USERNAME,
                    pass: process.env.MAIL_PASSWORD
                });
                const baseUrl = process.env.BASE_URL || `http://${req.get('host')}`
                const activationLink = `${baseUrl}/users/activate?id=${values.id}`
                send({
                    to: req.body.mail,
                    subject: 'Account Activation',
                    text: 'Welcome!!!!!!',
                    html: `<a href="${activationLink}">click here to Activate Your Account</a>`
                }, (error, result, fullResult) => {
                    if (error) console.error(error);
                })
                const activateMsg = "Kindly Check Your Mail to Activate Your Account."
                res.redirect('/users/login?activateMsg=' + activateMsg)
            }).catch(err => {
                console.error('Error creating user:', err)
                res.status(500).send('Error creating account')
            })
        }
        else {
            res.redirect('/users?msg=Password Does\'nt Match&name='+req.body.name+'&mail='+req.body.mail)
        }
    } catch(err) {
        console.error('Error in registration:', err)
        res.status(500).send('Error during registration')
    }
})
router.get('/activate', async (req, res) => {
    try {
        const msg="Succesfully Activated Your Account. Login to Continue"
        await users.activate(req.query.id)
        res.redirect('/users/login?msg='+msg)
    } catch(err) {
        console.error('Error activating account:', err)
        res.status(500).send('Error activating account')
    }
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
    try {
        if (!req.body.mail || !req.body.password) {
            return res.redirect('/users/login?passMsg=Email and password required')
        }
        const foundUser = await users.findUserByMail(req.body)

        if (!foundUser) {
            res.redirect('/users/login?passMsg=Email not registered!');
            return
        }
        const comparePass = await (bcrypt.compare(req.body.password, foundUser.password))
        if (comparePass) {
            if (foundUser.active) {
                req.session.user = foundUser
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving session:', err)
                        return res.status(500).send('Error during login')
                    }
                    if (req.body.url)
                        res.redirect(req.body.url+ "?id=" + req.body.articleID)
                    else
                        res.redirect('/articles')
                })
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
    } catch(err) {
        console.error('Error during login:', err)
        res.status(500).send('Error during login')
    }
})

router.get('/logout', (req, res) => {
    try {
        req.session.destroy(function (err) {
            if (err) {
                console.error('Error destroying session:', err)
                return res.status(500).send('Error logging out')
            }
            res.redirect('/articles')
        })
    } catch(err) {
        console.error('Error during logout:', err)
        res.status(500).send('Error logging out')
    }
})

router.get('/editUser', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login first')
        }
        const user = await req.session.user
        const img = await users.findUserById(user._id)
        let imageBase64=""
        if(img && img.profilePhoto){
            imageBase64 = img.profilePhoto.toString('base64')
        }
        res.render('editUser', { imageBase64,user })
    } catch(err) {
        console.error('Error loading edit user:', err)
        res.status(500).send('Error loading user data')
    }
})

router.post('/editUser', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login first')
        }
        const savedUser = await users.updateUser(req.body)
        req.session.user.name = savedUser
        res.redirect('/users/editUser')
    } catch(err) {
        console.error('Error updating user:', err)
        res.status(500).send('Error updating profile')
    }
})

router.post('/profile', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login first')
        }
        if (!req.file) {
            return res.redirect('/users/editUser?msg=No file selected')
        }
        const data = fs.readFileSync(path.join(__dirname + '/../uploads/' + req.file.filename))
        const id = req.session.user._id
        const a = await users.updateProfilePhoto(data,id)
        res.redirect('/users/editUser')
    } catch(err) {
        console.error('Error updating profile photo:', err)
        res.status(500).send('Error updating profile photo')
    }
})

router.get('/changePassword', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login first')
        }
        const id = await req.session.user._id
        const msg = req.query.msg
        const passMatch = req.query.passMatch
        const user = {id,msg,passMatch}
        res.render('changePassword', {user})
    } catch(err) {
        console.error('Error loading change password:', err)
        res.status(500).send('Error loading page')
    }
})

router.post('/changePassword', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/users/login?msg=Please login first')
        }
        if (!req.body.oldPass || !req.body.password || !req.body.confirmPass) {
            return res.redirect('/users/changePassword?msg=All fields required')
        }
        const user = await users.findUserById(req.session.user._id)
        const validPassword = await bcrypt.compare(req.body.oldPass, user.password)
        if (validPassword) {
            const passMatch = req.body.password === req.body.confirmPass
            if (passMatch) {
                if (req.body.password.length < 6) {
                    return res.redirect('/users/changePassword?msg=Password must be at least 6 characters')
                }
                const salt = await bcrypt.genSalt(10)
                const password = await bcrypt.hash(req.body.password, salt)
                const updateData = { id: req.session.user._id, password }
                await users.updatePassword(updateData)
                res.redirect('/users/login?msg=Password Changed Successfully!')
            }
            else {
                const msg = "Confirm Password Doesn't Match"
                res.redirect('/users/changePassword?msg='+msg+'&passMatch='+passMatch)
            }
        }
        else {
            const msg = "Incorrect Old Password!"
            res.redirect('/users/changePassword?msg='+msg)
        }
    } catch(err) {
        console.error('Error changing password:', err)
        res.status(500).send('Error changing password')
    }
})

router.get('/verifyMail', (req, res) => {
    const msg = req.query.msg
    res.render('confirmMail',{msg})
})

router.post('/verifyMail', async (req, res) => {
    try {
        const values = await users.findUserByMail(req.body)
        if(values){
            const send = require('gmail-send')({
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD
            });
            let code = Math.floor(1000 + Math.random() * 9999)
            let id = values._id
            const user = { id, code }
            await users.updateUserCode(user)
            const baseUrl = process.env.BASE_URL || `http://${req.get('host')}`
            const resetLink = `${baseUrl}/users/forgotPassword?id=${values._id}`
            send({
                to: req.body.mail,
                subject: 'Reset Password',
                html: '<b>To Reset Password, Click the Below Link</b><br>' +
                    'Your password reset secret code is <b>' + code + '</b><br>' +
                    `<a href="${resetLink}">click here to Reset Your Password</a><br> `
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
    } catch(err) {
        console.error('Error verifying mail:', err)
        res.status(500).send('Error processing request')
    }
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
    try {
        const id = req.body.id
        if (!id || !req.body.code || !req.body.password) {
            return res.redirect('/users/forgotPassword?msg=All fields required&id='+id)
        }
        const values = await users.findUserById(id)
        if (!values) {
            return res.redirect('/users/forgotPassword?msg=User not found&id='+id)
        }
        if (req.body.code != "" && values.code !== req.body.code) {
            return res.redirect('/users/forgotPassword?msg=Invalid Code&id='+id)
        }
        const checkPass = (req.body.password === req.body.confirmPass)
        const codeValid = (values.code === req.body.code)
        if ((checkPass) && (codeValid)) {
            if (req.body.password.length < 6) {
                return res.redirect('/users/forgotPassword?msg=Password must be at least 6 characters&id='+id)
            }
            const salt = await bcrypt.genSalt(10)
            const password = await bcrypt.hash(req.body.password, salt)
            const user = { id, password }
            const msg = "Password Changed!!"
            await users.updatePassword(user)
            res.redirect('/users/login?msg=' +msg)
        }
        else {
            const msg = "Password Does not Match"
            const code = req.body.code
            res.redirect('/users/forgotPassword?codeValid='+codeValid+'&msg='
            +msg+'&code='+code+'&id='+id)
        }
    } catch(err) {
        console.error('Error resetting password:', err)
        res.status(500).send('Error resetting password')
    }
})


module.exports = router

