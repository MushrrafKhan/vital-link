const express = require('express');
const router = express.Router();
const UserController = require('./UserController');
const { validate } = require('../../util/validations');
const validations = require('./UserValidations');
const { verifyToken } = require('../../util/auth');


router.get("/profile_account_info", verifyToken, UserController.profileAccountInfo);
router.post("/contact-us", verifyToken, UserController.contactUs);
router.post('/enable-notification', verifyToken, UserController.enableNotification);
router.put('/password', verifyToken, UserController.changePassword);
router.post('/notify', verifyToken, UserController.sendNotificationToUsers);

router.get('/notifications', verifyToken, UserController.getNotificationList);
router.post('/saveLocation', verifyToken, UserController.saveLocation);
router.post('/pages', UserController.pages);
router.get('/homescreen', verifyToken, UserController.homeScreen);
router.post('/addcontact', verifyToken, UserController.addContact);
router.post('/addFamilyContact', verifyToken, UserController.addFamilyContact);
router.get('/myFamilyContacts', verifyToken, UserController.myFamilyContacts);
router.post('/addEmergencyContact', verifyToken, UserController.addEmergencyContact);
router.get('/myEmergencyContacts', verifyToken, UserController.myEmergencyContacts);

router.get('/viewcontact', verifyToken, UserController.viewContact);
router.get('/familyContact', verifyToken, UserController.familyContact);
router.get('/tracklocation', verifyToken, UserController.trackLocation);
router.get('/pushnotification', verifyToken, UserController.pushnotification);
router.get('/profile', verifyToken, UserController.profile);

router.post('/updateprofile', verifyToken, UserController.updateProfile);
router.post('/save_api_data', verifyToken, UserController.save_api_data);
router.get('/tracking_val', verifyToken, UserController.TrackingGet);
router.get('/graph', verifyToken, UserController.Graph);
router.post('/tracking_val', verifyToken, UserController.TrackingPost);
router.post('/locationSync', verifyToken, UserController.locationSync);

router.post('/disalarm', verifyToken, UserController.disalarm);
router.post('/disalarm_delete', verifyToken, UserController.disalarmDelete);
router.get('/disalarm_get', verifyToken, UserController.disalarmGet);
router.get('/test', UserController.Test);
router.post('/webhook', UserController.WebHook);


module.exports = router;
