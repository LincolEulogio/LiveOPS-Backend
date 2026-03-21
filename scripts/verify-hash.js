const bcrypt = require('bcrypt');
const hash = '$2b$10$TrBGJ1Zh4swxOAkyFcpFBuM2HCEC6oEvcVHVqUidZ8FeYKJo4jMla';
const pass = 'admin';

bcrypt.compare(pass, hash).then(res => {
    console.log(`Match: ${res}`);
});
