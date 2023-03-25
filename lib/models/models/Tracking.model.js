const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const TrackingSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        dataType: {
            type: String
        },
        dataTypeUnit: {
            type: String,
            required: true
        },
        dataTypeValue: {
            type: String,
            required: true
        },
        dataTypeValueTimeStamp: {
            type: String,
            required: true
        },
        dataFormat:{
            type: String
        },
        // date:{
        //     type:Date,
        //     default:Date.now(),
        // }
        
    },
    { timestamps: { createdAt: 'created_at', updatedAt:'updated_at' }}

);

module.exports = mongoose.model('Tracking', TrackingSchema);