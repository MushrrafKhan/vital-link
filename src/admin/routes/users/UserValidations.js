const { Joi } = require('../../util/validations');

const requireId = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
});

const updateStatus = Joi.object().keys({
    id: Joi.objectId()
        .valid()
        .required(),
    status: Joi.boolean().required(),
});

// const updateSubscription = Joi.object().keys({
//     id: Joi.objectId()
//         .valid()
//         .required(),
//     status: Joi.boolean().required(),
// });

module.exports = {
    updateStatus,
    requireId,
    // updateSubscription,
};
