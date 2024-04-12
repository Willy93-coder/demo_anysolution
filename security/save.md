/_ eslint-disable linebreak-style _/
/_ eslint-disable no-undef _/
/_ eslint-disable linebreak-style _/
const express = require('express');
const OAuth2 = require('./oauth2').OAuth2;
const config = require('./config');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const port = 80;
const axios = require('axios');

const { LocalStorage } = require('node-localstorage');
const { log } = require('console');
const localStorage = new LocalStorage('./scratch');

const serverURL = 'http://localhost:81';

access_token = '';

// Express configuration
const app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
session({
secret: 'skjghskdjfhbqigohqdiouk',
resave: false,
saveUninitialized: true,
})
);

// Config data from config.js file
const client_id = config.client_id;
const client_secret = config.client_secret;
const idmURL = config.idmURL;
const response_type = config.response_type;
const callbackURL = config.callbackURL;

// Creates oauth library object with the config data
const oa = new OAuth2(
client_id,
client_secret,
idmURL,
'/oauth2/authorize',
'/oauth2/token',
callbackURL
);

// Handles requests to the main page
app.get('/', function(req, res) {
console.log(req.session.access_token);
if (!req.session.access_token) {
res.send(
'Oauth2 IDM Demo.<br><br><button onclick=\'window.location.href="/auth"\'>Log in with Keyrock Account</button><br><br><button onclick=\'window.location.href="/authJWT"\'>Log in with Keyrock Account and JWT</button>'
);
} else {
res.send(
'Successfully authenticated. <br><br> Your oauth access_token: ' +
req.session.access_token +
'<br><br><button onclick=\'window.location.href="/home"\'>Get my user info</button>'
);
}
});

app.get('/test_localstorage', function(req, res) {
// Set a test item in local storage
localStorage.setItem('test_item', 'test_value');

    // Retrieve the test item
    const retrievedItem = localStorage.getItem('test_item');

    // Check if the retrieved item matches the expected value
    if (retrievedItem === 'test_value') {
    	res.send('Local storage is working properly');
    } else {
    	res.send('Local storage test failed');
    }

});

app.get('/login', function(req, res) {
oa.getOAuthAccessToken(req.query.code).then((results) => {
access_token = results.access_token;
req.session.access_token = results.access_token;

    	// Set the access token as a cookie
    	res.cookie('access_token', access_token, {
    		maxAge: 900000,
    		httpOnly: true,
    	});

    	// Redirect the user back to the main page
    	res.redirect('/');

    	sendCookieToServer(access_token);
    });

});

axios
.get(serverURL, {
headers: {
Cookie: `access_token=${access_token}`, // Include the access token as a cookie in the request headers
},
})
.then((response) => {
// Handle the server's response here
console.log(response.data);
})
.catch((error) => {
// Handle errors here
console.error('Error sending cookie to server:', error);
});

app.get('/auth', function(req, res) {
const path = oa.getAuthorizeUrl(response_type);
res.redirect(path);
});

app.get('/authJWT', function(req, res) {
const path = oa.getAuthorizeUrlJWT(response_type);
res.redirect(path);
});

app.get('/home', function(req, res) {
res.send(`<html> <head> <title>Home Demo</title> </head> <body> <h1>Home Demo</h1> <button onclick="window.location.href='/user_info'">User Info</button> <button onclick="window.location.href='/permissions'">Permissions</button> </body> </html>`);
});

app.get('/user_info', function(req, res) {
const url = config.idmURL + '/user';

    // Retrieve access token from cookie
    const accessToken = req.cookies.access_token;

    if (accessToken) {
    	// Use the access token to retrieve user information from Keyrock
    	oa.get(url, accessToken)
    		.then((response) => {
    			const user = JSON.parse(response);

    			//Log user roles
    			console.log('User roles: ', user.roles);

    			// Check if the user has the required role for accessing user info
    			if (accessToken) {
    				// If the user has the 'Provider' role, provide access to user info
    				res.send(
    					'Welcome ' +
    						user.displayName +
    						'<br> Your email address is ' +
    						user.email +
    						'<br><br><button onclick=\'window.location.href="/logout"\'>Log out</button>'
    				);
    			} else {
    				// If the user does not have the required role, deny access
    				res.status(403).send('Access Forbidden: Insufficient Permissions');
    			}
    		})
    		.catch((error) => {
    			console.error('Error retrieving user information:', error);
    			res.status(500).send('Internal Server Error');
    		});
    } else {
    	res.status(401).send('Unauthorized: Access Token not found in cookie');
    }

});

app.get('/logout', function(req, res) {
req.session.access_token = undefined;
// Remove access_token from localStorage on client-side
res.send(
'<script>localStorage.removeItem("access_token"); window.location.href="/";</script>'
);
});

app.set('port', port);

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListeningServer);

function onError(error) {
if (error.syscall !== 'listen') {
throw error;
}
const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
switch (error.code) {
case 'EACCES':
console.error(bind + ' requires elevated privileges');
process.exit(1);
break;
case 'EADDRINUSE':
console.error(bind + ' is already in use');
process.exit(1);
break;
default:
throw error;
}
}

function sendCookieToServer(access_token) {
axios
.post(serverURL, {
headers: {
Cookie: `access_token=${access_token}`, // Include the access token as a cookie in the request headers
},
})
.then((response) => {
// Handle the server's response here
console.log(response.data);
})
.catch((error) => {
// Handle errors here
console.error('Error sending cookie to server:', error);
});
}

function onListeningServer() {
const addr = server.address();
const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
console.log('Listening on ' + bind);
}
