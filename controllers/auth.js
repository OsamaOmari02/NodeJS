const User = require('../models/user')
const bcrypt = require('bcryptjs')
const sgMail = require('@sendgrid/mail')
const dotenv = require("dotenv");
const crypto = require('crypto');
const { validationResult } = require('express-validator')
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
        oldInput: { email: '', password: '' },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            isAuthenticated: req.session.isLoggedIn,
            errorMessage: errors.array()[0].msg,
            oldInput: { email: email, password: password },
            validationErrors: errors.array()

        });
    }
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(400).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    isAuthenticated: req.session.isLoggedIn,
                    errorMessage: 'Invalid email or password',
                    oldInput: { email: email, password: password },
                    validationErrors: []
                });
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
                    return res.status(400).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        isAuthenticated: req.session.isLoggedIn,
                        errorMessage: 'Invalid email or password',
                        oldInput: { email: email, password: password },
                        validationErrors: []
                    });
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
        errorMessage: message,
        oldInput: { email: '', password: '', confirmPassword: '' },
        validationErrors: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            isAuthenticated: false,
            errorMessage: errors.array()[0].msg,
            oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
            validationErrors: errors.array()
        });
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

};
exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/password-reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        isAuthenticated: req.session.isLoggedIn,
        errorMessage: message,
    });
}
exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account found!!')
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                const msg = {
                    to: req.body.email,
                    from: 'osama.omarii02@gmail.com',
                    subject: 'Password Reset',
                    html: `
                            <p>You requested a password reset</p>
                            <p> Click this <a href="/http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
                          `
                }
                res.redirect('/');
                sgMail.send(msg)
                    .then(() => console.log('Email sent'))
                    .catch(err => console.log(err))
            })
            .catch(err => console.log(err));
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            }
            else {
                message = null;
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                isAuthenticated: req.session.isLoggedIn,
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token,
            });
        })
        .catch(err => console.log(err))
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(() => {
            res.redirect('/login')
        })
        .catch(err => console.log(err))
}