const { NumberContext } = require('twilio/lib/rest/pricing/v2/number');

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt');

const UserSchema = new Schema(
    {
        role: {
            type: String,
            default: 'user'    //admin, user, practice, buyinggroup, vendor
        },
        name: {
            type: String,
            //required: true,
            trim: true,
            default: ''
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            //required: true,
        },
        dob: {
            type: Date
        },
        gender: {
            type: String,
            trim: true
        },
        password: {
            type: String,
            //required: true,
        },
        pincode: {
            type: String,
            //required: true,
        },
        Zipcode: {
            type: String,
            //required: true,
        },
        City: {
            type: String,
            //required: true,
        },
        State: {
            type: String,
            //required: true,
        },
        capital: {
            type: String,
            //required: true,
        },
        country: {
            type: String,
            //required: true,
            trim: true,
        },
        image: {
            type: String,
            //required: true,
        },
        avatar: {
            type: String,
            trim: true,
            default: ''
        },
        mobile: {
            type: String,
            trim: true,
            default: ''
            //required: true,
        },
        address: {
            type: String,
            trim: true,
            default: ''
            //required: true,
        },
        contact_id: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        familyContactsId: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        emergencyContactsId: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        isDeleted: {
            type: Boolean,
            default: false
        },
        isSuspended: {
            type: Boolean,
            default: false
        },
        isNotification: {
            type: Boolean,
            default: true,
        },
        deviceToken: {
            type: String,
            trim: true
        },
        deviceType: {
            type: String,
            trim: true
        },
        deviceId: [{
            type: String,
        }],
        emailVerify: {
            type: Boolean,
            default: false
        },
        otp: {
            type: String,
            default: ""
        },
        status: {
            type: Boolean,
            default: true
        },
        subscribe: {
            type: Boolean,
            default: false
        },
        isLocation: {
            type: Boolean,
            default: true
        },
        loc: {
            type: { type: String, default: 'Point' },
            coordinates: [{
                type: Number
            }]
        },

        authTokenIssuedAt: Number,
        emailToken: {
            type: String, default: ''
        },
        resetToken: {//for forgot password
            type: String,
            default: ""
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

UserSchema.pre('save', async function (next) {
    const user = this;

    if (!user.isModified('password')) return next();
    try {
        const saltRounds = parseInt(process.env.BCRYPT_ITERATIONS, 10) || 10;
        user.password = await bcrypt.hash(user.password, saltRounds);
        next();
    } catch (e) {
        next(e);
    }
});

UserSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (e) {
        return false;
    }
};

module.exports = mongoose.model('User', UserSchema);