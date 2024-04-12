var config = {};

config.idmURL = 'http://www.anysolution.org:3000';
config.client_id = '3d117539-a21c-4db7-a7cb-9097b32832eb';
config.client_secret = '61fd6f92-62d5-407b-a734-93195e610e5c';
config.callbackURL = 'http://localhost/login';

// Depending on Grant Type:
// Authorization Code Grant: code
// Implicit Grant: token
config.response_type = 'code';

module.exports = config;
