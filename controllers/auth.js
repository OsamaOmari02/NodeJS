const User = require('../models/user')
const bcrypt = require('bcryptjs')
const sgMail = require('@sendgrid/mail')
const dotenv = require("dotenv");

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        isAuthenticated: req.session.isLoggedIn,
        errorMessage: message,
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                req.flash('error', 'Invalid email or password');
                return res.redirect('/login');
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        })
                    }
                    req.flash('error', 'Invalid email or password');
                    res.redirect('/login');
                })
                .catch(err => {
                    console.log(err)
                    res.redirect('/login')
                });
        })
        .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err)
        res.redirect('/')
    })
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        isAuthenticated: false,
        errorMessage: message
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    User.findOne({ email: email }).then(user => {
        if (user) {
            req.flash('error', 'E-Mail exists already, please pick a different one')
            return res.redirect('/signup')
        }
        return bcrypt.hash(password, 12)
            .then(hashedPassword => {
                const user = new User({
                    email: email,
                    password: hashedPassword,
                    cart: { items: [] }
                });
                return user.save()
                    .then(result => {
                        res.redirect('/login');
                        const msg = {
                            to: email,
                            from: 'osama.omarii02@gmail.com',
                            subject: 'Signup succeeded!!',
                            text: 'this is the text',
                            html: '<h1>You succefully signed up!</h1>'
                        }
                        sgMail.send(msg)
                            .then(() => console.log('Email sent'))
                            .catch(err => console.log(err))
                    })
                    .catch(err => {
                        console.log(err)
                    })
            });
    })
        .catch(err => {
            console.log(err);
        })

};