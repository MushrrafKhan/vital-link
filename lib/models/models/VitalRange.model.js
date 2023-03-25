const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const VitalRangeSchema = new Schema(
    {
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
        isActive: {
            type: Boolean,
            default: true
        }

    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }

);

module.exports = mongoose.model('VitalRange', VitalRangeSchema);