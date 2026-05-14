const alertsService = require('./alerts.service');
const { getOrganizationId } = require('../../utils/orgId');

const alertsController = {
    getAlertRules: async (req, res) => {
        try {
            const { type } = req.query;
            const organizationId = await getOrganizationId(req);
            const rules = await alertsService.getAlertRules(organizationId, type);
            res.json(rules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    createAlertRule: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const rule = await alertsService.createAlertRule({
                ...req.body,
                organizationId
            });
            res.status(201).json(rule);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    updateAlertRule: async (req, res) => {
        try {
            const rule = await alertsService.updateAlertRule(req.params.id, req.body);
            res.json(rule);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    deleteAlertRule: async (req, res) => {
        try {
            await alertsService.deleteAlertRule(req.params.id);
            res.json({ message: 'Alert rule deleted' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getSettings: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const settings = await alertsService.getAlertSettings(organizationId);
            res.json(settings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateSettings: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const settings = await alertsService.updateAlertSettings(organizationId, req.body);
            res.json(settings);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

module.exports = alertsController;
