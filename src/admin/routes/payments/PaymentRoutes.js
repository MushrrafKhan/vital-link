const express = require('express');
const router = express.Router();
const PaymentController = require('../payments/PaymentController');
const {verifyToken} = require('../../util/auth');


// router.get('/',verifyToken,PaymentController.listPage);
// router.get('/list',verifyToken,PaymentController.list);
router.get('/ios-subscription',verifyToken,PaymentController.iosAdd);
router.post('/ios-subscription',verifyToken,PaymentController.saveiosAdd);
router.get('/android-subscription',verifyToken,PaymentController.androidAdd);
router.post('/android-subscription',verifyToken,PaymentController.saveandroidAdd);
// router.get('/view/:id',verifyToken,PaymentController.view);


module.exports = router;