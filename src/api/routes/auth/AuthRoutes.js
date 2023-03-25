const express = require('express');
const router = express.Router();
const AuthController = require('./AuthController');

const { validate } = require('../../util/validations');
const validations = require('./AuthValidations');
const {verifyToken} = require('../../util/auth');

const {
    models: { Users  },
} = require('../../../../lib/models');

router.get('/generate-token/:_id',
    AuthController.generateToken
);

router.post('/log-in',
    validate(validations.logIn),
    AuthController.logIn
);

router.get('/log-out',
    verifyToken,
    AuthController.logOut
);
router.get(
    '/state_list',
    AuthController.state_list
)



router.post(
    '/verify-otp',
    AuthController.verifyOtp
)


router.post(
    '/resend-otp',
    AuthController.resendOtp
)
router.post(
    '/forgot-resend-otp',
    AuthController.forgotresendOtp
)

router.post(
    '/signup',
    AuthController.signup
)



router.post(
    '/forgot-password',
    AuthController.forgotPassword
)


router.post(
    '/reset-password',
    AuthController.resetPassword
)

router.post(
    '/check-validation',
    AuthController.checkValidation
)

router.post(
    '/reject-position',
    //validate(validations.resetPassword),
    AuthController.rejectPosition
);


module.exports = router;
