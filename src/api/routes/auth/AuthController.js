const {
    models: { User, Practice, Concierge, Country, Vendor, Zip, ProductVendor, Week, Sale }
} = require('../../../../lib/models');
const mailer = require('../../../../lib/mailer');

const sms = require('../../../../lib/sms');
const { signToken } = require('../../util/auth');
const { signTempToken } = require('../../util/auth');
const { getPlatform } = require('../../util/common');
const { utcDateTime, getWeekNumber, generateOtp, logError, adminEmail, randomString, createS3SingnedUrl, generateResetToken, sendSms } = require('../../../../lib/util');
var _ = require('lodash');
const jwtToken = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var apiEnv = process.env.NODE_ENV;
var FROM_MAIL = process.env.FROM_MAIL

var moment = require('moment');


class AuthController {
    async logIn(req, res, next) {


        try {
            const { email, password, deviceType, deviceToken, deviceId } = req.body;
            let user;
            let msg;

            let aws_url = process.env.AWS_BASE_URL

            user = await User.findOne({ email: email, isDeleted: false });

            if (!user) {
                return res.warn({}, 'Invalid email or password');
            }

            if (user.emailVerify == false) {
                return res.warn({}, "Please Complete your otp verification");
            }

            msg = "Invalid email or password";

            const passwordMatched = await user.comparePassword(password);

            if (!passwordMatched) {
                return res.warn({}, msg);
            }


            //deviceId  ---> Single Value

            user.emailToken = generateResetToken(12);

            user.authTokenIssuedAt = utcDateTime().valueOf();
            user.deviceToken = deviceToken;
            user.deviceType = deviceType;
            user.deviceId.push(deviceId);
            await user.save();

            let token = user.emailToken;


            if (user.isSuspended) {
                return res.warn({ "userId": user._id, "emailVerified": user.emailVerify, "adminVerified": !(user.isSuspended) }, 'Admin has yet to approve verification');
            }

            const jwttoken = signToken(user);

            const userJson = user.toJSON();

            ['password', 'authTokenIssuedAt', 'otp', 'emailToken', '__v'].forEach(key => delete userJson[key]);


            return res.success({
                "language": req.headers['accept-language'],
                jwt: jwttoken,
                user: userJson,
                aws_url: aws_url
            }, req.__('LOGIN_SUCCESS'));


        } catch (err) {
            return next(err);
        }
    }

    async generateToken(req, res) {
        let _id = req.params._id;
        const user = await User.findOne({ _id });
        const platform = req.headers['x-hrms-platform'];
        const token = signToken(user, platform);
        return res.success({
            token
        });
    }

    async logOut(req, res) {
        const { user } = req;
        user.authTokenIssuedAt = null;
        user.deviceToken = null;
        await user.save();
        return res.success({}, req.__('LOGOUT_SUCCESS'));
    }

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     * @returns 
     */
    async verifyOtp(req, res, next) {
        let {
            otp, email, token,
        } = req.body;

        try {

            //  let user;

            let user = await User.findOne({
                email, isDeleted: false
            })


            if (!user) {
                return res.warn({}, req.__('UNAUTHORIZED'));
            }

            if (user) {

                if (user.otp == otp) {

                    if (user.emailToken == token) {

                        user.emailVerify = 'true';
                    }
                    user.emailVerify = 'true';
                    let newUser = await user.save();
                    const jwttoken = signToken(user);
                    const userJson = user.toJSON();

                    return res.success(
                        {

                        },
                        "OTP verified successfully! Please login to the application"
                    );
                } else {
                    return res.warn({}, "Invalid OTP");
                }
            } else {
                return res.warn({}, req.__('GENERAL_ERROR'));
            }

        } catch (err) {
            return next(err)
        }
    }

    async resendOtp(req, res, next) {
        let {
            email, token
        } = req.body;
        try {
            let user;
            user = await User.findOne({
                email, isDeleted: false
            })

            if (!user) {
                return res.warn({}, req.__('UNAUTHORIZED'));
            }
            if (user) {
                let otp = generateOtp();
                user.otp = otp;
                user.mobileVerify = false;
                let newUser = await user.save()
                let forgotToken = newUser.resetToken;
                let emailToken = newUser.emailToken;

                if (token == forgotToken) {

                    if (newUser.email != '') {
                        let emailToSend = newUser.email;
                        //Construct mail body here
                        const msg = {
                            to: emailToSend,
                            from: FROM_MAIL, // Change to your verified sender
                            subject: 'Vital Guard: Forgot Password OTP',
                            text: 'Please enter the following OTP to reset your password : ' + user.otp,
                            html: '<strong>Please enter the following OTP to reset your password :' + user.otp + ' </strong>',
                        }

                        //Send Email Here
                        sgMail
                            .send(msg)
                            .then(() => {

                                return res.success(
                                    {

                                    }, req.__('OTP_SEND_SUCCESS')
                                );
                            })
                            .catch((error) => {
                                console.error(error)
                            })
                    }
                } else {

                    if (newUser.email != '') {
                        let emailToSend = newUser.email;
                        //Construct mail body here
                        const msg = {
                            to: emailToSend,
                            from: FROM_MAIL, // Change to your verified sender
                            subject: 'Vital Guard: Verify Email OTP',
                            text: 'Please enter the following OTP to verify your email : ' + user.otp,
                            html: '<strong>Please enter the following OTP to verify your email :' + user.otp + ' </strong>',
                        }

                        //Send Email Here
                        sgMail
                            .send(msg)
                            .then(() => {
                                return res.success({}, req.__('OTP_SEND_SUCCESS'));
                            })
                            .catch((error) => {
                                console.error(error)
                            })
                    }
                }

                return res.success(
                    {
                        "language": req.headers['accept-language'],
                    },
                    req.__('OTP_SEND_SUCCESS')
                );

            } else {
                return res.warn({}, req.__('GENERAL_ERROR'));
            }

        } catch (err) {
            return next(err)
        }
    }


    async forgotresendOtp(req, res, next) {
        let {
            email
        } = req.body;
        try {
            let user;
            user = await User.findOne({
                email, isDeleted: false
            })

            if (!user) {
                return res.warn({}, req.__('UNAUTHORIZED'));
            }
            if (user) {
                let otp = generateOtp();
                user.otp = otp;


                let newUser = await user.save()

                if (newUser.email != '') {
                    let emailToSend = newUser.email;
                    //Construct mail body here
                    const msg = {
                        to: emailToSend,
                        from: FROM_MAIL, // Change to your verified sender
                        subject: 'vital Guard: Forgot Password OTP',
                        text: 'Please enter the following OTP to reset your password : ' + user.otp,
                        html: '<strong>Please enter the following OTP to reset your password :' + user.otp + ' </strong>',
                    }

                    //Send Email Here
                    sgMail
                        .send(msg)
                        .then(() => {
                            return res.success(
                                {

                                }, req.__('OTP_SEND_SUCCESS')
                            );
                        })
                        .catch((error) => {
                            console.error(error)
                        })
                }
            } else {
                return res.warn({}, req.__('GENERAL_ERROR'));
            }
        } catch (err) {
            return next(err)
        }
    }

    /**
     * 
     * @param {email,password,deviceToken,deviceType} req 
     * @param {*} res 
     * @param {*} next 
     */
    async signup(req, res, next) {
        let {
            email, phone, password, device_token, device_type, name, deviceId
        } = req.body;


        try {

            let obj = {}

            let checkEmailExists = await User.findOne({
                $or: [{ email: email }, { mobile: phone }]
            });

            if (checkEmailExists && checkEmailExists.emailVerify == false) {
                //Remove the record from the DB here first
                let resDel = await User.deleteOne({ _id: checkEmailExists._id });

                //Add new record here and send response
                let user = new User();
                let otp;
                otp = generateOtp();

                const platform = req.headers['x-Vital-Gaurd-platform'];
                const version = req.headers['x-Vital-Gaurd--platform'];
                user.email = email;
                user.name = name;
                user.mobile = phone;
                user.password = password;
                user.role = 'normal';
                user.otp = otp;
                user.deviceId.push(deviceId);
                user.authTokenIssuedAt = utcDateTime().valueOf();
                user.emailToken = generateResetToken(12);



                if (device_token) {
                    user.deviceToken = device_token;
                    user.deviceType = device_type;
                }

                user = await user.save();

                let emailToSend = user.email;
                let token = user.emailToken;
                obj.email = user.email;

                //Construct mail body here
                const msg = {
                    to: emailToSend,
                    from: FROM_MAIL, // Change to your verified sender
                    subject: 'Vital Guard: Verify Your Login',
                    text: 'Please enter the following OTP to verify your login : ' + user.otp,
                    html: '<strong>Please enter the following OTP to verify your login :' + user.otp + ' </strong>',
                }

                //Send Email Here
                sgMail
                    .send(msg)
                    .then(() => {
                        const userJson = user.toJSON();
                        ['password', 'authTokenIssuedAt', 'otp', 'emailToken', '__v'].forEach(key => delete userJson[key]);
                        userJson.isDefaultLocation = false;
                        return res.success({
                            "language": req.headers['accept-language'],
                            token,
                            user: obj,
                        }, req.__('OTP_SEND_SUCCESS')
                        );
                    })
                    .catch((error) => {
                        console.error(error)
                    })

            } else {
                if (checkEmailExists && checkEmailExists.email) {
                    return res.warn({

                    }, req.__('Email or mobile number already exist'));
                }
            }


            let x = await User.findOne({ $or: [{ email: email }, { mobile: phone }] });
            if (!x) {
                let user = new User();
                let otp = generateOtp();
                // const platform = req.headers['x-neighbour-alert-platform'];
                // const version = req.headers['x-neighbour-alert-version'];
                user.email = email;
                user.name = name;
                user.password = password;
                user.role = 'normal';
                user.mobile = phone;
                user.otp = otp;
                user.deviceId.push(deviceId);
                user.authTokenIssuedAt = utcDateTime().valueOf();
                user.emailToken = generateResetToken(12);


                if (device_token) {
                    user.deviceToken = device_token;
                    user.deviceType = device_type;
                }

                user = await user.save();

                obj.email = user.email;

                let emailToSend = user.email;
                let token = user.emailToken;

                //Construct mail body here
                const msg = {
                    to: emailToSend,
                    from: FROM_MAIL, // Change to your verified sender
                    subject: 'Vital Guard: Verify Your Login',
                    text: 'Please enter the following OTP to verify your login : ' + user.otp,
                    html: '<strong>Please enter the following OTP to verify your login :' + user.otp + ' </strong>',
                }

                //Send Email Here
                sgMail
                    .send(msg)
                    .then(() => {
                        const userJson = user.toJSON();
                        ['password', 'authTokenIssuedAt', 'otp', 'emailToken', '__v'].forEach(key => delete userJson[key]);
                        userJson.isDefaultLocation = false;

                        return res.success({
                            "language": req.headers['accept-language'],
                            token,
                            user: obj

                        }, req.__('OTP_SEND_SUCCESS')
                        );

                    })
                    .catch((error) => {
                        console.error(error)
                    })
            }

        } catch (err) {
            console.log(err);
            return next(err)
        }
    }

    async state_list(req, res, next) {
        //admin.emailToken = generateResetToken();
        try {
            Country.aggregate([
                {
                    $match: { _id: ObjectId('5e134bcc80286b22e44920a0') }  // United States  ID
                },
                {
                    $lookup: {
                        "from": "states",
                        "foreignField": "country_id",
                        "localField": "_id",
                        "as": "statelist"
                    }
                }
            ]).exec((err, result) => {
                if (err) {
                    console.log("error", err)
                }
                if (result) {
                    let statelist = result[0].statelist;
                    return res.success({
                        "language": req.headers['accept-language'],
                        state: statelist
                    });

                }
            });

        } catch (err) {
            console.log(err);
            return next(err)
        }
    }

    async forgotPassword(req, res, next) {
        let {
            email
        } = req.body
        try {
            let user;
            user = await User.findOne({
                email, isDeleted: false
            })
            if (!user) {
                return res.warn({}, req.__('EMAIL_NOT_REGISTER'));
            }

            if (user) {
                if (user.isSuspended) {
                    //account suspended
                    return res.warn({}, 'Your account is not verified by admin');
                }
                //generated unique token and save in user table and send reset link
                //let resetToken = randomString(10);
                // let resetToken = generateResetToken(12)
                let otp = generateOtp();
                //user.resetToken = resetToken;
                user.emailVerify = false;
                // user.mobileVerify = false;
                user.otp = otp;
                user.authTokenIssuedAt = utcDateTime().valueOf();
                await user.save();

                if (user.email != '') {
                    let emailToSend = user.email;
                    //Construct mail body here
                    const msg = {
                        to: emailToSend,
                        from: FROM_MAIL, // Change to your verified sender
                        subject: 'vital Guard: Forgot Password OTP',
                        text: 'Please enter the following OTP to reset your password : ' + user.otp,
                        html: '<strong>Please enter the following OTP to reset your password :' + user.otp + ' </strong>',
                    }

                    //Send Email Here
                    sgMail
                        .send(msg)
                        .then(() => {
                            return res.success(
                                {

                                }, req.__('OTP_SEND_SUCCESS')
                            );

                        })
                        .catch((error) => {
                            console.error(error)
                        })

                    return res.success(
                        {

                        }, req.__('OTP_SEND_SUCCESS')
                    );
                }
            } else {
                //no user found
                return res.warn({}, req.__('EMAIL_NOT_REGISTER'));
            }
        } catch (err) {
            return next(err)
        }
    }

    async resetPassword(req, res, next) {
        let {
            password, email, otp, confirm_password
        } = req.body;
        try {
            const user = await User.findOne({
                email, isDeleted: false
            });

            if (!user) {
                return res.warn({}, req.__('UNAUTHORIZED'));
            }
            if (password != confirm_password) {
                return res.warn({}, req.__('password and confirmpassword not matched '));
            }

            if (user) {
                if (user.otp == otp) {
                    user.password = password;
                    user.emailVerify = true;
                    let email = user.email;

                    let newUser = await user.save();

                    let emailToSend = newUser.email;
                    // Construct mail body here
                    const msg = {
                        to: emailToSend,
                        from: FROM_MAIL, // Change to your verified sender
                        subject: 'Vital Guard: Password Updated',
                        text: 'Password has been Updated',
                        html: '<strong>Password has been Updated</strong>',
                    }

                    //Send Email Here
                    sgMail
                        .send(msg)
                        .then(() => {
                            console.log('Email sent');
                        })
                        .catch((error) => {
                            console.error(error)
                        })
                    return res.success({}, req.__("PASSWORD_CHANGED"));
                }
                else {
                    return res.warn({}, req.__('please enter valid otp '));
                }
            } else {
                return res.warn({}, req.__('GENERAL_ERROR'));
            }

        } catch (err) {
            return next(err)
        }
    }

    async checkValidation(req, res, next) {
        let {
            mobile, email
        } = req.body
        //admin.emailToken = generateResetToken();
        try {
            let user = await Concierge.findOne({ mobile: mobile });
            if (user) {
                return res.warn({}, req.__('MOBILE_NO_EXISTS'))
            } else {
                user = await Concierge.findOne({ email });
                if (user) {
                    return res.warn({}, req.__('EMAIL_EXISTS'))
                } else {
                    return res.success({}, 'Success');
                }
            }
        } catch (err) {
            console.log(err);
            return next(err)
        }
    }

    async testA(req, res, next) {
        sms.sendSms("tter", "sdfdfd", "otp").then((data) => {
        }).catch(error => {
            return res.warn({}, req.__('SMS_NOT_SENT'));
        });
    }

    async rejectPosition(req, res, next) {
        let {
            id
        } = req.body
        //admin.emailToken = generateResetToken();
        try {
            let sale = await Sale.findOne({ _id: id });
            let emailToSend = sale.email;
            if (sale) {
                await Sale.deleteOne({ _id: id });
                mailer
                    .sendMail(
                        'reject-position',
                        'HRMS Compliance requirements',
                        emailToSend,
                        {
                            username: sale.firstName + ' ' + sale.lasttName,
                        }
                    ).then(() => {
                        //return res.success(' ', req.__('INVITATION_EMAIL_SENT')); 
                    })
                    .catch(error => {
                        logError(`Failed to send mail ${email}`);
                        logError(error);
                        //return res.warn(' ', req.__('EMAIL_NOT_SENT'));
                    });
                return res.warn({}, 'Email sent')
            } else {
                return res.warn({}, 'Sale data not available')
            }
        } catch (err) {
            console.log(err);
            return next(err)
        }
    }
}

module.exports = new AuthController();
