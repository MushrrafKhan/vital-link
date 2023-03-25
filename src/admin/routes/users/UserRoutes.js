const express = require('express');
const router = express.Router();
const UserController = require('../users/UserController');
const {verifyToken} = require('../../util/auth');
const validations = require('./UserValidations');

  
const {validate} = require('../../util/validations');

router.get('/',
    verifyToken,
    UserController.listPage
);
router.get("/add", verifyToken, UserController.addUserPage);
router.post("/add", verifyToken, UserController.addUserSave)

router.get('/list',
    verifyToken,
    UserController.list
);


router.post('/upload-profile-pic/:id',
    verifyToken,
    UserController.uploadProfilePic
);

router.get('/view/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.view
);

router.get('/edit/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.editUserPage
);

router.post('/update/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.updateData
);


router.post(
    '/validate-email',
    UserController.isEmailExists
);

router.get('/update-status',
    verifyToken,
    validate(validations.updateStatus, 'query', {}, '/users'),
    UserController.updateStatus
);

// router.get('/update-subscription',
//     verifyToken,
//     validate(validations.updateSubscription, 'query', {}, '/users'),
//     UserController.updateSubscription
// );

router.get('/delete/:id',
    verifyToken,
    validate(validations.requireId, 'params', {}, '/users'),
    UserController.delete
);

router.get('/broadcast',
    verifyToken,
    UserController.broadcast
);

router.post('/broadcast_push',
    verifyToken,
    UserController.broadcast_push
);
router.get('/notification',
    UserController.notificationPage
);
router.get('/notification-list',
    UserController.notificationList
);

router.get('/privacy_policy',
    verifyToken,
    UserController.privacy_policyPage
);

router.get('/terms_conditions',
    verifyToken,
    UserController.termsAndconditionPage
);

router.post('/static',
    verifyToken,  
    UserController.Static
);

router.get('/about_us',
    verifyToken,
    UserController.Aboutus
);

router.get('/support_center',
    verifyToken,
    UserController.Support
);


module.exports = router;