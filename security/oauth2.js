/* eslint-disable linebreak-style */
const querystring = require('querystring');
const https = require('https');
const http = require('http');
const URL = require('url');

exports.OAuth2 = function(
	clientId,
	clientSecret,
	baseSite,
	authorizePath,
	accessTokenPath,
	callbackURL,
	userinfoPath, // OIDC userinfo endpoint
	tokeninfoPath, // OIDC tokeninfo endpoint
	customHeaders
) {
	this._clientId = clientId;
	this._clientSecret = clientSecret;
	this._baseSite = baseSite;
	this._authorizeUrl = authorizePath || '/oauth/authorize';
	this._accessTokenUrl = accessTokenPath || '/oauth/access_token';
	this._callbackURL = callbackURL;
	this._userinfoUrl = userinfoPath; // OIDC userinfo endpoint
	this._tokeninfoUrl = tokeninfoPath; // OIDC tokeninfo endpoint
	this._accessTokenName = 'access_token';
	this._authMethod = 'Basic';
	this._customHeaders = customHeaders || {};
	this._idToken = '';
};

// This 'hack' method is required for sites that don't use
// 'access_token' as the name of the access token (for requests).
// ( http://tools.ietf.org/html/draft-ietf-oauth-v2-16#section-7 )
// it isn't clear what the correct value should be atm, so allowing
// for specific (temporary?) override for now.
exports.OAuth2.prototype.setAccessTokenName = function(name) {
	this._accessTokenName = name;
};

exports.OAuth2.prototype._getAccessTokenUrl = function() {
	return this._baseSite + this._accessTokenUrl;
};

// Build the authorization header. In particular, build the part after the colon.
// e.g. Authorization: Bearer <token>  # Build "Bearer <token>"
exports.OAuth2.prototype.buildAuthHeader = function() {
	const key = this._clientId + ':' + this._clientSecret;
	const base64 = new Buffer(key).toString('base64');
	return this._authMethod + ' ' + base64;
};

exports.OAuth2.prototype._request = function(
	method,
	url,
	headers,
	postBody,
	accessToken,
	callback
) {
	let httpLibrary = https;
	const parsedUrl = URL.parse(url, true);
	if (parsedUrl.protocol === 'https:' && !parsedUrl.port) {
		parsedUrl.port = 443;
	}

	// As this is OAUth2, we *assume* https unless told explicitly otherwise.
	if (parsedUrl.protocol !== 'https:') {
		httpLibrary = http;
	}

	const realHeaders = {};
	for (const key in this._customHeaders) {
		realHeaders[key] = this._customHeaders[key];
	}
	if (headers) {
		for (const key in headers) {
			realHeaders[key] = headers[key];
		}
	}
	realHeaders.Host = parsedUrl.host;

	//realHeaders['Content-Length']= postBody ? Buffer.byteLength(postBody) : 0;
	if (accessToken && !('Authorization' in realHeaders)) {
		if (!parsedUrl.query) {
			parsedUrl.query = {};
		}
		parsedUrl.query[this._accessTokenName] = accessToken;
	}

	let queryStr = querystring.stringify(parsedUrl.query);
	if (queryStr) {
		queryStr = '?' + queryStr;
	}
	const options = {
		host: parsedUrl.hostname,
		port: parsedUrl.port,
		path: parsedUrl.pathname + queryStr,
		method,
		headers: realHeaders,
	};

	this._executeRequest(httpLibrary, options, postBody, callback);
};

exports.OAuth2.prototype.setIdToken = function(idToken) {
	this._idToken = idToken;
};

exports.OAuth2.prototype.getIdToken = function() {
	return this._idToken;
};

exports.OAuth2.prototype._executeRequest = function(
	httpLibrary,
	options,
	postBody,
	callback
) {
	// Some hosts *cough* google appear to close the connection early / send no content-length header
	// allow this behaviour.
	const allowEarlyClose =
		options.host && options.host.match('.*google(apis)?.com$');
	let callbackCalled = false;
	function passBackControl(response, result, err) {
		if (!callbackCalled) {
			callbackCalled = true;
			if (
				response.statusCode !== 200 &&
				response.statusCode !== 201 &&
				response.statusCode !== 301 &&
				response.statusCode !== 302
			) {
				callback({ statusCode: response.statusCode, data: result });
			} else {
				callback(err, result, response);
			}
		}
	}

	let result = '';

	const request = httpLibrary.request(options, function(response) {
		response.on('data', function(chunk) {
			result += chunk;
		});
		response.on('close', function(err) {
			if (allowEarlyClose) {
				passBackControl(response, result, err);
			}
		});
		response.addListener('end', function() {
			passBackControl(response, result);
		});
	});
	request.on('error', function(e) {
		callbackCalled = true;
		callback(e);
	});

	if (options.method === 'POST' && postBody) {
		request.write(postBody);
	}
	request.end();
};

exports.OAuth2.prototype.getAuthorizeUrl = function(responseType) {
	responseType = responseType || 'code';
	const scopes = ['openid']; // Include openid scope for OIDC

	return (
		this._baseSite +
		this._authorizeUrl +
		'?response_type=' +
		responseType +
		'&client_id=' +
		this._clientId +
		'&scope=' +
		encodeURIComponent(scopes.join(' ')) + // Encode scopes
		'&state=xyz&redirect_uri=' +
		encodeURIComponent(this._callbackURL) // Encode callback URL
	);
};

exports.OAuth2.prototype.getAuthorizeUrlJWT = function(responseType) {
	responseType = responseType || 'code';
	const scopes = ['openid']; // Include openid scope for OIDC

	return (
		this._baseSite +
		this._authorizeUrl +
		'?response_type=' +
		responseType +
		'&client_id=' +
		this._clientId +
		'&state=xyz&scope=' +
		encodeURIComponent(scopes.join(' ')) + // Encode scopes
		'&redirect_uri=' +
		encodeURIComponent(this._callbackURL) // Encode callback URL
	);
};

function getResults(data) {
	let results;
	try {
		results = JSON.parse(data);
	} catch (e) {
		results = querystring.parse(data);
	}
	return results;
}

exports.OAuth2.prototype.getOAuthAccessToken = function(code) {
	const that = this;

	return new Promise((resolve, reject) => {
		const postData =
			'grant_type=authorization_code&code=' +
			code +
			'&redirect_uri=' +
			that._callbackURL;

		const postHeaders = {
			Authorization: that.buildAuthHeader(),
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
		};

		console.log(
			'Sending access token request to',
			that._getAccessTokenUrl(),
			'with body',
			postData
		);
		that._request(
			'POST',
			that._getAccessTokenUrl(),
			postHeaders,
			postData,
			null,
			(error, data) => {
				if (error) {
					reject(error);
					return;
				}
				const response = getResults(data);
				that._idToken = response.id_token; // Set the id_token
				resolve(response);
			}
		);
	});
};

exports.OAuth2.prototype.getOAuthClientCredentials = function() {
	const that = this;
	return new Promise((resolve, reject) => {
		const postData = 'grant_type=client_credentials';
		const postHeaders = {
			Authorization: that.buildAuthHeader(),
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
		};

		that._request(
			'POST',
			that._getAccessTokenUrl(),
			postHeaders,
			postData,
			null,
			(error, data) => {
				return error ? reject(error) : resolve(getResults(data));
			}
		);
	});
};

exports.OAuth2.prototype.getOAuthPasswordCredentials = function(
	username,
	password
) {
	const that = this;
	return new Promise((resolve, reject) => {
		const postData =
			'grant_type=password&username=' + username + '&password=' + password;
		const postHeaders = {
			Authorization: that.buildAuthHeader(),
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
		};

		that._request(
			'POST',
			that._getAccessTokenUrl(),
			postHeaders,
			postData,
			null,
			(error, data) => {
				return error ? reject(error) : resolve(getResults(data));
			}
		);
	});
};

exports.OAuth2.prototype.getUserInfo = function(accessToken) {
	const url = this._baseSite + this._userinfoUrl;
	const headers = {
		Authorization: 'Bearer ' + accessToken,
	};

	return new Promise((resolve, reject) => {
		this._request('GET', url, headers, null, null, (error, data) => {
			if (error) {
				reject(error);
			} else {
				resolve(getResults(data));
			}
		});
	});
};

exports.OAuth2.prototype.validateToken = function(accessToken) {
	const url =
		this._baseSite + this._tokeninfoUrl + '?access_token=' + accessToken;

	return new Promise((resolve, reject) => {
		this._request('GET', url, null, null, null, (error, data) => {
			if (error) {
				reject(error);
			} else {
				resolve(getResults(data));
			}
		});
	});
};

exports.OAuth2.prototype.get = function(url, accessToken) {
	const that = this;
	return new Promise((resolve, reject) => {
		that._request('GET', url, {}, '', accessToken, (error, data) => {
			return error ? reject(error) : resolve(data);
		});
	});
};
