const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const errorController = require('./controllers/error');
const mongoose = require('mongoose');
const User = require('./models/user');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
// const cookieParser = require('cookie-parser')
// const { doubleCsrf } = require("csrf-csrf");
// const {
//   invalidCsrfTokenError, // This is just for convenience if you plan on making your own middleware.
//   generateToken, // Use this in your routes to provide a CSRF hash cookie and token.
//   validateRequest, // Also a convenience if you plan on making your own middleware.
//   doubleCsrfProtection, // This is the default CSRF protection middleware.
// } = doubleCsrf(doubleCsrfOptions);

const app = express();
const dotenv = require("dotenv");

const flash = require('connect-flash');
dotenv.config();

const store = new MongoDBStore(
  {
    uri: process.env.DB_URL,
    collection: 'sessions',
  }
);

store.on('error', function (error) {
  console.log(error);
});


app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
})


const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    cb(null, true);
  }
  else {
    cb(null, false);
  }
}
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store: store,
}));

// app.use((req, res, next) => {
//   res.locals.isAuthenticated = req.session.isLoggedIn;
//   res.locals.csrfToken = req.generateToken();
//   next();
// })

// app.use(cookieParser);
// app.use(doubleCsrfProtection);

app.use(flash());
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
})


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

mongoose.connect(process.env.DB_URL)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => console.log(err))

