document.addEventListener('DOMContentLoaded', function() {
	// Function to fetch user info
	function getUserInfo() {
		fetch('/get_user_info', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userID: '${userID}',
				accessToken: '${accessToken}',
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
			})
			.catch((error) => {
				console.error('Error:', error);
				alert('Error fetching user info');
			});
	}

	// Function to fetch permissions list
	function listPermissions() {
		fetch('/list_permissions', {
			method: 'GET',
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
			})
			.catch((error) => {
				console.error('Error:', error);
				alert('Error fetching permissions list');
			});
	}

	// Function to clear terminal
	function clearTerminal() {
		fetch('/clear_terminal')
			.then((response) => {
				if (response.ok) {
					console.log('Terminal cleared successfully');
				} else {
					console.error('Failed to clear terminal');
					alert('Failed to clear terminal');
				}
			})
			.catch((error) => {
				console.error('Error clearing terminal:', error);
				alert('Error clearing terminal');
			});
	}

	// Function to fetch application info
	function getAppInfo() {
		fetch('/get_app_info')
			.then((response) => {
				if (response.ok) {
					console.log('Application info successful');
				} else {
					console.error('Failed to get application info');
					alert('Failed to get application info');
				}
			})
			.catch((error) => {
				console.error('Error getting application info:', error);
				alert('Error getting application info');
			});
	}

	// Function to fetch Orion Entities
	function getOrionEntities() {
		fetch('/orion_entities')
			.then((response) => {
				if (response.ok) {
					console.log('Got Orion Entities');
				} else {
					console.error('Failed to get Orion Entities');
					alert('Failed to get Orion Entities');
				}
			})
			.catch((error) => {
				console.error('Error getting Orion Entities:', error);
				alert('Error getting Orion Entities');
			});
	}

	// Function to fetch User Roles
	function listUsersRoles() {
		fetch('/user_roles')
			.then((response) => {
				if (response.ok) {
					console.log('Got User Roles');
				} else {
					console.error('Failed to get User Roles');
					alert('Failed to get User Roles');
				}
			})
			.catch((error) => {
				console.error('Error getting User Roles:', error);
				alert('Error getting User Roles');
			});
	}

	// Function to set button visibility based on permissions
	function setButtonVisibility() {
		fetch('/list_permissions', {
			method: 'GET',
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
				// Check user's permissions and show/hide buttons accordingly
				const hasGetOrionEntitiesPermission = data
					.map((permission) => permission.name)
					.includes('Get Orion Entities');
				const getTokenInfoButton = document.getElementById(
					'get_token_info_button'
				);
				if (hasGetOrionEntitiesPermission) {
					getTokenInfoButton.style.display = 'block';
				} else {
					getTokenInfoButton.style.display = 'none';
				}
				// Add more conditions for other permissions and buttons
			})
			.catch((error) => {
				console.error('Error:', error);
				alert('Error fetching permissions list');
			});
	}

	// Call setButtonVisibility on page load
	setButtonVisibility();

	// Add event listeners for each button
	document
		.getElementById('getUserInfoBtn')
		.addEventListener('click', getUserInfo);
	document
		.getElementById('listPermissionsBtn')
		.addEventListener('click', listPermissions);
	document
		.getElementById('clearTerminalBtn')
		.addEventListener('click', clearTerminal);
	document
		.getElementById('getAppInfoBtn')
		.addEventListener('click', getAppInfo);
	document
		.getElementById('getOrionEntitiesBtn')
		.addEventListener('click', getOrionEntities);
	document
		.getElementById('listUsersRolesBtn')
		.addEventListener('click', listUsersRoles);
});
