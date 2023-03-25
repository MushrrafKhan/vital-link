const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const HealthSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        dataType:{
            type: String,
            ref: 'Alert'
        },
        dataTypeUnit:{
            type: String,
            required: true,
            ref: 'User'
        },
        dataTypeValueTimeStamp:{
            type:Date,
           
        }
    },
    

);

module.exports = mongoose.model('Health', HealthSchema);
