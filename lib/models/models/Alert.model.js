const mongoose = require('mongoose');
   const Schema = mongoose.Schema;

const AlertSchema = new Schema(
    {
        alertType:{
            type: Schema.Types.ObjectId,
            ref: 'AlertType'      
        },
        alert_msg: {
            type: String,
            //required: true,
        },
        confirmedBy:{
            type:Number,
            default: 0,
        },
        image:{
            type:Array,
        },
        user_id:{
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        address:{
            type:String
        },
        status: {
            type: Boolean,
            default: true,
        },
        isConfirmed: {
            type: Boolean,
            default: false,
        },
        isReported: {
            type: Boolean,
            default: false,
        },
        distance: {
            type: Number,
        },
        lat: {
            type: Number,
        },
        lng: {
            type: Number,
        },
        live:{
            type: Boolean
        },
        isUser:{
            type: Boolean
        },
        loc: {
            type: { type: String, default: 'Point' },
            coordinates: [{
                type: Number
            }]
        },
        alertLocation:{
            type: { type: String, default: 'Point' },
            coordinates: [{
                type: Number
            }]
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
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

module.exports = mongoose.model('Alert', AlertSchema);
