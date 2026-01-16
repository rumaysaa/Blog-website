const express = require('express')
require('dotenv').config()
const mongoose = require('mongoose')
const app = express()
const path = require('path')
const exphbs = require('express-handlebars')
const session = require('express-session')
const MongoStore = require('connect-mongo').default;

require('./models/Catagories');
require('./models/Article');
require('./models/Likes');
require('./models/Bookmarks');
require('./models/userReads');
require('./models/Users');

const catagoriesRouter = require('./routers/catagories')
const addArticleRouter = require('./routers/article')
const commentsRouter = require('./routers/comments')
const usersRouter = require('./routers/users')
const likesRouter = require('./routers/likes')
const bookmarksRouter = require('./routers/bookmarks')
const recommendations = require('./routers/recommendation')
var hbs = exphbs.create({
    helpers: {
        ifEquals: function (arg1, arg2, options) {

            if (arg1 && arg2 && (arg1.toString() === arg2.toString())) {
                return options.fn(this)
            } else {
                return options.inverse(this);
            }
        },
        selected: function (arg1, arg2, options) {
            if (!(arg1 && arg2)) return ""
            return arg1.toString() === arg2.toString() ? " selected " : ""
        },
        includes: function (array, value) {
            if (!array) return false
            return array.some(item => item.toString() === value.toString())
        },
        formatDate: function (date) {
            if (!date) return ""
            const d = new Date(date)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
        },
        truncate: function (text, limit) {
            if (!text) return ""
            if (text.length <= limit) return text
            return text.substring(0, limit).trim() + '...'
        }
    },
    defaultLayout: 'main',
    extname: '.hbs'
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
const bodyParser = require('body-parser');

const connectionString = 'mongodb+srv://theblog:' + process.env.DB_PASS + '@cluster0.9q0pw.mongodb.net/rblog?retryWrites=true&w=majority'


app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    store: MongoStore.create({
        mongoUrl: connectionString
    }
    ),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 }
}))

app.use(function (req, res, next) {
    res.locals.session = req.session;
    res.locals.baseUrl = process.env.BASE_URL || `http://${req.get('host')}`;
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/catagories', catagoriesRouter)
app.use('/articles', addArticleRouter)
app.use('/comments', commentsRouter)
app.use('/users', usersRouter)
app.use('/likes', likesRouter)
app.use('/bookmarks', bookmarksRouter)
app.use('/recommendations', recommendations)



app.get("/", function (req, res) {
    res.redirect('/articles')
})
const PORT = process.env.PORT;
mongoose.connect(
    connectionString,
    { useNewUrlParser: true, useUnifiedTopology: true, }
)
    .then(val => console.log('Connected!!'))

app.listen(PORT, console.log(`Welcome`))
