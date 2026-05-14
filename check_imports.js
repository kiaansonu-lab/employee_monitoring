const authMiddleware = require('./src/middlewares/auth.middleware');
const roleMiddleware = require('./src/middlewares/role.middleware');
const trackingController = require('./src/modules/tracking/tracking.controller');

console.log('authMiddleware:', typeof authMiddleware);
console.log('roleMiddleware:', typeof roleMiddleware);
console.log('trackingController:', typeof trackingController);
console.log('trackingController.getProfiles:', typeof trackingController.getProfiles);

if (typeof authMiddleware !== 'function') console.error('ERROR: authMiddleware is not a function!');
if (typeof roleMiddleware !== 'function') console.error('ERROR: roleMiddleware is not a function!');
if (!trackingController) console.error('ERROR: trackingController is null or undefined!');
