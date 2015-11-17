var fs = require('fs');
var loginTemplate = fs.readFileSync(__dirname + '/login.html', 'utf-8');
var pwTemplate = fs.readFileSync(__dirname + '/pwreset.html', 'utf-8');
var domify = require('domify');

// be sure to enable authentication for email & password
// https://chstech.firebaseio.com/?page=Auth
// sample user: guest@foo.com:foobar

module.exports = function(angular) {
	return angular.module('myApp.user', ['ui.router'])
		.config(['$stateProvider', 'AUTH_WAIT', function($stateProvider, AUTH_WAIT) {
			$stateProvider
				.state('login', {
						url: '/login',
						template: loginTemplate,
						controller:'LoginCtrl',
					    resolve: AUTH_WAIT
				});
			$stateProvider
				.state('pwreset', {
						url: '/pwreset',
						template: pwTemplate,
						controller: 'LoginCtrl',
					    resolve: AUTH_WAIT
				});
		}])

		.controller('LoginCtrl', ['$rootScope', '$scope', '$state','FBService',
			function ($rootScope, $scope, $state, FBService) {
				$scope.user = {};
				// Login Form Submit Handler
				$scope.login = function(user) {
					console.log(user);
					$scope.loginObj = FBService.auth();
					$scope.loginObj.login(
						user,
						function (err, authData) {
						// callback
						if (err) return console.log(err);
						// No Error Success
						$state.go('groups.list');
						// here is the user data
						console.log(authData);
					});
				};
			}
		]);
};
