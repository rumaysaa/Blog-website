const mongoose = require('mongoose')

const UserReadSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    articleID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = {
    UserReads: mongoose.model('UserReads', UserReadSchema)
}
