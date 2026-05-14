const authService = require('./auth.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { registerSchema, loginSchema } = require('./auth.validation');

const register = async (req, res, next) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const result = await authService.register(validatedData);
        return successResponse(res, result, 'User registered successfully', 201);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const result = await authService.login(email, password);
        return successResponse(res, result, 'Login successful');
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        await authService.logout(req.user.employeeId);
        return successResponse(res, null, 'Logout successful');
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await authService.getMe(req.user.userId);
        return successResponse(res, user, 'User profile retrieved');
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const result = await authService.updateProfile(req.user.userId, req.body);
        return successResponse(res, result, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user.userId, currentPassword, newPassword);
        return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.forgotPassword(email);
        return successResponse(res, null, 'If an account exists, a reset link will be sent.');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword
};
