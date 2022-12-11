const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth')
const User = require('../models/user')

router.get('/login', authController.getLogin);

router.post('/login',
    body('email', 'Please enter a valid email.').isEmail().normalizeEmail(),
    body('password', 'Please enter a valid password.').isLength({ min: 6 }).isAlphanumeric().trim(),
    authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post('/signup',
    body('email', 'Please enter a valid email.').isEmail()
        .custom((value, { req }) => {
            return User.findOne({ email: value })
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject(
                            'E-Mail exists already, please pick a different one.'
                        );
                    }
                })
        }).normalizeEmail(),
    body('password', 'Pleas enter a password with only numbers and text and at least 6 characters.')
        .isLength({ min: 6 }).isAlphanumeric().trim(),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password have to match!')
        }
        return true;
    }).trim(),
    authController.postSignup);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;
