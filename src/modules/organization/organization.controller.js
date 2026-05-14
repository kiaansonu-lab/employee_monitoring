const organizationService = require('./organization.service');
const { organizationSchema } = require('./organization.validation');

const getOrganization = async (req, res, next) => {
    try {
        const org = await organizationService.getOrganization();
        res.status(200).json({
            success: true,
            data: org
        });
    } catch (error) {
        next(error);
    }
};

const updateOrganization = async (req, res, next) => {
    try {
        const { id } = req.params;
        const validatedData = organizationSchema.parse(req.body);

        const org = await organizationService.updateOrganization(id, validatedData);
        res.status(200).json({
            success: true,
            message: "Organization updated successfully",
            data: org
        });
    } catch (error) {
        next(error);
    }
};

const createOrganization = async (req, res, next) => {
    try {
        const validatedData = organizationSchema.parse(req.body);
        const org = await organizationService.createOrganization(validatedData);
        res.status(201).json({
            success: true,
            message: "Organization created successfully",
            data: org
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrganization,
    updateOrganization,
    createOrganization
};
