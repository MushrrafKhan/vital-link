const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const DisalarmSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        timestamps:{
            type: Number
        },
        isDeleted:{
            type: Boolean,
            default: false
        },
        date:{
            type:Date,
            default:new Date(),
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

module.exports = mongoose.model('Disalarm', DisalarmSchema);
