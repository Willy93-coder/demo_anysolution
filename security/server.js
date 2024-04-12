/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
/* eslint-disable linebreak-style */
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
const request = require('request');
const { exec } = require('child_process');
const path = require('path');
const { LocalStorage } = require('node-localstorage');
const { log, error } = require('console');
const { access } = require('fs');
const localStorage = new LocalStorage('./scratch');

const serverURL = 'http://localhost:81';
const keyrockUrl = 'www.anysolution.org:3000';

access_token = '';
my_app_id = '3d117539-a21c-4db7-a7cb-9097b32832eb';
let token = '';

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
const userinfoPath = '/oauth2/userinfo'; // OIDC userinfo endpoint
const tokeninfoPath = '/oauth2/tokeninfo'; // OIDC tokeninfo endpoint

// Creates oauth library object with the config data
const oa = new OAuth2(
	client_id,
	client_secret,
	idmURL,
	'/oauth2/authorize',
	'/oauth2/token',
	callbackURL,
	userinfoPath,
	tokeninfoPath
);

// Function to clear the terminal
function clearTerminal() {
	exec('clear', (error, stdout, stderr) => {
		if (error) {
			console.error(`Error executing clear command: ${error}`);
			return;
		}
		console.log(`Terminal cleared:\n${stdout}`);
	});
}

// Route handler for clearing the terminal
app.get('/clear_terminal', function(req, res) {
	// Call the function to clear the terminal
	clearTerminal();
	// Send a response indicating success
	res.send('Terminal cleared');
});

// Function to refresh the token
function refreshToken() {
	request(
		{
			method: 'POST',
			url: `http://${keyrockUrl}/v1/auth/tokens`,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: 'tavi@email.com',
				password: '1234',
			}),
		},
		function(error, response, body) {
			if (error) {
				console.error('Error refreshing token:', error);
			} else {
				// Assuming the new token is in the X-Subject-Token header
				const newToken = response.headers['x-subject-token'];
				// Update the token variable with the new token
				token = newToken;
			}
		}
	);
}

// Function to start refreshing the token periodically
function startTokenRefresh() {
	// Refresh the token every 2999 seconds (just under 50 minutes)
	setInterval(refreshToken, 1000);
}

// Call the function to start refreshing the token
startTokenRefresh();

// Handles requests to the main page
app.get('/', function(req, res) {
	if (!req.session.access_token) {
		res.send(`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Oauth2 IDM Demo</title>
				<style>
					body {
						background-color: #f4f4f4; /* Light gray background */
						display: flex;
						justify-content: center;
						align-items: center;
						height: 100vh;
						margin: 0;
					}
					.container {
						text-align: center;
					}
					button {
						background-color: #f2f2f2;
                        color: #333;
                        border: 1px solid #ccc;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 20px; /* Add margin for spacing */
					}
					button:hover {
						background-color: #999; /* Darker gray on hover */
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1>Oauth2 IDM Demo</h1>
					<button onclick="window.location.href='/auth'">Log in with Keyrock Account</button>
					<button onclick="window.location.href='/authJWT'">Log in with Keyrock Account and JWT</button>
				</div>
			</body>
			</html>
		`);
	} else {
		res.send(`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Successfully Authenticated</title>
				<style>
					body {
						background-color: #f4f4f4; /* Light gray background */
						display: flex;
						justify-content: center;
						align-items: center;
						height: 100vh;
						margin: 0;
					}
					.container {
						text-align: center;
					}
					button {
						background-color: #f2f2f2;
                        color: #333;
                        border: 1px solid #ccc;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 20px; /* Add margin for spacing */
					}
					button:hover {
						background-color: #999; /* Darker gray on hover */
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1>Successfully authenticated</h1>
					<button onclick="window.location.href='/home'">Go to home page</button>
				</div>
			</body>
			</html>
		`);
	}
});

// app.get('/test_localstorage', function(req, res) {
// 	// Set a test item in local storage
// 	localStorage.setItem('test_item', 'test_value');

// 	// Retrieve the test item
// 	const retrievedItem = localStorage.getItem('test_item');

// 	// Check if the retrieved item matches the expected value
// 	if (retrievedItem === 'test_value') {
// 		res.send('Local storage is working properly');
// 	} else {
// 		res.send('Local storage test failed');
// 	}
// });
// Handle the '/login' route
// Handle the '/login' route
app.get('/login', function(req, res) {
	oa.getOAuthAccessToken(req.query.code)
		.then((results) => {
			const access_token = results.access_token;
			const id_token = results.id_token;

			if (!access_token) {
				return res.status(500).send('Access token not found in response');
			}
			// Store the access token in the session
			req.session.access_token = access_token;

			if (id_token) {
				// Store the id_token in the session or pass it along as needed
				req.session.id_token = id_token;
				// Set the id_token as a cookie or in the local storage as needed
				res.cookie('id_token', id_token, {
					maxAge: 900000,
					httpOnly: true,
				});

				res.cookie('access_token', access_token, {
					maxAge: 900000,
					httpOnly: true,
				});
			} else {
				console.log('ID token not found in response');
			}

			// Redirect the user back to the main page
			res.redirect('/');
		})
		.catch((error) => {
			console.error('Error exchanging authorization code for tokens:', error);
			res.status(500).send('Error exchanging authorization code for tokens');
		})
		.finally(() => {
			// Log the response headers
			console.log('Response Headers:', res.getHeaders());
		});
});

function getTokenInfo() {
	return new Promise((resolve, reject) => {
		request(
			{
				method: 'GET',
				url: `http://${keyrockUrl}/v1/auth/tokens`,
				headers: {
					'X-Auth-token': token,
					'X-Subject-token': token,
				},
			},
			(error, response, body) => {
				if (error) {
					console.error('Error:', error);
					reject(error);
				} else {
					resolve(body);
				}
			}
		);
	});
}

function getAppInfo() {
	getTokenInfo()
		.then((tokenInfo) => {
			console.log('Token Info:', tokenInfo); // Log tokenInfo
			const accessToken = JSON.parse(tokenInfo).access_token;
			console.log('Access Token:', accessToken); // Log accessToken
			request(
				{
					method: 'GET',
					url: `http://${keyrockUrl}/v1/applications`,
					headers: {
						'X-Auth-token': accessToken,
					},
				},
				(error, response, body) => {
					console.log('Status:', response.statusCode);
					console.log('Headers:', JSON.stringify(response.headers));
					console.log('Response:', body);
					res.json({ status: 'success', data: body });
				}
			);
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).send('Internal Server Error');
		});
}

// axios
// 	.get(serverURL, {
// 		headers: {
// 			Cookie: `access_token=${access_token}`, // Include the access token as a cookie in the request headers
// 		},
// 	})
// 	.then((response) => {
// 		// Handle the server's response here
// 	})
// 	.catch((error) => {
// 		// Handle errors here
// 		console.error('Error sending cookie to server:', error);
// 	});

app.get('/auth', function(req, res) {
	const path = oa.getAuthorizeUrl(response_type);
	// Log response headers before redirection
	console.log('Response Headers before redirection:', res.getHeaders());
	res.redirect(path);
});

app.get('/authJWT', function(req, res) {
	const path = oa.getAuthorizeUrlJWT(response_type);
	// Log response headers before redirection
	console.log('Response Headers before redirection:', res.getHeaders());
	res.redirect(path);
});

app.get('/test_endpoint', function(req, res) {
	// Call the getTokenInfo function and send its result as the response
	getTokenInfo()
		.then((tokenInfo) => {
			res.send(tokenInfo);
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).send('Internal Server Error');
		});
});

app.get('/home', function(req, res) {
	res.send(`
        <html>
            <head>
                <title>Home Demo</title>
                <style>
                    body {
                        background-color: #f2f2f2;
												display: flex;
												flex-direction: column;
												justify-content: center;
												align-items: center;
												height: 100vh;
                        font-family: Arial, sans-serif;
                        text-align: center; /* Center align content */
                    }
                    h1 {
                        color: #333;
                    }
                    button {
                        background-color: #f2f2f2;
                        color: #333;
                        border: 1px solid #ccc;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 20px; /* Add margin for spacing */
                    }
                </style>
            </head>
            <body>
                <h1>Home Demo</h1>
                <button onclick="window.location.href='/get_info'">Get information</button>
            </body>
        </html>
    `);
});

app.get('/get_token_info', function(req, res) {
	const accessToken = req.cookies.access_token;
	if (!accessToken) {
		return res.status(400).json({ error: 'Access token not found in cookies' });
	}
	request(
		{
			method: 'GET',
			url: `http://${keyrockUrl}/v1/auth/tokens`,
			headers: {
				'X-Auth-token': accessToken, // Use the access token from cookies
			},
		},
		function(error, response, body) {
			if (error) {
				console.error('Error:', error);
				return res.status(500).json({ error: 'Internal server error' });
			}
			console.log('Status:', response.statusCode);
			console.log('Headers:', JSON.stringify(response.headers));
			console.log('Response:', body);

			// Parse the JSON response if applicable
			let responseData;
			try {
				responseData = JSON.parse(body);
			} catch (parseError) {
				console.error('Error parsing response:', parseError);
				return res
					.status(500)
					.json({ error: 'Error parsing response from Keyrock' });
			}
			// If successful, return the token information
			if (response.statusCode === 200) {
				return res.status(200).json(responseData);
			}
			// If unsuccessful, return an error
			return res
				.status(response.statusCode)
				.json({ error: 'Failed to retrieve token information' });
		}
	);
});

app.get('/create_password', function(req, res) {
	const url = config.idmURL + '/user';

	const accessToken = req.cookies.access_token;
	const id_token = req.cookies.id_token;

	console.log('ID Token:', id_token); // Log the ID token value

	if (accessToken) {
		oa.get(url, accessToken)
			.then((response) => {
				const user = JSON.parse(response);
				// Now that we have user information, proceed with token creation
				request(
					{
						method: 'POST',
						url: `http://${keyrockUrl}/v1/auth/tokens`,
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							token: id_token, // Pass the ID token in the request body
						}),
					},
					function(error, response, body) {
						if (error) {
							console.error('Error:', error);
							res.status(500).send('Internal Server Error');
							return;
						}

						console.log('Status:', response.statusCode); // Log the status code
						console.log('Headers:', JSON.stringify(response.headers)); // Log the response headers
						console.log('Response:', body); // Log the response body

						// Parse the JSON response body
						const responseBody = JSON.parse(body);
						// Extract the token from the response body
						const token = responseBody.token ? responseBody.token.id : null;

						if (token) {
							res.send(`This is your token: ${token}`);
						} else {
							console.error('Token not found in response body');
							res.status(500).send('Internal Server Error');
						}
					}
				);
			})
			.catch((error) => {
				console.error('Error retrieving user information:', error);
				res.status(500).send('Internal Server Error');
			});
	} else {
		res.status(401).send('Unauthorized: Access Token not found in cookie');
	}
});

function listUsersRoles() {
	return getTokenInfo().then((tokenInfo) => {
		const userInfo = JSON.parse(tokenInfo);
		const userID = userInfo.User.id;

		return new Promise((resolve, reject) => {
			request(
				{
					method: 'GET',
					url: `http://${keyrockUrl}/v1/applications/${my_app_id}/users/${userID}/roles`,
					headers: {
						'X-Auth-token': token,
					},
				},
				(error, response, body) => {
					if (error) {
						console.log('Error: ', error);
						reject(error);
					} else {
						try {
							const parsedBody = JSON.parse(body); // Parse the JSON string
							console.log(parsedBody); // Log the parsed body as JSON
							resolve(parsedBody); // Resolve the promise with the parsed body
						} catch (parseError) {
							console.error('Error parsing response body:', parseError);
							reject(parseError);
						}
					}
				}
			);
		});
	});
}

app.get('/user_roles', function(req, res) {
	listUsersRoles()
		.then((userRoles) => {
			res.json({ status: 'success', data: userRoles });
		})
		.catch((error) => {
			console.log('Error: ', error);
			res.status(500).json({ error: 'Internal Server Error' });
		});
});

app.get('/frontend_astro_AS/src/pages/index', function(req, res) {
	res.sendFile(
		path.join(__dirname, 'frontend_astro_AS', 'src', 'pages', 'index.astro')
	);
});

function getOrionEntities() {
	return new Promise((resolve, reject) => {
		request(
			{
				method: 'GET',
				url: `http://www.anysolution.org:1027/v2/entities`,
				headers: {},
			},
			(error, response, body) => {
				if (error) {
					console.log('Error: ', error);
					reject(error);
				} else {
					try {
						const parsedBody = JSON.parse(body); // Parse the JSON string
						console.log(parsedBody); // Log the parsed body as JSON
						resolve(parsedBody); // Resolve the promise with the parsed body
					} catch (parseError) {
						console.error('Error parsing response body:', parseError);
						reject(parseError);
					}
				}
			}
		);
	});
}

app.get('/orion_entities', function(req, res) {
	getOrionEntities()
		.then((entities) => {
			res.json({ status: 'success', data: entities });
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		});
});

function listPermissions() {
	return new Promise((resolve, reject) => {
		console.log('Hello from listPermissions function!'); // Add this log statement

		request(
			{
				method: 'GET',
				url: `http://${keyrockUrl}/v1/applications/${my_app_id}/permissions`,
				headers: {
					'X-Auth-token': token,
				},
			},
			(error, response, body) => {
				if (error) {
					console.error('Error:', error);
					reject(error); // Reject the Promise in case of error
				} else {
					try {
						// Parse the JSON string
						const parsedBody = JSON.parse(body);

						// Extract only the necessary fields from each permission
						const filteredPermissions = parsedBody.permissions.map(
							(permission) => ({
								id: permission.id,
								name: permission.name,
								description: permission.description,
							})
						);

						// Resolve the Promise with the filtered permissions data
						resolve(filteredPermissions);
					} catch (parseError) {
						console.error('Error parsing JSON:', parseError);
						reject(parseError);
					}
				}
			}
		);
	});
}

function storeUserRoles() {
	return listUsersRoles()
		.then((roles) => {
			const roleIDs = roles.role_user_assignments.map((role) => role.role_id);
			console.log('Role IDs:', roleIDs);
			return roleIDs; // Resolve with the role IDs
		})
		.catch((error) => {
			console.error('Error:', error);
			throw new Error('Failed to fetch and store user roles'); // Reject with an error
		});
}

// Endpoint to list user permissions
app.get('/list_user_permissions', function(req, res) {
	storeUserRoles()
		.then((roleIDs) => {
			res.send(roleIDs);
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).send('Internal Server Error');
		});
});

function checkUserPermission() {
	return new Promise((resolve, reject) => {
		storeUserRoles()
			.then((roleIDs) => {
				const permissionsPromises = roleIDs.map((roleID) => {
					return new Promise((resolve, reject) => {
						request(
							{
								method: 'GET',
								url: `http://${keyrockUrl}/v1/applications/${my_app_id}/roles/${roleID}/permissions`,
								headers: {
									'X-Auth-token': token,
								},
							},
							function(error, response, body) {
								if (error) {
									reject(error);
								} else {
									console.log(`Permissions for Role ID ${roleID}:`);
									const responseBody = JSON.parse(body);
									const permissions = responseBody.role_permission_assignments.map(
										(permission) => permission.name
									);
									console.log('Response:', permissions);
									resolve(permissions);
								}
							}
						);
					});
				});
				Promise.all(permissionsPromises)
					.then((permissions) => {
						resolve(permissions.flat()); // Flatten the array of arrays
					})
					.catch((error) => {
						reject(error);
					});
			})
			.catch((error) => {
				reject(error);
			});
	});
}

app.get('/check_user_permissions', function(req, res) {
	checkUserPermission()
		.then((userPermissions) => {
			res.status(200).send(userPermissions);
		})
		.catch((error) => {
			console.error('Error checking user permissions:', error);
			res.status(500).send('Internal Server Error');
		});
});

// Route handler for /list_permissions
app.get('/list_permissions', function(req, res) {
	// Call the listPermissions function defined above
	listPermissions()
		.then((filteredPermissions) => {
			console.log('Filtered Permissions:', filteredPermissions); // Debugging

			// Send the filtered permissions data as the response
			res.json({ status: 'success', data: filteredPermissions });
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		});
});

app.get('/get_info', function(req, res) {
	getTokenInfo()
		.then((tokenInfo) => {
			const userInfo = JSON.parse(tokenInfo);
			const userID = userInfo.User.id;
			const accessToken = userInfo.access_token;

			// Serve an HTML page containing the buttons
			let htmlContent = `
                <html>
                    <head>
                        <title>User Info</title>
                        <style>
                            body {
                                background-color: #f2f2f2;
                                font-family: Arial, sans-serif;
                            }
                            .button-container {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                margin-top: 50px; /* Adjust margin as needed */
                            }
                            h1 {
                                color: #333;
                                text-align: center;
                            }
                            button {
                                background-color: #f2f2f2;
                                color: #333;
                                border: 1px solid #ccc;
                                padding: 10px 20px;
                                border-radius: 5px;
                                cursor: pointer;
                                margin: 10px 0; /* Adjust margin as needed */
                            }
                        </style>
                    </head>
                    <body>
                        <h1>User Info</h1>
                        
                        <script>
                            function getUserInfo() {
                                fetch('/get_user_info', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        userID: '${userID}',
                                        accessToken: '${accessToken}'
                                    })
                                })
                                .then(response => response.json())
                                .then(data => {
                                    console.log(data);
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    alert('Error fetching user info');
                                });
                            }

                            function listPermissions() {
                                fetch('/list_permissions', {
                                    method: 'GET'
                                })
                                .then(response => response.json())
                                .then(data => {
                                    console.log(data);
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    alert('Error fetching permissions list');
                                });
                            }

                            // Function to clear terminal
                            function clearTerminal() {
                                fetch('/clear_terminal')
                                    .then(response => {
                                        if (response.ok) {
                                            console.log('Terminal cleared successfully');
                                        } else {
                                            console.error('Failed to clear terminal');
                                            alert('Failed to clear terminal');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error clearing terminal:', error);
                                        alert('Error clearing terminal');
                                    });
                            }
														// Function to get app info
                            function getAppInfo() {
                                fetch('/get_app_info')
                                    .then(response => {
                                        if (response.ok) {
                                            console.log('Application info successfull');
                                        } else {
                                            console.error('Failed to get app info');
                                            alert('Failed to get app info');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error get app info:', error);
                                        alert('Error get app info');
                                    });
                            }

// Function to get User Permission by role
function checkUserPermission() {
    return fetch('/check_user_permissions')
        .then(response => {
            if (response.ok) {
                console.log('Got User permissions by role');
                return response.text(); // Return the response text
            } else {
                console.error('Failed to get User permissions by role');
                throw new Error('Failed to get User permissions by role'); // Throw an error to be caught in the catch block
            }
        })
        .then(data => {
            console.log('Response:', data);
            return data; // Return the response data
        })
        .catch(error => {
            console.error('Error getting User permissions by role:', error);
            throw error; // Throw the error again to be caught by the caller
        });
}


                            // Function to get Orion Entities
                            function getOrionEntities() {
                                fetch('/orion_entities')
                                    .then(response => {
                                        if (response.ok) {
                                            console.log('Got Orion Entities');
                                        } else {
                                            console.error('Failed to get Orion Entities');
                                            alert('Failed to get Orion Entities');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error getting Orion entities:', error);
                                        alert('Error getting Orion Entities');
                                    });
                            }
function listUserPermissions() {
    fetch('/list_user_permissions')
        .then(response => {
            if (response.ok) {
                return response.text(); // Assuming the response is text
            } else {
                throw new Error('Failed User permissions');
            }
        })
        .then(data => {
            console.log('User permissions:', data); // Log the user permissions
            // Here you can update your UI or do further processing with the user permissions data
        })
        .catch(error => {
            console.error('Error User permissions:', error);
            alert('Error User permissions');
        });
}

                            // Function to get User Roles
                            function listUsersRoles() {
    return fetch('/user_roles') // Make sure '/user_roles' is the correct endpoint
        .then(response => {
            if (response.ok) {
                return response.json(); // Parse response as JSON
            } else {
                throw new Error('Failed to get User Roles');
            }
        })
        .then(data => {
            console.log('User roles:', data); // Log the user roles
            return data; // Return user roles
        })
        .catch(error => {
            console.error('Error getting User Roles:', error);
            throw error; // Throw the error again to be caught by the caller
        });
}

// Function to set button visibility based on permissions
function setButtonVisibility() {
    checkUserPermission()
        .then(permissions => {
            console.log('User permissions:', permissions);
            // Check if the user has the permission "Get Orion Entities"
            const hasGetOrionEntitiesPermission = permissions.includes('Get Orion Entities');
            const getTokenInfoButton = document.getElementById('get_token_info_button');
            const getTokenInfoButton2 = document.getElementById('get_token_info_button_2');
            const getTokenInfoButton3 = document.getElementById('get_token_info_button_3');

            if (hasGetOrionEntitiesPermission) {
                getTokenInfoButton.style.display = 'block'; // Display the button if the permission is present
                getTokenInfoButton2.style.display = 'block'; // Display the button if the permission is present
                getTokenInfoButton3.style.display = 'block'; // Display the button if the permission is present
            } else {
                getTokenInfoButton.style.display = 'none'; // Hide the button if the permission is not present
            }
            // Add more conditions for other permissions and buttons
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error fetching user permissions');
        });
}

// Call setButtonVisibility on page load
setButtonVisibility();

                        </script>
                        
                        <div class="button-container">
                            <button onclick="getUserInfo()">Get User Info</button>
                            <button onclick="getAppInfo()">Get Application Info</button>
                            <button id="list_permissions_button" onclick="checkUserPermission()">List Permissions</button>
                            <button onclick="clearTerminal()">Clear Terminal</button>
                            <button id="get_token_info_button_3" style="display: none;" onclick="getOrionEntities()">Get Orion Entities</button>
                            <button id="get_token_info_button" style="display: none;" onclick="getOrionEntities(); window.location.href='http://localhost:4321/';">Descubrimiento de Datos</button>
                            <button id="get_token_info_button_2" style="display: none;" onclick="getOrionEntities(); window.location.href='http://localhost:4321/subscriptions/';">Subscriptions</button>
                            <button onclick="listUsersRoles()">Get User Roles</button>
                        </div>
                    </body>
                </html>
            `;

			res.send(htmlContent);
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).send('Internal Server Error');
		});
});

app.get('/get_app_info', function(req, res) {
	getTokenInfo()
		.then((tokenInfo) => {
			console.log('Token Info:', tokenInfo); // Log tokenInfo
			const accessToken = JSON.parse(tokenInfo).access_token;
			console.log('Access Token:', accessToken); // Log accessToken
			request(
				{
					method: 'GET',
					url: `http://${keyrockUrl}/v1/applications`,
					headers: {
						'X-Auth-token': accessToken,
					},
				},
				(error, response, body) => {
					console.log('Status:', response.statusCode);
					console.log('Headers:', JSON.stringify(response.headers));
					console.log('Response:', body);
					res.json({ status: 'success', data: body });
				}
			);
		})
		.catch((error) => {
			console.error('Error:', error);
			res.status(500).send('Internal Server Error');
		});
});

// Endpoint to handle the button click and make the request
app.post('/get_user_info', function(req, res) {
	const { userID, accessToken } = req.body;
	request(
		{
			method: 'GET',
			url: `http://${keyrockUrl}/v1/users/${userID}`,
			headers: {
				'X-Auth-token': accessToken,
			},
		},
		(error, response, body) => {
			console.log('Status:', response.statusCode);
			console.log('Headers:', JSON.stringify(response.headers));
			console.log('Response:', body);
			res.json({ status: 'success', data: body });
		}
	);
});

app.get('/get_token_info', function(req, res) {
	const accessToken = req.cookies.access_token;
	if (!accessToken) {
		return res.status(400).json({ error: 'Access token not found in cookies' });
	}

	oa.validateToken(accessToken)
		.then((tokenInfo) => {
			// Handle token validation response
			res.json(tokenInfo);
		})
		.catch((error) => {
			// Handle errors
			res.status(500).json({ error: 'Failed to validate token' });
		});
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
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
		default:
			throw error;
	}
}

// function sendCookieToServer(access_token) {
// 	axios
// 		.post(serverURL, {
// 			headers: {
// 				Cookie: `access_token=${access_token}`, // Include the access token as a cookie in the request headers
// 			},
// 		})
// 		.then((response) => {
// 			// Handle the server's response here
// 			console.log(response.data);
// 		})
// 		.catch((error) => {
// 			// Handle errors here
// 			console.error('Error sending cookie to server:', error);
// 		});
// }

function onListeningServer() {
	const addr = server.address();
	const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
	console.log('Listening on ' + bind);
}
