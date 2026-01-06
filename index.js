const express = require('express')
require('dotenv').config()
const mongoose = require('mongoose')
const app = express()
const path = require('path')
const exphbs = require('express-handlebars')
const session = require('express-session')
const MongoStore = require('connect-mongo').default;

const catagoriesRouter = require('./routers/catagories')
const addArticleRouter = require('./routers/article')
const commentsRouter = require('./routers/comments')
const usersRouter = require('./routers/users')

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
    },
    defaultLayout: 'main',
    extname: '.hbs'
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
const bodyParser = require('body-parser');

const connectionString = 'mongodb+srv://theblog:'+process.env.DB_PASS+'@cluster0.9q0pw.mongodb.net/rblog?retryWrites=true&w=majority'


app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    store: MongoStore.create({
        mongoUrl: connectionString//,
        //mongoOptions: advancedOptions // See below for details
      }
    ),
    resave: true,
    saveUninitialized: true
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



app.get("/", function (req, res) {
    res.redirect('/articles')
})

/*
app.get("/session", function (req, res) {
    return res.send(req.session.name)
})
*/

const PORT = process.env.PORT;
//console.log(connectionString)
mongoose.connect(
    connectionString,
    { useNewUrlParser: true, useUnifiedTopology: true,}
)
    .then(val => console.log('Connected!!'))

app.listen(PORT, console.log(`Welcome`))

/*
app.get('/', (req, res) => {
    imgModel.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            res.render('imagesPage', { items: items });
        }
    });
});
app.post('/image', upload.single('image'), async (req, res, next) => {
    const data= fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename))
    const filename = req.file.filename
    console.log(data)
    const a = await Images.findByIdAndUpdate(id ,{profilePhoto:data})
    res.send(a)
});
*/
