const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const ReportSchema = new Schema(
    {
        created_userId: {
            type: Schema.Types.ObjectId,
            ref: 'Alert'
        },
        alertId:{
            type: Schema.Types.ObjectId,
            ref: 'Alert'
        },
        reportedBy:{
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        date:{
            type:Date,
            default:Date.now(),
        }
    },

);

module.exports = mongoose.model('Report', ReportSchema);
