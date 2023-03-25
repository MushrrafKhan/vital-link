const { models: { User, Alert, AdminNotification, Static } } = require('../../../../lib/models');
const path = require('path');
//const {showDate, uploadImageLocal} = require('../../../../lib/util');
const { showDate, uploadImageAPI } = require('../../../../lib/util');
var FCM = require('fcm-node');
const serverKey = 'AAAA2Gxvv-I:APA91bFOQZIO7Gsai-O_enVd9h9tGBSecG0VU6uYAgk2KHmdwxucTP7tuKrC3NickIc9sPLt4knOzJEwup-9PUwIyCc6uOtCM7ax77a-J-_7YmyFwFRpTxvDDow9Q5XUJmWzw4MCP5Wt'; //put your server key here



const uploadshow = `${process.env.SITE_URL}/uploads/`;
const upload = path.join(__dirname, '../../static/uploads');
const fs = require('fs');
const multer = require('multer');
const multiparty = require('multiparty');


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, upload),

    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
})

const handleMultipartData = multer({
    storage: storage,
    limits: { fieldSize: 1000000 * 10 }
}).single('image');


class UserController {
    async listPage(req, res) {
        return res.render('users/list');
    }

    async addUserPage(req, res) {
        return res.render("users/add");
    }

    async editUserPage(req, res) {
        let _id = req.params.id;
        let userdata = await User.findOne({ _id: _id });
        let image = `${process.env.AWS_BASE_URL}${userdata.avatar}`

        // console.log(userdata.name);
        return res.render('users/edit', {
            userdata: userdata, image
        })

    }
    async updateData(req, res) {
        handleMultipartData(req, res, async (err) => {

            if (typeof req.file === 'undefined') {
                let data = req.body;
                let _id = req.params.id;
                let user = await User.findOne({ _id: _id });
                user.name = data.name;
                user.email = data.email;
                await user.save();
                req.flash('success', "User successfully updated");
                return res.redirect('/users');
            } else {
                //console.log(req.file)
                let oldimg = req.file.path;
                let image = await uploadImageAPI(req.file, 'user');
                let data = req.body; 
                let _id = req.params.id;
                let user = await User.findOne({ _id: _id });
                user.name = data.name;
                user.email = data.email;
                user.avatar = image.key;
                await user.save();
                fs.unlink(oldimg , function (err) {
                    if (err) throw err;
                    console.log('File deleted!');
                });
                req.flash('success', "User successfully updated");
                return res.redirect('/users');
            }
        })



    }

    async addUserSave(req, res, next) {

        handleMultipartData(req, res, async (err) => {
            
            const exist = await User.find({ email: req.body.email })
            if (exist.length > 0) {
                req.flash('error', "User already exist");
                return res.redirect('/users');
            }
            else {

              //  console.log(req.file);

                let oldimg = req.file.path;
                let image = await uploadImageAPI(req.file, 'user');
                // console.log(req.file);
                let data = req.body;
                let user = {};
                user.name = data.name;
                user.email = data.email;
                user.password = data.password;
                user.avatar = image.key;
                user.emailVerify = false;
                let saveuser = new User(user);
                await saveuser.save();
                fs.unlink(oldimg, function (err) {
                    if (err) throw err;
                    console.log('File deleted!');
                });
                req.flash('success', req.__('USER_ADD_SUCCESS'));
                return res.redirect('/users');
            }
        })
    }

    async list(req, res) {

        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            // name:{$ne:null},
            email: { $ne: null },
            isDeleted: false,
        };

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );

            query.$or = [
                { name: searchValue },
                { email: searchValue },
                { countryCode: searchValue },
                { mobile: searchValue },
            ];
        }
        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    name: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    status: sortOrder,
                };
                break;
            default:
                sortCond = { created: sortOrder };
                break;
        }

        const count = await User.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let users = await User.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);
            console.log("====================");


        if (users) {
            users = users.map(user => {
                let actions = '';
                //   actions = `${actions}<a href="/users/edit/${user._id}" title="view"><i class="fas fa-pen"></i></a>`;
                
                actions = `${actions}<a href="/users/view/${user._id}" title="view"><i class="fas fa-eye"></i></a>`;
                if (user.isSuspended) {
                    actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=false&" title="Mark Active"> <i class="fa fa-ban"></i> </a>`;
                } else {
                    actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=true&" title="Mark Suspended"> <i class="fa fa-check"></i> </a>`;
                }
                
                 actions = `${actions}<a class="deleteItem" href="/users/delete/${user._id}" title="Delete"> <i class="fas fa-trash"></i> </a>`;
                //  if (user.is_paid) {
                //     actions = `${actions}<a class="statusChange" href="/users/update-subscription?id=${user._id}&status=false&" title=" Click to mark Free"> <i class="fa fa-check"></i> </a>`;
                    
                // } else {
                //     actions = `${actions}<a class="statusChange" href="/users/update-subscription?id=${user._id}&status=true&" title="Click to mark Paid"> <i class="fa fa-ban"></i> </a>`;
                // }
                 

                return {
                    0: (skip += 1),
                    1: user.name,
                    2: user.email,
                    3: user.isSuspended == true ? '<span class="badge label-table badge-danger">Suspended</span>' : '<span class="badge label-table badge-success">Active</span>',
                    4: actions,
                    // 5: user.is_paid == true ? '<span class="badge label-table badge-success">Paid</span>'  : '<span class="badge label-table badge-danger">Free</span>',

                };
            });
        }
        response.data = users;
        return res.send(response);
    }

    async view(req, res) {
        let user = await User.findOne({
            _id: req.params.id,
            isDeleted: false
        }).lean();

        //console.log(user);

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }

        return res.render('users/view', {
            user, url: `${process.env.AWS_BASE_URL}`
        });
    }

    async updateStatus(req, res) {
        const { id, status } = req.query;
        let user = await User.findOne({
            _id: id,
            // status: false
        });

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }

        console.log(status);
        console.log('=========================================');
        user.isSuspended = status;
        await user.save();

        req.flash('success', req.__('USER_STATUS_UPDATED'));
        return res.redirect('/users');
    }


    // async updateSubscription(req, res) {
    //     const { id, status } = req.query;
    //     let userr = await User.findOne({
    //         _id: id,
    //         // status: false
    //     });

    //     if (!userr) {
    //         req.flash('error', req.__('USER_NOT_EXISTS'));
    //         return res.redirect('/users');
    //     }

    //     console.log(status);
    //     console.log('+++++++++++++++++++++++++++++++++');
    //     userr.is_paid = status;
    //     await userr.save();

    //     req.flash('success', req.__('USER_STATUS_UPDATED'));
    //     return res.redirect('/users');
    // }

    async uploadProfilePic(req, res) {

        let userId = req.params.id;
        let form = new multiparty.Form();

        form.parse(req, async function (err, fields, file) {

            let fileName = file['file'][0].originalFilename;

            let extension = fileName.substr((fileName.lastIndexOf('.') + 1));
            fileName = userId + '.' + extension;

            let tmp_path = file['file'][0].path;
            let target_path = `${process.env.UPLOAD_IMAGE_PATH}` + 'users/' + fileName;
            try {

                let image = await uploadImageLocal(tmp_path, target_path, fileName);

                let user = await User.findOne({
                    _id: userId,
                    isDeleted: false
                });
                user.avatar = fileName;
                await user.save();
                req.flash('success', "Profile image successfully uploaded!");
                return res.success({ 'status': 'success', 'image': image });

            } catch (err) {
                return res.success({ 'status': 'fail' });
            }

        });

    }

    async delete(req, res) {
        const user = await User.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        console.log(user);

        if (!user) {
            req.flash('error', req.__('USER_NOT_EXISTS'));
            return res.redirect('/users');
        }
        // if(user.length>0){
        //     const user = await Alert.findOne({

        //     });
        // }
         
            user.isDeleted = true;
            await user.save();
    
            req.flash('success', req.__('USER_DELETE_SUCCESS'));
            return res.redirect('/users');
        
         }

    //     user.isDeleted = true;
    //     await user.save();

    //     req.flash('success', req.__('USER_DELETE_SUCCESS'));
    //     return res.redirect('/users');
    // }

    async isEmailExists(req, res) {
        const { email } = req.body;

        const count = await User.countDocuments({ email: email });

        return res.success(count);
    }

    async broadcast(req, res) {

        const users = await User.find({})


        res.render('broadcast', { user: users });



    }



    async broadcast_push(req, res) {
        let selectedUser = [];
        const check = req.body.all_user;
        const msg = req.body.message
        selectedUser = req.body.users;
       
      
       
        let fcmToken = [];
        if (check == "true") { 
            let users = await User.find({ isDeleted: false }).select("_id deviceToken")
            users.forEach((detail, i) => {
                fcmToken = fcmToken.concat(detail.deviceToken);
            })

            await Promise.all(users.map(async (i)=>{
                let notification = {};
                notification.notification_title = "Message from Admin";
                notification.description =msg;
                notification.alertCreatedBy = i;
                let notify = new AdminNotification(notification);
                await notify.save();
            }))
            
        }else {
           
            if(Array.isArray( selectedUser)==true){
                console.log("hisir multiple")

            fcmToken = await Promise.all(selectedUser.map(async (i) => {
                let data = await User.find({_id:i}).select("_id deviceToken")
                return data[0].deviceToken;
            }));

            console.log(fcmToken)

            await Promise.all(selectedUser.map(async (i)=>{
              
                let notification = {};
                notification.notification_title = "Message from Admin";
                notification.description =msg;
                notification.alertCreatedBy = i;
                let notify = new AdminNotification(notification);
                await notify.save();
            }))

        }else{
            console.log("Single multiple")

            
       
        let data = await User.find({ _id: selectedUser }).select("_id deviceToken")
        console.log(data);

        var fcm = new FCM(serverKey);
        var token = data[0].deviceToken;
        console.log(token);

        var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
            to: token,
            notification: {
                title: `Message from Admin`,
                body: msg
            },
            data: {  //you can send only notification or only data(or include both)
                screen: `home`,
            }
        };

        fcm.send(message, async function (err, response) {
            if (err) {
                console.log(err);
            } else {
                console.log("Successfully sent with response: ", response);
            
                let notification = {};
                notification.notification_title = "Message from Admin";
                notification.description =msg;
                notification.alertCreatedBy = selectedUser;
                let notify = new AdminNotification(notification);
                await notify.save();

                req.flash('success', 'Request send successfully')
               return res.redirect('/users/broadcast');
            }
        })
            
        }
            
        }

        var fcm = new FCM(serverKey);
        var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
            registration_ids: fcmToken,
            notification: {
                title: 'Message from Admin',
                body: msg
            },
            data: {  //you can send only notification or only data(or include both)
                screen: 'home',
            }
        };

        fcm.send(message, async function (err, response) {
            if (err) {
                console.log(err);
            } else {
                console.log("Successfully sent with response: ", response);
            }
        })

        req.flash('success', 'Request send successfully')
        res.redirect('/users/broadcast');

    } 



    async notificationPage(req, res) {
        res.render('users/notification');
    }

    async notificationList(req, res) {


        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            //    // name:{$ne:null},
            //     email:{$ne:null},
            //     isDeleted: false,
        };

        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );

            query.$or = [
                { name: searchValue },
                { email: searchValue },
                { countryCode: searchValue },
                { mobile: searchValue },
            ];
        }
        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    name: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    status: sortOrder,
                };
                break;
            default:
                sortCond = { created: sortOrder };
                break;
        }

        const count = await AdminNotification.countDocuments({});
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let users = await AdminNotification.find().populate({ 'path': 'alertCreatedBy', 'model': 'User' })
            .sort(sortCond)
            .limit(limit);


        if (users) {
            users = users.map(user => {
                let actions = '';
                  actions = `${actions}<a href="/users/edit/${user._id}" title="view"><i class="fas fa-pen"></i></a>`;

                actions = `${actions}<a href="/users/view/${user._id}" title="view"><i class="fas fa-eye"></i></a>`;
                if (user.status) {
                    actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=false&" title="Activate"> <i class="fa fa-check"></i> </a>`;
                } else {
                    actions = `${actions}<a class="statusChange" href="/users/update-status?id=${user._id}&status=true&" title="Inactivate"> <i class="fa fa-ban"></i> </a>`;
                }
                actions = `${actions}<a class="deleteItem" href="/users/delete/${user._id}" title="Delete"> <i class="fas fa-trash"></i> </a>`;

                return {
                    0: (skip += 1),
                    1: user.alertCreatedBy.email,
                    2: user.notification_title,
                    3: user.description,

                };
            });
        }
        response.data = users;
        return res.send(response);

    }

    async privacy_policyPage(req, res) {
        let cms = await Static.findOne({ slug: "privacy_policy" });
        const content = cms.content
        const name = cms.page_name;
        const id = cms._id;
        res.render('static', { name, content, id });
    }

    async termsAndconditionPage(req, res) {
        console.log("privacy")
        let cms = await Static.findOne({ slug: "terms_conditions" });
        const content = cms.content
        const name = cms.page_name;
        const id = cms._id;
        res.render('static', { name, content, id });
    }

    async Aboutus(req, res) {
        let cms = await Static.findOne({slug:"about_us"});
         const content =cms.content
        const name = cms.page_name;
        const id = cms._id;
        res.render('static',{name,content,id} );
    } 

    async Support(req, res) {
        let cms = await Static.findOne({slug:"support_center"});
         const content =cms.content
        const name = cms.page_name;
        const id = cms._id;
        res.render('static',{name,content,id} );
    } 

   

    async Static(req, res) {
        const id = req.query.id;
        // const content = req.body.content;
        let originalString = req.body.content;
        //let strippedString = originalString.replace(/(<([^>]+)>)/gi, "");
        const cms = await Static.findOneAndUpdate({ _id: id }, { content: originalString }, { new: true });

        if (cms.slug == "terms_conditions") {
            req.flash('success', "Successfully updated")
            res.redirect("/users/terms_conditions")
        }

        else if (cms.slug == "privacy_policy") {
            req.flash('success', "Successfully updated")
            res.redirect("/users/privacy_policy")
        }

        else if(cms.slug == "about_us"){
            req.flash('success',"Successfully updated")
            res.redirect("/users/about_us")         
        } 

        else if(cms.slug == "support_center"){
            req.flash('success',"Successfully updated")
            res.redirect("/users/support_center")         
        } 
    }
    


}

module.exports = new UserController();