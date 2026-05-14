const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
    try {
        console.log('Testing image upload to /api/screenshots...');
        
        // 1. Create a dummy test image (1x1 pixel PNG)
        const testImagePath = path.join(__dirname, 'test_image.png');
        const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        fs.writeFileSync(testImagePath, buffer);

        // 2. Prepare form data
        const form = new FormData();
        form.append('employeeId', 'test-emp-123'); // Assume this doesn't strictly foreign-key check if auth is bypassed?
        form.append('productivity', 'PRODUCTIVE');
        form.append('image', fs.createReadStream(testImagePath));

        // Note: we need to handle authentication if the endpoint is protected by authMiddleware.
        // Let's check if we can get a token or bypass.
    } catch (e) {
        console.error(e);
    }
}
testUpload();
