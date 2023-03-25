const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const ConfirmSchema = new Schema(
    {
        created_userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        alertId:{
            type: Schema.Types.ObjectId,
            ref: 'Alert'
        },
        confirmedBy:{
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        date:{
            type:Date,
            default:Date.now(),
        }
    },
    

);

module.exports = mongoose.model('Confirm', ConfirmSchema);
