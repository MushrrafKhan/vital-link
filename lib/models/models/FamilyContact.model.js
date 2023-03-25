const mongoose = require('mongoose'),
    Schema = mongoose.Schema

const FamilyContactSchema = new Schema(
    {

        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            //required: true,
        },

        contact: {
            type: String,
            trim: true,
            default: ''
        },

        address: {
            type: String,
            trim: true,
            default: ''
        },

        name: {
            type: String,
            trim: true,
            default: ''
        },


        avatar: {
            type: String,
            trim: true,
            default: ''
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

module.exports = mongoose.model('FamilyContact', FamilyContactSchema);