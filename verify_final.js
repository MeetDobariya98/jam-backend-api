require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Final Verification Test...');

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: 'Sync Final Test',
  text: 'If you see this, the system is fully operational!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('RESULT: FAIL');
    console.log('ERROR:', error.message);
  } else {
    console.log('RESULT: SUCCESS');
    console.log('INFO:', info.response);
  }
  process.exit();
});
