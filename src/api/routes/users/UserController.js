const {
    models: {
        User,
        Notification,
        Alert,
        Tracking,
        Confirm,
        Setting,
        Report,
        AdminNotification,
        Static,
        Health,
        Disalarm,
        NoonlightAlert,
        VitalRange,
        FamilyContact
    },
} = require('../../../../lib/models');
const moment = require('moment-timezone');
const fs = require('fs');
const multer = require('multer');
var mongoose = require('mongoose');
const fetch = require('node-fetch');

const async = require('async');
var FCM = require('fcm-node');
require('socket.io');
var serverKey = process.env.SERVER_KEY; //put your server key here
var fcm = new FCM(serverKey);
const { uploadImageAPI } = require('../../../../lib/util');
var _ = require('lodash');
let cron = require('node-cron');
const { createHmac } = require('crypto');

cron.schedule('0 0 */2 * *', async () => {
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    let end = new Date();
    end.setHours(48, 59, 59, 999);
    const job = await Alert.updateMany(
        {
            created: { $gt: new Date(Date.now() - 172800000) },
        },
        {
            $set: { isDeleted: true, status: false },
        }
    );

    const users = await Alert.find({ created: { $gt: new Date(Date.now() - 172800000) } }).populate('user_id');

    // get users fcm token here and save it in registrations Tokens array
    let registrationTokens = [];
    users.forEach(alert => {
        registrationTokens = registrationTokens.concat(alert.user_id.deviceToken);
        id = alert.user_id.deviceToken;
    });

    // message body here
    var message = {
        //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        registration_ids: registrationTokens,
        notification: {
            title: 'Alert Deleted',
            message: 'Your alert is now deleted',
        },

        data: {
            screen: 'homescreen',
        },
    };

    // Send message here
    fcm.send(message, function (err, response) {
        if (err) {
            console.log('Something has gone wrong!');
        } else {
            console.log('Successfully sent with response: ', response);
        }
    });

    // Save delete notiification in db here

    users.forEach(async user => {
        let adminNot = new AdminNotification();
        adminNot.alertCreatedBy = user.user_id._id;
        adminNot.notification_title = message.notification.title;
        adminNot.description = message.notification.message;

        await adminNot.save();
    });
});

class UserController {
    async profileAccountInfo(req, res) {
        let { user } = req;
    }

    async searchVendor(req, res, next) {
        var name = 'Peter';
        model.findOne({ name: new RegExp('^' + name + '$', 'i') }, function (err, doc) {
            //Do your action here..
        });
    }

    async setCurrentAddress(req, res, next) {
        try {
            let { address_id } = req.body;
            await setDefaultLocationFalse(req.user._id);

            await User.updateOne(
                {
                    _id: req.user._id,
                    'address._id': address_id,
                },
                {
                    $set: { 'address.$.isDefault': true },
                }
            );
            return res.success('', req.__('SUCCESS'));
        } catch (err) {
            return next(err);
        }
    }

    async contactUs(req, res, next) {
        let { subject, type, message } = req.body;
        try {
            let userId = req.user._id;
            return res.success({}, req.__('CONTACT_REQUEST_SEND'));
        } catch (err) { }
    }

    async enableNotification(req, res, next) {
        try {
            let _id = req.user._id;
            let status = req.body.status;
            let user = await User.findOne({ _id });
            user.isNotification = status;
            await user.save();
            if (status == true) {
                return res.send({
                    success: 1,
                    data: user,
                    message: `Notification is on`,
                });
            } else {
                return res.send({
                    success: 1,
                    data: user,
                    message: `Notification is off`,
                });
            }
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async profile(req, res) {
        let aws_url = process.env.AWS_BASE_URL;
        let user = await User.findOne({ _id: req.user._id });
        let userJson;

        if (!user) {
            return res.warn({}, req.__('INVALID_REQUEST'));
        } else {
            userJson = user.toJSON();
            return res.success({ user: userJson, aws_url: aws_url }, req.__('Profile_Information'));
        }
    }

    async changePassword(req, res) {
        const { user } = req;
        const { currentPassword, newPassword } = req.body;

        const matched = await user.comparePassword(currentPassword);
        if (!matched) {
            return res.warn({}, req.__('PASSWORD_MATCH_FAILURE'));
        }
        const matcheAddedPassword = await user.comparePassword(newPassword);
        if (matcheAddedPassword) {
            return res.warn({}, 'Old password and new passowrd can not be same');
        }

        user.password = newPassword;
        await user.save();
        return res.success({}, 'Password updated successfully.');
    }

    async updateProfile(req, res, next) {
        try {
            let duplicate = [];
            let aws_url = process.env.AWS_BASE_URL;
            let user = await User.findOne({ _id: req.user._id });
            if (user) {
                const upload = multer({ dest: 'uploads/' }).single('profileImage');
                upload(req, res, async err => {
                    if (err) {
                        return res.status(400).send('Something went wrong!');
                    }
                    const file = req.file;
                    if (!file) {
                        duplicate = await User.find({ mobile: req.body.mobile, _id: { $nin: req.user._id } });
                        if (duplicate.length > 0) {
                            return res.warn({}, 'mobile number already exist');
                        }

                        user.name = req.body.name;
                        user.City = req.body.City;
                        user.State = req.body.State;
                        user.Zipcode = req.body.Zipcode;
                        //user.mobile = req.body.mobile;
                        user.address = req.body.address;
                        user = await user.save();
                        let userJson = user.toJSON();

                        return res.success(
                            { aws_url: aws_url, user: userJson },
                            'Your details has been updated successfully'
                        );
                    } else {
                        duplicate = await User.find({ mobile: req.body.mobile, _id: { $nin: req.user._id } });
                        if (duplicate.length > 0) {
                            return res.warn({}, 'mobile number already exist');
                        }
                        const oldimg = req.file.path;
                        let image = await uploadImageAPI(file, 'user');
                        user.avatar = image.key;
                        user.name = req.body.name;
                        user.mobile = req.body.mobile;
                        user.address = req.body.address;
                        user.City = req.body.City;
                        user.State = req.body.State;
                        user.Zipcode = req.body.Zipcode;
                        user = await user.save();

                        fs.unlink(oldimg, function (err) {
                            if (err) throw err;
                        });
                        let userJson = user.toJSON();

                        return res.success(
                            { aws_url: aws_url, user: userJson },
                            'Your details has been updated successfully'
                        );
                    }
                });
            } else {
                return res.warn({}, req.__('USER_NOT_FOUND'));
            }
        } catch (err) {
            return next(err);
        }
    }

    /**
     * Function to send notification to all users when new alert created
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns
     * @author GSS
     */
    async sendNotificationToUsers(req, res, next) {
        let { user, alertid } = req.body;
        try {
            let lat2 = req.query.latitude;
            let lon2 = req.query.longitude;
            let adminRadius = await Setting.findOne({ isDeleted: false });
            let radius = adminRadius.radius;
            if (adminRadius == 'undefined') {
                adminRadius = 20;
            }

            const miles = radius;

            // Function to convert kms to miles
            var milesToRadian = function (miles) {
                var earthRadiusInMiles = 3959;
                return miles / earthRadiusInMiles;
            };

            // Query to get all the users near the alert coordinates
            let userCoordinates = [lat2, lon2];

            var query = {
                'loc.coordinates': {
                    $geoWithin: {
                        $centerSphere: [userCoordinates, milesToRadian(miles)],
                    },
                },
            };

            let getUser = await User.find(query);
            let user = [];
            getUser.forEach(item => {
                if (item._id != req.user._id) {
                    user = user.concat(item._id);
                }
            });

            user.forEach(async function (arrayItem) {
                var userId = arrayItem;
                let alert = await Alert.findOne({ _id: req.body.alertid });
                if (alert) {
                    var newAlert = {};
                    newAlert['alertType'] = alert.alertType;
                    newAlert['alert_msg'] = alert.alert_msg;
                    newAlert['image'] = alert.image;
                    newAlert['distance'] = alert.distance;
                    newAlert['address'] = alert.address;
                    newAlert['confirmedBy'] = alert.confirmedBy;
                    newAlert['createdBy'] = alert.createdBy;

                    let notification = new Notification();
                    notification.userId = alert.user_id;
                    notification.fetchedBy = userId;
                    notification.alertId = req.body.alertid;
                    notification.address = newAlert.address;
                    notification.alert_msg = newAlert.alert_msg;
                    notification.distance = newAlert.distance;
                    notification.image = newAlert.image;
                    notification.alertType = newAlert.alertType;
                    notification.confirmedBy = newAlert.confirmedBy;
                    notification.createdBy = newAlert.createdBy;
                    notification.alertLocation = alert.alertLocation;

                    let notify = await notification.save();
                } else {
                    return res.warn('', req.__('NOT_FOUND'));
                }
            });
            return res.success('', 'All notification saved successfully');
        } catch (err) {
            return next(err);
        }
    }

    // async getNotificationList(req, res, next) {
    //     try {

    //         let allNotifications = await Notification.find({ fetchedBy: req.user._id, userId: { $ne: req.user._id }, created: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, { _id: 0 }).populate('userId alertType').sort({ "created": -1, "distance": -1 });
    //         let confirm = await Confirm.find({ confirmedBy: req.user._id });
    //         let report = await Report.find({ reportedBy: req.user._id });
    //         allNotifications.forEach((item) => {
    //             let timestamp1 = Date.now();
    //             let timestamp2 = item.created;

    //             let isFound = confirm.filter((elems) => elems.alertId.toString() == item.alertId.toString())
    //             item.isConfirmed = isFound.length > 0 ? 1 : 0
    //             let isReport = report.filter((elems) => elems.alertId.toString() == item.alertId.toString())
    //             item.isReported = isReport.length > 0 ? 1 : 0

    //             var hours = Math.abs(timestamp1 - timestamp2) / 36e5;
    //             item._id = item.alertId;

    //             if (hours > 24) {
    //                 item.live = false;
    //             } else {
    //                 item.live = true;
    //             }
    //             if (item.userId._id.toString() == req.user._id.toString()) {
    //                 item.isUser = true;
    //             } else {
    //                 item.isUser = false;
    //             }
    //             item.lat = item.alertLocation.coordinates[0];
    //             item.lng = item.alertLocation.coordinates[1];
    //         });

    //         return res.success({
    //             allnotification: allNotifications
    //         }, req.__('NOTIFICATION'));
    //     } catch (err) {
    //         return next(err)
    //     }
    // }

    async getNotificationList(req, res, next) {
        try {
            let _id = req.user._id;
            let allNotifications = await Notification.find({ fetchedBy: _id });
            console.log(allNotifications);
            if (allNotifications.length == 0) {
                return res.success({}, 'Notification does not exists');
            }
            return res.success(
                {
                    allnotification: allNotifications,
                },
                req.__('NOTIFICATION')
            );
        } catch (err) {
            return next(err);
        }
    }
    async pages(req, res) {
        const aboutpage = req.body.slug;
        const p = await Static.findOne({ slug: aboutpage });
        return res.success(
            {
                status: true,
                data: p,
            },
            'Details has been fetched successfully'
        );
    }

    async saveLocation(req, res, next) {
        try {
            let latitude = req.query.latitude;
            let longitude = req.query.longitude;
            let location = [latitude, longitude];

            let user = await User.findOne({ _id: req.user._id });

            if (!user) {
                return res.warn({}, 'User does not exist');
            } else {
                user.loc.coordinates = location;
                await user.save();
                return res.success(
                    {
                        user: user,
                    },
                    req.__('Location saved successfully')
                );
            }
        } catch (err) {
            return next(err);
        }
    }

    async homeScreen(req, res, next) {
        try {
            let aws_url = process.env.AWS_BASE_URL;
            let EmergencyContact = [];
            let contact = [];
            let user = req.user;
            let users = await User.findOne({ _id: user._id }).select('contact_id');
            contact = users.contact_id;
            async.mapSeries(
                contact,
                async function (i) {
                    let cont = await User.findOne({ _id: i });
                    EmergencyContact.push(cont);
                },
                function () {
                    console.log(EmergencyContact);
                    return res.success(
                        {
                            user: user,
                            emergency: EmergencyContact,
                            aws_url: aws_url,
                        },
                        'home Screen fetched successfully'
                    );
                }
            );
        } catch (err) {
            return next(err);
        }
    }

    async addContact(req, res, next) {
        try {
            let { email, phone, address } = req.body;
            let user = req.user;
            let aws_url = process.env.AWS_BASE_URL;
            let contact_array = [];
            contact_array = user.contact_id;

            let checkEmailExists = await User.findOne({ $or: [{ email: email }, { mobile: phone }] });

            if (checkEmailExists) {
                if (user.subscribe == false && contact_array.length >= 4) {
                    return res.warn(
                        {},
                        req.__(
                            'Add upto 4 contacts including your main healthcare provider to be notified in and emergency event'
                        )
                    );
                }
                if (user.subscribe == true && contact_array.length >= 10) {
                    return res.warn(
                        {},
                        req.__(
                            'Add upto 10 contacts including your main healthcare provider to be notified in and emergency event'
                        )
                    );
                }

                if (contact_array.includes(checkEmailExists._id)) {
                    return res.warn({}, req.__('User Already Exist in Emergency Contact'));
                }
                let contactId = checkEmailExists._id;
                let cont = await User.findOneAndUpdate(
                    { _id: user._id },
                    { $push: { contact_id: contactId } },
                    { new: true }
                );

                let cont2 = await User.findOneAndUpdate(
                    { _id: contactId },
                    { $push: { contact_id: user._id } },
                    { new: true }
                );

                return res.success(
                    {
                        user: cont,
                    },
                    req.__('Contact saved successfully')
                );
            } else {
                return res.warn({}, req.__('user not available on this app'));
            }
        } catch (err) {
            return next(err);
        }
    }

    async addFamilyContact(req, res, next) {
        try {

            const { email, contact, address } = req.body;
            let familyContacts = req.user.familyContactsId
            let registered = await User.findOne({ $or: [{ email }, { mobile: contact }] })
            if (registered) {
                if (familyContacts.includes(registered._id)) {
                    return res.warn({}, "This email or contact already saved in your family contact");
                } else {

                    await User.findOneAndUpdate(
                        { _id: req._id },
                        { $push: { familyContactsId: registered._id } },
                        { new: true }
                    );
                    return res.success({}, "Contact saved in family contact")
                }
            } else {
                return res.warn({}, "This email or contact doesn't registered in this app")
            }
        }
        catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async myFamilyContacts(req, res, next) {
        try {
            if (req.user.familyContactsId.length > 0) {

                let myFamilyContacts = await User.find({ _id: req._id }, { _id: 0, familyContactsId: 1 }).populate({ path: "familyContactsId", select: "name mobile email address avatar", model: User }).lean()
                return res.success({ myFamilyContacts: myFamilyContacts[0].familyContactsId }, "Family contacts")
            } else {
                return res.notFound({}, "You have no family contacts")
            }

        }
        catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async addEmergencyContact(req, res, next) {
        try {
            const { email, contact, address } = req.body;
            let emergencyContact = req.user.emergencyContactsId
            let registered = await User.findOne({ $or: [{ email }, { mobile: contact }] })
            if (registered) {
                if (emergencyContact.includes(registered._id)) {
                    return res.warn({}, "This email or contact already saved in your emergency contact");
                } else {

                    await User.findOneAndUpdate(
                        { _id: req._id },
                        { $push: { emergencyContactsId: registered._id } },
                        { new: true }
                    );
                    return res.success({}, "Contact saved successfully")
                }
            } else {
                return res.warn({}, "This email or contact doesn't registered in this app")
            }
        }
        catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async myEmergencyContacts(req, res, next) {
        try {
            if (req.user.emergencyContactsId.length > 0) {

                let emergencyContacts = await User.find({ _id: req._id }, { _id: 0, emergencyContactsId: 1 }).populate({ path: "emergencyContactsId", select: "name mobile email address avatar", model: User }).lean()
                return res.success({ emergencyContacts: emergencyContacts[0].emergencyContactsId }, "Your emergency contacts")
            } else {
                return res.notFound({}, "You have no emergency contacts")
            }

        }
        catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async viewContact(req, res, next) {
        try {
            let aws_url = process.env.AWS_BASE_URL;
            let EmergencyContact = [];
            let contact = [];
            let user = req.user;
            let users = await User.findOne({ _id: user._id }).select('contact_id');
            contact = users.contact_id;
            async.mapSeries(
                contact,
                async function (i) {
                    let cont = await User.findOne({ _id: i });
                    EmergencyContact.push(cont);
                },
                function () {
                    return res.success(
                        {
                            aws_url: aws_url,
                            emergency: EmergencyContact,
                        },
                        'Emergency contacts fetched successfully'
                    );
                }
            );
        } catch (err) {
            return next(err);
        }
    }

    async familyContact(req, res, next) {
        try {
            let aws_url = process.env.AWS_BASE_URL;
            let user = req.user._id;
            let users = await User.find({ contact_id: { $in: [user] } });
            users.map(u => {
                console.log(u);
            });
            return res.success(
                {
                    users: users,
                    aws_url: aws_url,
                },
                'Family contacts fetched successfully'
            );
        } catch (err) {
            return next(err);
        }
    }

    async trackLocation(req, res, next) {
        try {
            let EmergencyContact = [];
            let contact = [];
            let user = req.user;
            let users = await User.findOne({ _id: user._id }).select('contact_id');
            contact = users.contact_id;
            async.mapSeries(
                contact,
                async function (i) {
                    let cont = await User.findOne({ _id: i });
                    EmergencyContact.push(cont);
                },
                function () {
                    return res.success(
                        {
                            user: user,
                            emergency: EmergencyContact,
                        },
                        'Location fetched successfully'
                    );
                }
            );
        } catch (err) {
            return next(err);
        }
    }

    async pushnotification(req, res, next) {
        const io = new Server(server);
        io.on('connection', socket => {
            console.log('a user connected');
        });
    }

    async save_api_data(req, res, next) {
        let data = req.body.data;
        data.forEach(async i => {
            let date = new Date(data[0].dataTypeValueTimeStamp);
            let health = await Health.findOne({ dataType: i.dataType });
        });

        if (!health) {
            let date = new Date(data[0].dataTypeValueTimeStamp);
            let obj = new Health();

            obj.user_id = req.user._id;
            obj.dataType = data[0].dataType;
            obj.dataTypeUnit = data[0].dataTypeUnit;
            obj.dataTypeValueTimeStamp = date;
        }
        await obj.save();
    }

    async TrackingGet(req, res, next) {
        try {
            // console.log(req.body)
            let timeZone = req.query.timeZone;
            let user = req.user;
            let date = req.query.dataFormat;

            let date_ = new Date(date);
            console.log(date_);

            const d = date_.getDate();
            const m = date_.getMonth() + 1;
            const y = date_.getFullYear();
            let prevDate = moment(`${date}`).format('YYYY-MM-DD HH:mm:ss');
            let nextDate = moment(`${date}`)
                .add(1, 'days')
                .format('YYYY-MM-DD HH:mm:ss');
            // console.log(prevDate)
            // console.log(nextDate)
            let dataTypes = await Tracking.aggregate([
                {
                    $group: {
                        _id: {
                            dataType: '$dataType',
                        },
                    },
                },
                {
                    $addFields: {
                        dataType: '$_id.dataType',
                    },
                },
                {
                    $project: {
                        _id: 0,
                        dataType: 1,
                    },
                },
            ]);
            console.log(dataTypes);
            let trackingData = [];

            async.mapSeries(
                dataTypes,
                async function (x) {
                    let userData = await Tracking.find({
                        user_id: user._id,
                        dataFormat: { $gte: prevDate, $lt: nextDate },
                        dataType: x.dataType,
                    })
                        .sort({ dataTypeValueTimeStamp: -1 })
                        .limit(1)
                        .lean();
                    console.log(userData);
                    // console.log(userData[0].dataTypeValueTimeStamp)

                    if (userData[0]) {
                        userData[0].dataTypeValueTimeStamp = moment(`${userData[0].dataTypeValueTimeStamp}`, 'x')
                            .tz(timeZone)
                            .format('YYYY-MM-DD hh:mm a');
                        trackingData.push(userData[0]);
                    }
                },
                function () {
                    return res.send({
                        success: true,
                        TrackingData: trackingData,
                        message: `User's tracking data fetched successfully`,
                    });
                }
            );
        } catch (err) {
            return next(err);
        }
    }

    async Graph(req, res, next) {
        try {
            // console.log(req.body)
            let user = req.user;
            let date = req.query.dataFormat;
            let dataType = req.query.dataType;

            let date_ = new Date(date);
            console.log('---------------------------------------------------->');
            const d = date_.getDate();
            const m = date_.getMonth() + 1;
            const y = date_.getFullYear();
            let prevDate = moment(`${y}-${m}-${d}`).format('YYYY-MM-DD HH:mm:ss');
            let nextDate = moment(`${y}-${m}-${d + 1}`).format('YYYY-MM-DD HH:mm:ss');

            let userData = await Tracking.find({
                user_id: user._id,
                dataFormat: { $gte: prevDate, $lt: nextDate },
                dataType,
            })
                .sort({ dataTypeValueTimeStamp: -1 })
                .lean();

            return res.send({
                success: true,
                TrackingData: userData,
                message: `User's tracking data fetched successfully`,
            });
        } catch (err) {
            return next(err);
        }
    }

    async TrackingPost(req, res, next) {
        try {
            let data = req.body;
            let ecg = await VitalRange.findOne({ dataType: 'ECG' });
            let bloodOxygen = await VitalRange.findOne({ dataType: 'BLOOD OXYGEN' });
            let bloodPressure = await VitalRange.findOne({ dataType: 'BLOOD PRESSURE DIASTOLIC' });
            let bps = await VitalRange.findOne({ dataType: 'BLOOD PRESSURE SYSTOLIC' });
            let respiratoryRate = await VitalRange.findOne({ dataType: 'RESPIRATORY RATE' });
            let bodyTemp = await VitalRange.findOne({ dataType: 'BODY TEMPERATURE' });
            let heartRate = await VitalRange.findOne({ dataType: 'HEART RATE' });
            // console.log(data)
            let user = req.user;
            let multi = Number(data[0].dataTypeValueTimeStamp) * 1000;
            console.log(data[0].timeZone);
            let DateMain = moment(multi)
                .tz(data[0].timeZone)
                .format('YYYY-MM-DD HH:mm:ss');
            let date_main = new Date(DateMain);
            const d = date_main.getDate();
            const m = date_main.getMonth() + 1;
            const y = date_main.getFullYear();
            let prevDate = moment(`${y}-${m}-${d}`)
                .tz(data[0].timeZone)
                .format('YYYY-MM-DD HH:mm:ss');
            let nextDate = moment(`${y}-${m}-${d + 1}`)
                .tz(data[0].timeZone)
                .format('YYYY-MM-DD HH:mm:ss');
            console.log(
                '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',
                prevDate,
                nextDate
            );
            const uniqueKey = [...new Set(data.map(item => item.dataType))];
            console.log(uniqueKey);
            uniqueKey.map(async x => {
                await Tracking.deleteMany({
                    user_id: user._id,
                    dataFormat: { $gte: prevDate, $lt: nextDate },
                    dataType: x,
                });
            });

            async.mapSeries(
                data,
                async function (x) {
                    //  console.log(x)
                    let trackingData = new Tracking();
                    trackingData.user_id = user._id;
                    trackingData.dataType = x.dataType;
                    trackingData.dataTypeUnit = x.dataTypeUnit;
                    trackingData.dataTypeValue = x.dataTypeValue;
                    let dataf = x.dataTypeValueTimeStamp;
                    let mult = dataf * 1000;

                    //   var date_ = new Date(mult);
                    var temp = moment(mult)
                        .tz(x.timeZone)
                        .format('YYYY-MM-DD HH:mm:ss');

                    // console.log("==========>>>>>>>>",temp)
                    trackingData.dataTypeValueTimeStamp = mult;
                    trackingData.dataFormat = moment(mult)
                        .tz(x.timeZone)
                        .format('YYYY-MM-DD HH:mm:ss');
                    // console.log('----')
                    await trackingData.save();
                    if (x.dataType == 'HEART RATE' && x.dataTypeValue >= heartRate.dataTypeValue && user.subscribe) {

                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };


                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'Heart failure emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (x.dataType == 'ECG' && x.dataTypeValue >= ecg.dataTypeValue && user.subscribe) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'ECG  emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (x.dataType == 'BLOOD OXYGENC' && x.dataTypeValue >= bloodOxygen.dataTypeValue && user.subscribe) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'BLOOD OXYGEN emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (
                        x.dataType == 'BLOOD PRESSURE DIASTOLIC' &&
                        x.dataTypeValue >= bloodPressure.dataTypeValue && user.subscribe
                    ) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'BLOOD PRESSURE DIASTOLIC emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (x.dataType == 'BLOOD PRESSURE SYSTOLIC' && x.dataTypeValue >= bps.dataTypeValue && user.subscribe) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'BLOOD PRESSURE SYSTOLIC emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (x.dataType == 'RESPIRATORY RATE' && x.dataTypeValue >= respiratoryRate.dataTypeValue && user.subscribe) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'RESPIRATORY RATE emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    } else if (x.dataType == 'BODY TEMPERATURE' && x.dataTypeValue >= bodyTemp.dataTypeValue && user.subscribe) {
                        // console.log('-<>-')
                        const options = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.ServerToken}`,
                            },
                            body: JSON.stringify({
                                location: {
                                    address: {
                                        line1: user.address,
                                        city: user.City,
                                        state: user.State,
                                        zip: user.Zipcode,
                                    },
                                },
                                services: { fire: true },
                                // name: 'Alex Martin',
                                name: req.user.name,
                                phone: req.user.mobile,
                            }),
                        };

                        fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                            .then(response => response.json())
                            .then(async response => {
                                console.log(
                                    '------------------------------------------------------------------------------->'
                                );

                                let noonlight = new NoonlightAlert();
                                noonlight.userId = req.user._id;
                                noonlight.alertId = response.id;
                                noonlight.status = response.status;
                                noonlight.ownerId = response.owner_id;
                                await noonlight.save();

                                console.log(response);

                                // return res.success(response)
                            })
                            .catch(err => console.error(err));

                        let getToken = await User.findOne(user._id);
                        let myArray = getToken.contact_id;
                        myArray.forEach(async uId => {
                            // console.log("====inforeach===",uId)
                            let notification = new Notification();
                            notification.userId = req.user._id;
                            notification.fetchedBy = uId;
                            notification.alert_msg = 'This is new alert created now';
                            notification.title = 'BODY TEMPERATURE emergency';
                            let dataf = x.dataTypeValueTimeStamp;
                            let mult = dataf * 1000;
                            var date_ = new Date(mult);
                            var temp = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            //  console.log("==========>>>>>>>>",temp)
                            notification.dataFormat = moment(mult)
                                .tz(x.timeZone)
                                .format('YYYY-MM-DD HH:mm:ss');
                            let notify = await notification.save();
                            // console.log(notify)
                        });
                        let userDevice = [];
                        async.mapSeries(
                            myArray,
                            async function (t) {
                                let emrCon = await User.findOne({ _id: t });
                                let token = emrCon.deviceToken;
                                userDevice.push(token);
                            },
                            async function () {
                                console.log('----disalarm----------');
                                let disalarm = await Disalarm.findOne({ user: user._id });
                                let dateAl = disalarm.date;
                                console.log(dateAl);
                                var disdate = new Date(dateAl);
                                var disTime = disdate.getTime() + disalarm.timestamps * 1000;
                                var curDate = new Date();
                                var curTime = curDate.getTime();
                                console.log(curTime, disTime);
                                if (disTime < curTime) {
                                    console.log(disalarm);
                                    userDevice.map(token => {
                                        // console.log('===', token)
                                        let message = {
                                            to: token,

                                            notification: {
                                                sound: 'default',
                                                title: 'Heart failure emergency',
                                                type: 'HEART RATE',
                                                body: `This is new alert created now.`,
                                            },
                                        };
                                        // console.log(message)
                                        fcm.send(message, function (err, response) {
                                            if (err) {
                                                console.log('Something has gone wrong!' + err);
                                            } else {
                                                console.log('Successfully sent with response: ', response);
                                            }
                                        });
                                    });
                                }
                            }
                        );
                    }
                },
                function () {
                    return res.success({}, "User's tracking data saved successfully");
                }
            );
        } catch (err) {
            return next(err);
        }
    }

    async disalarm(req, res, next) {
        try {
            let user = req.user._id;
            let { timestamps, status } = req.body;
            // console.log(req.body)

            // console.log('--------true-----------')
            let data = new Disalarm({
                timestamps: timestamps,
                user,
            });

            await data.save();
            return res.send({
                success: true,
                data,
                message: 'Disalarm saved successfully',
            });
        } catch (err) {
            return next(err);
        }
    }

    async disalarmDelete(req, res, next) {
        try {
            let user = req.user._id;
            // let {timestamps, status} = req.body;
            // console.log(req.body)
            // console.log('--------false-----------')
            await Disalarm.findOneAndRemove({ user: user });
            return res.send({
                success: true,
                data: {},
                message: 'Disalarm delete successfully',
            });
        } catch (err) {
            return next(err);
        }
    }

    async disalarmGet(req, res, next) {
        try {
            let user = req.user._id;
            // let {timestamps, status} = req.body;
            // console.log(req.body)
            // console.log('--------false-----------')
            let data = await Disalarm.findOne({ user: user });
            if (!data) {
                // return res.success({}, 'Disalarm not found');
                return res.send({
                    success: true,
                    data: {},
                    message: 'Disalarm not found',
                });
            }
            // console.log(data)
            // let t=new Date(data.date).getTime();
            // let t_=new Date().getTime();

            let t = moment(data.created).valueOf();
            let t_ = moment().valueOf();

            let timestamps = data.timestamps - (t_ - t) / 1000;
            console.log(timestamps);
            console.log((t / 1000) % 1000, (t_ / 1000) % 1000);
            let data_ = data.toJSON();
            data_.timestamps = Math.ceil(timestamps);
            return res.send({
                success: true,
                data: data_,
                message: 'Disalarm get successfully',
            });

            // return res.success(
            //     { data },
            //     'Disalarm get successfully'
            // );
        } catch (err) {
            return next(err);
        }
    }

    async locationSync(req, res, next) {
        try {
            let _id = req.user._id;
            let status = req.body.status;
            let user = await User.findOne({ _id });
            if (!user) {
                return res.send({
                    success: 0,
                    data: {},
                    message: 'User not found !',
                });
            }
            user.isLocation = status;
            await user.save();

            if (status == true) {
                return res.send({
                    success: 1,
                    data: user,
                    message: `Location is on`,
                });
            } else {
                return res.send({
                    success: 1,
                    data: user,
                    message: `Location is off`,
                });
            }
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async Test(req, res, next) {
        try {
            console.log('-----------------------------');
            const options = {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.ServerToken}`,
                },
                body: JSON.stringify({
                    location: {
                        address: { line1: '911 Washington Ave', city: 'St. Louis', state: 'MO', zip: '63101' },
                    },
                    services: { fire: true },
                    name: 'Alex Martin',
                    phone: '15555555555',
                }),
            };

            fetch('https://api-sandbox.noonlight.com/dispatch/v1/alarms', options)
                .then(response => response.json())
                .then(response => {
                    return res.success(response);
                })
                .catch(err => console.error(err));
        } catch (err) {
            console.log(err);
            return next(err);
        }
    }

    async WebHook(req, res, next) {
        try {
            console.log(req.body);
            console.log(
                'Webhook webhook Webhook webhook Webhook webhook Webhook webhook Webhook webhook Webhook webhook Webhook webhook Webhook webhook---------------------->'
            );
            const webhookSecret = process.env.WebhookSecret;
            const signature = createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('base64');
            if (signature === req.get('X-Noonlight-Signature')) {
                return res.sendStatus(200);
            }
            res.sendStatus(401);
        } catch (err) {
            return next(err);
        }
    }


}

async function setDefaultLocationFalse(_id) {
    return await User.updateOne(
        {
            _id,
            'address.isDefault': true,
        },
        {
            $set: { 'address.$.isDefault': false },
        }
    );
}

function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return (Value * Math.PI) / 180;
}

module.exports.respond = function (socket_io) {
    // this function expects a socket_io connection as argument

    // now we can do whatever we want:
    socket_io.on('news', function (newsreel) {
        // as is proper, protocol logic like
        // this belongs in a controller:

        socket.broadcast.emit(newsreel);
    });
};

module.exports = new UserController();
