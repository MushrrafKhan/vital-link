const {
    models: {AdminSettings}
} = require('../../../../lib/models');

class SettingsController {

    async settingsPage(req, res) {
        let setting = await AdminSettings.findOne({});
        return res.render('setting', {setting});
    }

    async settingsUpdate(req, res) {       
        const {
            androidAppVersion,
            androidForceUpdate,
            iosAppVersion,
            iosForceUpdate,
            radius,
            alert_live_number,
            hours_alert_delete ,   
        } = req.body;


        console.log(req.body);
        
        await AdminSettings.updateMany(
            {},
            {
                $set: {
                    androidAppVersion,
                    androidForceUpdate,
                    iosAppVersion,
                    iosForceUpdate,
                    radius,
                    alert_live_number,
                    hours_alert_delete,
                },
            }
        );
        req.flash('success', req.__('SETTINGS_UPDATE_SUCCESS'));
        return res.redirect('/settings');
    }
}

module.exports = new SettingsController();


