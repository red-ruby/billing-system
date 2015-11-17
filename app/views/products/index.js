var fs = require('fs');
var template = fs.readFileSync(__dirname + '/products.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/products.add.html', 'utf-8');
var template3 = fs.readFileSync(__dirname + '/products.list.html', 'utf-8');
var template4 = fs.readFileSync(__dirname + '/products.view.html', 'utf-8');

module.exports = function(angular) {
	return angular.module('myApp.products', ['ui.router'])
		.config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
			$stateProvider
				.state('products', {
					url: '/products',
					template: template,
                    resolve: AUTH_RESOLVE
				})
				.state('products.add',{
					url:'/add',
					template: template2,
					controller: 'ProductsCtrl',
                    resolve: AUTH_RESOLVE
				})
				.state('products.list', {
					url:'/list',
					template: template3,
					controller: 'ProductsCtrl',
                    resolve: AUTH_RESOLVE
				})
				.state('products.view', {
					url:'/view/:id',
					template: template4,
					controller: 'ProductDetailsCtrl',
                    resolve: AUTH_RESOLVE
				});

		}])
		.controller("ProductDetailsCtrl", ['$firebaseObject', '$scope', 'productsService', '$stateParams',
			function($firebaseObject, $scope, productsService, $stateParams){
					$scope.product = productsService.getProduct($stateParams.id);

			}])

		.controller('ProductsCtrl', ['$scope', 'productsService', '$firebaseArray', function( $scope, productsService, $firebaseArray ) {

					$scope.newProduct = {
							name: '',
							status: '',
							carrier:''
					};

					$scope.data = {};
					$scope.data.products = productsService.getProducts();

					$scope.addProduct = function(newProduct) {

							productsService.addProduct(newProduct);

							$scope.newProduct = {
									name: '',
									status: '',
									carrier: ''


							};


					};
					$scope.updateProduct = function (id) {
							productsService.updateProduct(id);
					};

					$scope.removeProduct = function(id) {
							productsService.removeProduct(id);
					};
			}])

			.factory('productsService', ['$firebaseArray', 'FIREBASE_URI',
					function ($firebaseArray, FIREBASE_URI) {
							var ref = new Firebase(FIREBASE_URI + '/products');

							var products = $firebaseArray(ref);

							var getProducts = function(){
									console.log('getProducts');
									return products;
							};

							var addProduct = function (newProduct) {
									console.log(newProduct);
									products.$add(newProduct);
							};

							var updateProduct = function (id){
									products.$save(id);
							};

							var removeProduct = function (id) {
									products.$remove(id);
							};
							var getProduct = function(id) {
									return products.$getRecord(id);
							};

							return {
									getProducts: getProducts,
									addProduct: addProduct,
									updateProduct: updateProduct,
									removeProduct: removeProduct,
									getProduct: getProduct
							};


					}]);
};
