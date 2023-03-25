const express = require('express');
const router = express.Router();
const VitalController = require('../vitals/VitalController');
const { verifyToken } = require('../../util/auth');


router.get('/', verifyToken, VitalController.listPage);
router.get('/list', verifyToken, VitalController.list);
router.get("/add-vital-page", verifyToken, VitalController.addVitalPage);
router.post('/add-vital', verifyToken, VitalController.addVital);
router.get('/edit-vital-page/:id', verifyToken, VitalController.editVitalPage);
router.post('/edit-vital/:id', verifyToken, VitalController.editVital);
router.post('/validate-dataType', verifyToken, VitalController.validateDataType);
router.get('/view/:id', verifyToken, VitalController.view);

module.exports = router;