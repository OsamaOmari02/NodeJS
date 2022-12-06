const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');

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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store: store,
}));

// app.use(cookieParser);
// app.use(doubleCsrfProtection);
app.use(flash());
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
})

// app.use((req, res, next) => {
//   res.locals.isAuthenticated = req.session.isLoggedIn;
//   res.locals.csrfToken = req.generateToken();
//   next();
// })

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose.connect(process.env.DB_URL)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => console.log(err))

