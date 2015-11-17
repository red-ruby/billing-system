var fs = require('fs');
var template = fs.readFileSync(__dirname + '/carriers.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/carriers.add.html', 'utf-8');
var template3 = fs.readFileSync(__dirname + '/carriers.list.html', 'utf-8');
var template4 = fs.readFileSync(__dirname + '/carriers.view.html', 'utf-8');

module.exports = function(angular) {
	return angular.module('myApp.carriers', ['ui.router'])
		.config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
			$stateProvider
				.state('carriers', {
					url: '/carriers',
					template: template
				})
				.state('carriers.add',{
					url: '/add',
					template: template2,
					controller: 'CarriersFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('carriers.edit',{
					url: '/edit/:id',
					template: template2,
					controller: 'CarriersFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('carriers.list',{
					url: '/list',
					template: template3,
					controller: 'CarriersCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('carriers.view',{
					url:'/view/:id',
					template:template4,
					controller: 'CarrierDetailsCtrl',
					resolve: AUTH_RESOLVE
				});
		}])

	.controller('CarrierDetailsCtrl', [
		'$scope', '$filter', 'FBService','$stateParams',
		function($scope, $filter, FBService, $stateParams) {
			$scope.datatable = {}

			$scope.FBobject = FBService.init('carriers');
			// Get carrier
			$scope.FBobject.getItem(
				$stateParams.id,
				function(item){
					console.log(item)
					$scope.carrier = item;
				}
			);
			// Get carrier products
			$scope.getProducts = function(){
				$scope.FBobject.searchItems(
					'products',
					'carrier',
					$stateParams.id,
					function(items){
						console.log('products', items);
						$scope.products = items;
						startTables();
					}
				)};

			$scope.getProducts();

			/**
			 * Handle the editable tables
			 * TODO: Find a clean way to do it(maybe a directive)
			 */
			function datatable(type, items){
				$scope.datatable[type] = {};

				// Table var and functions
				$scope.datatable[type].sort = {
					sortingOrder : '',
					reverse : 0
				}

				$scope.datatable[type].filteredItems = [];
				$scope.datatable[type].groupedItems = [];
				$scope.datatable[type].pagedItems = [];
				$scope.datatable[type].itemsPerPage = $scope.datatable[type].gap = 10;
				$scope.datatable[type].currentPage = 0;


				var searchMatch = function (haystack, needle) {
					if (!needle) {
						return 1;
					}
					return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
				}

				// init the filtered items
				$scope.datatable[type].search = function () {
					$scope.datatable[type].filteredItems = $filter('filter')(items, function (item) {
						for(var attr in item) {
							if (searchMatch(item[attr], $scope.datatable[type].query)){
								return 1;
							}
						}
						return 0;
					});
					// take care of the sorting order
					if ($scope.datatable[type].sort.sortingOrder !== '') {
						$scope.datatable[type].filteredItems = $filter('orderBy')($scope.datatable[type].filteredItems, $scope.datatable[type].sort.sortingOrder, $scope.datatable[type].sort.reverse);
					}
					$scope.datatable[type].currentPage = 0;
					// now group by pages
					$scope.datatable[type].groupToPages();
				}

				// calculate page in place
				$scope.datatable[type].groupToPages = function () {
					$scope.datatable[type].pagedItems = [];

					for (var i = 0; i < $scope.datatable[type].filteredItems.length; i++) {
						if (i % $scope.datatable[type].itemsPerPage === 0) {
							$scope.datatable[type].pagedItems[Math.floor(i / $scope.datatable[type].itemsPerPage)] = [ $scope.datatable[type].filteredItems[i] ];
						} else {
							$scope.datatable[type].pagedItems[Math.floor(i / $scope.datatable[type].itemsPerPage)].push($scope.datatable[type].filteredItems[i]);
						}
					}
				}

				// Get range for pagination
				$scope.datatable[type].range = function (size, start, end) {
					var ret = [];
					if (size < end) {
						end = size;
						start = size-$scope.datatable[type].gap;
					}
					for (var i = start; i < end; i++) {
						ret.push(i);
					}
					return ret;
				}

				$scope.datatable[type].prevPage = function () {
					if ($scope.datatable[type].currentPage > 0) {
						$scope.datatable[type].currentPage--;
					}
				}

				$scope.datatable[type].nextPage = function () {
					if ($scope.datatable[type].currentPage < $scope.datatable[type].pagedItems.length - 1) {
						$scope.datatable[type].currentPage++;
					}
				}

				$scope.datatable[type].setPage = function (page) {
					$scope.datatable[type].currentPage = page;
				}

				$scope.datatable[type].sort_by = function(newSortingOrder) {
					var sort = $scope.datatable[type].sort;

					if (sort.sortingOrder == newSortingOrder){
						sort.reverse = !sort.reverse;
					}

					sort.sortingOrder = newSortingOrder;
				}

				$scope.datatable[type].selectedCls = function(column) {
					if(column == $scope.datatable[type].sort.sortingOrder){
						return ($scope.datatable[type].sort.reverse) ? 'sorting_desc' : 'sorting_asc';
					}else{
						return 'sorting'
					}
				}

				// Start table
				$scope.datatable[type].search();

			}

			function startTables(){
				// Start products table
				if(angular.isUndefined($scope.products)){
					$scope.products = [];
				}
				datatable('products', $scope.products);

				// Start contacts table
				if(angular.isUndefined($scope.carrier.contacts)){
					$scope.carrier.contacts = [];
				}
				datatable('contacts', $scope.carrier.contacts);
			}

			$scope.removeCarrier = function() {
				$scope.FBobject.confirmRemoveItem($scope.carrier, FBService.auth(), 'carrier', $scope.products);
			};
		}
	])

	.controller('CarriersFormCtrl', [
		'$scope', '$filter', '$stateParams', 'FBService',
		function($scope, $filter, $stateParams, FBService) {

			$scope.is_edit = 0;
			$scope.newCarrier = {
				name: '',
				status: 0,
				products: [],
				contacts: [],
				notes: ''
			};

			$scope.products = [];

			$scope.datatable = {};

			/**
			 * Handle the editable tables
			 * TODO: Find a clean way to do it(maybe a directive)
			 */
			function datatable(type, items){
				$scope.datatable[type] = {};

				switch(type){
					case 'products':
						$scope.datatable[type].row = function(){
							return {
								taxStatus: 0,
								payDetail: 0,
								status: 0
							}
						}
						break;
					case 'contacts':
						$scope.datatable[type].row = function(){
							return {
								firstName: '',
								lastName: '',
								title: '',
								email: '',
								phone: '',
								fax: ''
							}
						}
						break;
				}
				// Table var and functions
				$scope.datatable[type].sort = {
					sortingOrder : '',
					reverse : 0
				}

				if(type == 'contacts'){
					$scope.datatable[type].filteredItems = [];
					$scope.datatable[type].groupedItems = [];
					$scope.datatable[type].pagedItems = [];
					$scope.datatable[type].gap = 10;
					$scope.datatable[type].currentPage = 0;
				}
				$scope.datatable[type].itemsPerPage = 10;


				var searchMatch = function (haystack, needle) {
					if (!needle) {
						return 1;
					}
					return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
				}

				// init the filtered items
				$scope.datatable[type].search = function () {
					$scope.datatable[type].filteredItems = $filter('filter')(items, function (item) {
						for(var attr in item) {
							if (searchMatch(item[attr], $scope.datatable[type].query)){
								return 1;
							}
						}
						return 0;
					});
					// take care of the sorting order
					if ($scope.datatable[type].sort.sortingOrder !== '') {
						$scope.datatable[type].filteredItems = $filter('orderBy')($scope.datatable[type].filteredItems, $scope.datatable[type].sort.sortingOrder, $scope.datatable[type].sort.reverse);
					}
					$scope.datatable[type].currentPage = 0;
					// now group by pages
					$scope.datatable[type].groupToPages();
				}

				// calculate page in place
				$scope.datatable[type].groupToPages = function () {
					$scope.datatable[type].pagedItems = [];

					for (var i = 0; i < $scope.datatable[type].filteredItems.length; i++) {
						if (i % $scope.datatable[type].itemsPerPage === 0) {
							$scope.datatable[type].pagedItems[Math.floor(i / $scope.datatable[type].itemsPerPage)] = [ $scope.datatable[type].filteredItems[i] ];
						} else {
							$scope.datatable[type].pagedItems[Math.floor(i / $scope.datatable[type].itemsPerPage)].push($scope.datatable[type].filteredItems[i]);
						}
					}
				}

				// Get range for pagination
				$scope.datatable[type].range = function (size, start, end) {
					var ret = [];
					if (size < end) {
						end = size;
						start = size-$scope.datatable[type].gap;
					}
					for (var i = start; i < end; i++) {
						ret.push(i);
					}
					return ret;
				}

				$scope.datatable[type].prevPage = function () {
					if ($scope.datatable[type].currentPage > 0) {
						$scope.datatable[type].currentPage--;
					}
				}

				$scope.datatable[type].nextPage = function () {
					if ($scope.datatable[type].currentPage < $scope.datatable[type].pagedItems.length - 1) {
						$scope.datatable[type].currentPage++;
					}
				}

				$scope.datatable[type].setPage = function (page) {
					$scope.datatable[type].currentPage = page;
				}

				$scope.datatable[type].sort_by = function(newSortingOrder) {
					var sort = $scope.datatable[type].sort;

					if (sort.sortingOrder == newSortingOrder){
						sort.reverse = !sort.reverse;
					}

					sort.sortingOrder = newSortingOrder;
				}

				$scope.datatable[type].selectedCls = function(column) {
					if(column == $scope.datatable[type].sort.sortingOrder){
						return ($scope.datatable[type].sort.reverse) ? 'sorting_desc' : 'sorting_asc';
					}else{
						return 'sorting'
					}
				}

				// Add a row on the products table
				$scope.datatable[type].addRow = function(){
					// Add the new item
					items.push($scope.datatable[type].row());
					// Recalculate what to show
					if(type == 'contacts'){
						$scope.datatable[type].search();
					}
				}

				// Remove a row on the products table
				$scope.datatable[type].removeRow = function(item) {
					var remove = confirm('Are you sure?'),
						// Get the index from the original array
						index = items.indexOf(item);
					if(type == 'contacts'){
						// Save the current page
						var currentPage = $scope.datatable[type].currentPage;
					}
					if(!remove){
						return;
					}
					if(type == 'products'){
						$scope.FBobject.removeProduct(index);
					}
					// Remove from the original array
	  				items.splice(index, 1);
	  				if(type == 'contacts'){
		  				// Remove from the page array
		  				$scope.datatable[type].pagedItems[currentPage].splice($index, 1);
		  				// Recalculate what to show
						$scope.datatable[type].search();
						// Go back to current page
						$scope.datatable[type].setPage(currentPage);
					}
				}

				if(type == 'contacts'){
					// Start table
					$scope.datatable[type].search();
				}

			}

			function startTables(){
				// Start products table
				if(angular.isUndefined($scope.products)){
					$scope.products = [];
				}
				datatable('products', $scope.products);

				// Start contacts table
				if(angular.isUndefined($scope.newCarrier.contacts)){
					$scope.newCarrier.contacts = [];
				}
				datatable('contacts', $scope.newCarrier.contacts);
			}

			// Check is new or is edit mode
			if($stateParams.id){
				$scope.stateID = $stateParams.id;
				$scope.FBobject = FBService.init('carriers');
				$scope.FBobject.getItem(
					$stateParams.id,
					function(item){
						$scope.newCarrier = item;
					});
				// Get carrier products
				$scope.FBobject.searchItems(
					'products',
					'carrier',
					$stateParams.id,
					function(items){
						console.log('products', items);
						$scope.products = items;
						//$scope.getCarrierProds();
						startTables();
					}
				);

				$scope.is_edit = 1;
			}else{
				startTables();
			}

			$scope.getCarrierProds = function(){
				// Get carrier products
				$scope.FBobject.searchItems(
					'products',
					'carrier',
					$stateParams.id,
					function(items){
						console.log('products', items);
						$scope.products = items;
						startTables();
					}
				);
			}

			$scope.setDirty = function(item){
				item.isDirty = 1;
			}

			$scope.submitCarrier = function(is_edit) {
				if(is_edit){
					$scope.updateCarrier($scope.newCarrier);
				}else{
					$scope.addCarrier($scope.newCarrier);
				}
			}

			$scope.updateCarrier = function (newCarrier) {
				$scope.FBobject.updateItem(newCarrier, $scope.products);
			}

			$scope.addCarrier = function(newCarrier) {
				FBService.init('carriers').addItem(newCarrier, $scope.products);
			};
	}])

	.controller('CarriersCtrl', ['$scope', 'FBService', function($scope, FBService) {
		FBService.init('carriers').getItems(
			function(carriers){
				$scope.carriers = carriers;
		});
	}]);
};
