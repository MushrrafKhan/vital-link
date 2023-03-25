const mongoose = require('mongoose');
   const Schema = mongoose.Schema;

const AlertTypeSchema = new Schema(
    {
        alert_type:{
            type: String,
               
        },
        image: {
            type: String,
            //required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    }
);



const data = mongoose.model('AlertType', AlertTypeSchema);

module.exports = data;