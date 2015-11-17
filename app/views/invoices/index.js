var fs = require('fs');
var template = fs.readFileSync(__dirname + '/invoices.html', 'utf-8');
var template1 = fs.readFileSync(__dirname + '/invoices.list.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/invoices.add.html', 'utf-8');


module.exports = function(angular) {
    return angular.module('myApp.invoices', ['ui.router'])
        .config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
            $stateProvider
                .state('invoices', {
                    url: '/invoices',
                    template: template,
                    resolve: AUTH_RESOLVE
                })
                .state('invoices.list', {
                    url: '/list',
                    template: template1,
                    controller:'invoicesCtrl',
                    resolve: AUTH_RESOLVE
                })
                .state('invoices.add', {
                    url: '/add',
                    template: template2,
                    controller:'invoicesCtrl',
                    resolve: AUTH_RESOLVE
                });
        }])

        .controller('invoicesCtrl', [function() {

        }]);
};
