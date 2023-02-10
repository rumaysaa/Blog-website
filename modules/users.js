const mongoose = require('mongoose')
const Model = require('../models/Users')
const bcrypt = require('bcryptjs')

async function createUser(user){
    return await Model.Users.create(user)
}

async function updateUser(user){
    const savedUser = await Model.Users.findByIdAndUpdate(user.id,{ name:  user.name})
    return user.name
}

async function updatePassword(user){
    return await Model.Users.findByIdAndUpdate(user.id,{ password:  user.password, code: ''})
}

async function findUserById(id){
    return await Model.Users.findById(id).lean()
}

async function activate(id){
    return await Model.Users.findByIdAndUpdate(id , {active: true})
}
       
async function findUserByMail(user){
    return await  Model.Users.findOne({"mail" : user.mail.toLowerCase()}).select(' -__v  -result').lean()
}

async function updateUserCode(user){
    return await Model.Users.findByIdAndUpdate(user.id, {code: user.code})
}

async function updateProfilePhoto(data,id){
    return await Model.Users.findByIdAndUpdate(id, {profilePhoto: data})
}

module.exports = {createUser, updateUser,findUserById,updatePassword, activate, findUserByMail,updateUserCode,updateProfilePhoto}