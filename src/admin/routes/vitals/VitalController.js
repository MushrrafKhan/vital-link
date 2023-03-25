const {
    models: { User, Route, AdminSettings, Payment, VitalRange },
} = require('../../../../lib/models');
const _ = require('lodash');
const { uploadImage, generateResetToken } = require('../../../../lib/util');
const multiparty = require('multiparty');
var url = require('url');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class VitalController {

    async listPage(req, res) {
        return res.render('vitals/list');
    }

    async list(req, res) {
        let reqData = req.query;
        let columnNo = parseInt(reqData.order[0].column);
        let sortOrder = reqData.order[0].dir === 'desc' ? -1 : 1;
        let query = {
            isActive: true,
        };
        if (reqData.search.value) {
            const searchValue = new RegExp(
                reqData.search.value
                    .split(' ')
                    .filter(val => val)
                    .map(value => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
                    .join('|'),
                'i'
            );
            query.$or = [{ dataType: searchValue }];
        }
        let sortCond = { created: sortOrder };
        let response = {};
        switch (columnNo) {
            case 1:
                sortCond = {
                    name: sortOrder,
                };
                break;
            case 5:
                sortCond = {
                    isSuspended: sortOrder,
                };
                break;
            default:
                sortCond = { created: sortOrder };
                break;
        }
        const count = await VitalRange.countDocuments(query);
        response.draw = 0;
        if (reqData.draw) {
            response.draw = parseInt(reqData.draw) + 1;
        }
        response.recordsTotal = count;
        response.recordsFiltered = count;
        let skip = parseInt(reqData.start);
        let limit = parseInt(reqData.length);
        let vitals = await VitalRange.find(query)
            .sort(sortCond)
            .skip(skip)
            .limit(limit);
        if (vitals) {
            vitals = vitals.map(i => {
                let actions = '';
                actions = `${actions}<a href="/vitals/view/${i._id}" title="view vital details"><i class="fas fa-eye"></i></a> `;
                actions = `${actions}<a href="/vitals/edit-vital-page/${i._id}" title="edit"><i class="fas fa-pen"></i></a>`;
                return {
                    0: (skip += 1),
                    1: i.dataType,
                    2: i.dataTypeUnit,
                    3: i.dataTypeValue,
                    4: actions
                };
            });
        }
        response.data = vitals;
        return res.send(response);
    }

    async addVitalPage(req, res) {
        return res.render("vitals/add");
    }

    async addVital(req, res, next) {
        try {
            let { dataType, dataTypeUnit, dataTypeValue } = req.body;
            const vitalExist = await VitalRange.findOne({ dataType: dataType });
            if (vitalExist) {
                req.flash('error', "User already exist");
                return res.redirect('/vital');
            }
            else {
                let vital = new VitalRange();
                vital.dataType = dataType;
                vital.dataTypeUnit = dataTypeUnit;
                vital.dataTypeValue = dataTypeValue;
                await vital.save();
                req.flash('success', req.__('Vital added successfully'));
                return res.redirect('/vitals');
            }
        } catch (e) {
            return next(e);
        }
    }

    async view(req, res) {
        let id = req.params.id;
        let vital = await VitalRange.findOne({ _id: id })
        return res.render('vitals/view', {
            vital
        });
    }

    async editVitalPage(req, res) {
        let _id = req.params.id;
        let vital = await VitalRange.findOne({ _id: _id });
        return res.render('vitals/edit', {
            vital
        });
    }

    async editVital(req, res) {
        try {
            let { dataTypeValue } = req.body;
            let _id = req.params.id;
            const vital = await VitalRange.findOne({ _id });
            if (vital) {
                vital.dataTypeValue = dataTypeValue;
                await vital.save();
                req.flash('success', req.__('Vital range updated'));
                return res.redirect('/vitals');
            }
            else {
                req.flash('error', "User already exist");
                return res.redirect('/vital');
            }
        } catch (e) {
            return next(e);
        }
    }

    async validateDataType(req, res) {
        const { dataType } = req.body;
        const count = await VitalRange.countDocuments({ dataType });
        return res.success(count);
    }

}
module.exports = new VitalController();

