var fs = require('fs');
var template = fs.readFileSync(__dirname + '/reports.html', 'utf-8');

module.exports = function(angular) {
    return angular.module('myApp.reports', [])
        .config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
            $stateProvider
                .state('reports', {
                    url: '/reports',
                    template: template,
                    resolve: AUTH_RESOLVE
                });
        }])

        .controller('reportsCtrl', [function() {

        }]);
};
