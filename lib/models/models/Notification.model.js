const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const NotificationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        fetchedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        alertId:{
            type: Schema.Types.ObjectId,
            ref: 'Alert'
        },
        alertType:{
            type: Schema.Types.ObjectId,
            // required: true,
            ref: 'AlertType'
        },
        createdBy:{
            type:String
        },
        confirmedBy:{
            type:Number
        },
        location:{
            type: Object
        },
        address: {
            type: String,
        },
        distance: {
            type: Number
        },
        // alert_type: {
        //     type: String
        // },
        alert_msg: {
            type: String
        },
        title: {
            type: String
        },
        dataFormat:{
            type: String
        },
        status: {
            type: Boolean,
            default:false
        },
        date:{
            type:Date,
            default:Date.now(),
            
        },
        live:{
            type: Boolean
        },
        isUser:{
            type: Boolean
        },
        isConfirmed: {
            type: Boolean,
            default: false,
        },
        isReported: {
            type: Boolean,
            default: false,
        },
        image: {
            type: Array,
            trim: true,
            // default: 'profile/location.png'
        },
        alertLocation:{
            type: { type: String, default: 'Point' },
            coordinates: [{
                type: Number
            }]
        },
        lat:{
            type: Number
        },
        lng:{
            type: Number
        }
    },
    {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated'
        },
        id: false,
        toJSON: {
            getters: true
        },
        toObject: {
            getters: true
        },
    }

);

module.exports = mongoose.model('Notification', NotificationSchema);
