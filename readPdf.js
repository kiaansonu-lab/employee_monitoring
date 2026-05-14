const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('📄 BACKEND PRODUCT REQUIREMENT DOCUMENT (PRD).pdf');

const parser = new pdf.PDFParse();

parser.parse(dataBuffer).then(function (data) {
    fs.writeFileSync('PRD.txt', data.text);
    console.log('Successfully extracted text to PRD.txt');
}).catch(function (err) {
    console.error('Error parsing PDF:', err);
});
