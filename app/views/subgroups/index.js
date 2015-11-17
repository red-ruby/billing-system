var fs = require('fs');
var template = fs.readFileSync(__dirname + '/subgroups.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/subgroups.add.html', 'utf-8');
var template3 = fs.readFileSync(__dirname + '/subgroups.list.html', 'utf-8');
var template4 = fs.readFileSync(__dirname + '/subgroups.view.html', 'utf-8');

module.exports = function(angular) {
	return angular
		.module('myApp.subgroups', ['ui.router'])
		.config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
			$stateProvider
				.state('subgroups', {
					url: '/subgroups',
					template: template
				})
				.state('subgroups.add',{
					url: '/add',
					template: template2,
					controller: 'subgroupsFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('subgroups.edit',{
					url: '/edit/:id',
					template: template2,
					controller: 'subgroupsFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('subgroups.list',{
					url: '/list',
					template: template3,
					controller: 'subgroupsCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('subgroups.view',{
					url:'/view/:id',
					template:template4,
					controller: 'SubgroupDetailsCtrl',
					resolve: AUTH_RESOLVE
				});
		}])

	.controller('SubgroupDetailsCtrl', [
		'$scope', '$filter', 'FBService','$stateParams',
		function($scope, $filter, FBService, $stateParams) {
			$scope.datatable = {}

			$scope.FBobject = FBService.init('subgroups');
			// Get subgroup
			$scope.FBobject.getItem(
				$stateParams.id,
				function(item){
					console.log(item)
					$scope.subgroup = item;
				}
			);
			// Get subgroup products
			$scope.getProducts = function(){
				$scope.FBobject.searchItems(
					'products',
					'subgroup',
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
				if(angular.isUndefined($scope.subgroup.contacts)){
					$scope.subgroup.contacts = [];
				}
				datatable('contacts', $scope.subgroup.contacts);
			}

			$scope.is_edit = {
				notes: 0,
				tmp: ''
			}
			$scope.edit = function(editable, save){
				$scope.is_edit[editable] = !$scope.is_edit[editable];
				if($scope.is_edit[editable]){
					$scope.is_edit.temp = $scope.subgroup[editable];
				}
				if(save){
					$scope.updateSubGroup();
				}else{
					$scope.subgroup[editable] = $scope.is_edit.temp;
				}
			}

			$scope.updateSubGroup = function () {
				$scope.FBobject.updateItem($scope.subgroup);
			}

			$scope.removeSubgroup = function() {
				$scope.FBobject.confirmRemoveItem($scope.subgroup, FBService.auth(), 'subgroup', $scope.products);
			};
		}
	])

	.controller('subgroupsFormCtrl', [
		'$scope', '$rootScope', '$filter', '$stateParams', 'FBService',
		function($scope, $rootScope, $filter, $stateParams, FBService) {

			$scope.is_edit = 0;
			$scope.newSubgroup = {
				groupID: $rootScope.prevStateID,
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
								payDetail: 0
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
				if(angular.isUndefined($scope.newSubgroup.contacts)){
					$scope.newSubgroup.contacts = [];
				}
				datatable('contacts', $scope.newSubgroup.contacts);
			}

			// Check is new or is edit mode
			if($stateParams.id){
				$scope.stateID = $stateParams.id;
				$scope.FBobject = FBService.init('subgroups');
				$scope.FBobject.getItem(
					$stateParams.id,
					function(item){
						$scope.newSubgroup = item;
					});
				// Get subgroup products
				$scope.FBobject.searchItems(
					'products',
					'subgroup',
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

			$scope.getSubgroupProds = function(){
				// Get subgroup products
				$scope.FBobject.searchItems(
					'products',
					'subgroup',
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

			$scope.submitSubgroup = function(is_edit) {
				if(is_edit){
					$scope.updateSubgroup($scope.newSubgroup);
				}else{
					$scope.addSubgroup($scope.newSubgroup);
				}
			}

			$scope.updateSubgroup = function (newSubgroup) {
				$scope.FBobject.updateItem(newSubgroup, $scope.products);
			}

			$scope.addSubgroup = function(newSubgroup) {
				FBService.init('subgroups').addItem(newSubgroup, $scope.products);
			};
	}])

	.controller('subgroupsCtrl', ['$scope', 'FBService', function($scope, FBService) {
		FBService.init('subgroups').getItems(
			function(subgroups){
				$scope.subgroups = subgroups;
		});
	}]);
};
