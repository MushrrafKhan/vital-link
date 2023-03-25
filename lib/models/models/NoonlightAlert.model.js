const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const NoonlightAlertSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        alertId: {
            type: String,
        },
        status: {
            type: String
        },
        ownerId: {
            type: String,

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

module.exports = mongoose.model('NoonlightAlert', NoonlightAlertSchema);