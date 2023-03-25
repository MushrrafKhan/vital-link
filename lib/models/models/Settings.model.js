const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const AdminSettings = new Schema(
    {
        androidAppVersion: {
            type: String,
            trim: true,
            required: true,
        },
        iosAppVersion: {
            type: String,
            trim: true,
            required: true,
        },
        androidForceUpdate: {
            type: Boolean,
            required: true,
            default: true
        },
        iosForceUpdate: {
            type: Boolean,
            required: true,
            default: true
        },

        radius: {
            type: Number,
            required: true
        },
        alert_live_number: {
            type: Number,
           
        },
        hours_alert_delete:{
            type:Number,
            
        },
        android_subscription_id:{
            type:String,
            required:true
        },
        android_subscription_name:{
            type:String,
            required:true
        }, 
        android_subscription_amount:{
            type:Number,
            required:true
        }, 
        apple_subscription_id:{
            type:String,
            required:true
        },
        apple_subscription_name:{
            type:String,
            required:true
        }, 
        apple_subscription_amount:{
            type:Number,
            required:true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated',
        },
        id: false,
        toJSON: {
            getters: true,
        },
        toObject: {
            getters: true,
        },
    }
);

module.exports = mongoose.model('AdminSettings', AdminSettings);