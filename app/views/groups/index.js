var fs = require('fs');
var template = fs.readFileSync(__dirname + '/groups.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/groups.add.html', 'utf-8');
var template3 = fs.readFileSync(__dirname + '/groups.list.html', 'utf-8');
var template4 = fs.readFileSync(__dirname + '/groups.view.html', 'utf-8');

module.exports = function(angular) {
	return angular
		.module('myApp.groups', ['ui.router'])
		.config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
			$stateProvider
				.state('groups', {
					url: '/groups',
					template: template,
					resolve: AUTH_RESOLVE
				})
				.state('groups.add', {
					url: '/add',
					template: template2,
					controller: 'GroupFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('groups.edit', {
					url: '/edit/:id',
					template: template2,
					controller: 'GroupFormCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('groups.list', {
					url: '/list',
					template: template3,
					controller: 'GroupsCtrl',
					resolve: AUTH_RESOLVE
				})
				.state('groups.view', {
					url: '/view/:id',
					template: template4,
					controller: 'GroupDetailsCtrl',
					resolve: AUTH_RESOLVE
				});
		}])

		.controller("GroupDetailsCtrl",['$scope', '$rootScope', 'FBService', '$stateParams',
			function($scope, $rootScope, FBService, $stateParams) {

			$rootScope.prevStateID = $stateParams.id;
			// now since you are using firebase you need to call service which returns data by id
			$scope.FBobject = FBService.init('groups');
			$scope.FBobject.getItem(
				$stateParams.id,
				function(group){
					$scope.group = group;
				}
			);

			$scope.getEmployees = function(){
				$scope.FBobject.searchItems(
					'employees',
					'group',
					$stateParams.id,
					function(items){
						console.log('employees', items);
						$scope.group.employees = items;
					}
				)};

			// Select "all" on employee dropdown
			$scope.statusFilter = '0';

			$scope.is_edit = {
				processingNotes: 0,
				tmp: ''
			}
			$scope.edit = function(editable, save){
				$scope.is_edit[editable] = !$scope.is_edit[editable];
				if($scope.is_edit[editable]){
					$scope.is_edit.temp = $scope.group[editable];
				}
				if(save){
					$scope.updateGroup();
				}else{
					$scope.group[editable] = $scope.is_edit.temp;
				}
			}

			$scope.updateGroup = function () {
				$scope.FBobject.updateItem($scope.group);
			}

			$scope.removeGroup = function() {
				$scope.FBobject.confirmRemoveItem($scope.group, FBService.auth(),'group');
			};

		}])

		.controller('GroupFormCtrl', ['$scope', '$q', '$filter', '$stateParams', 'FBService', function($scope, $q, $filter, $stateParams, FBService) {

			$scope.is_edit = 0;
			// Set defaults
			$scope.newGroup = {
				status: 0,
				deductionFrequency: 0,
				payrollDay: 0,
				billingFrequency: 0,
				billingMethod: 0,
				paymentMethod: 0,
				products: {},
				contacts: {
					primary: [],
					broker: []
				}
			}

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
								taxStatus: '',
								name: '',
								carrier: '',
								groupID: '',
								billing: '',
								lastAudit: ''
							}
						}
						break;
					case 'primary':
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
					case 'broker':
						$scope.datatable[type].row = function(){
							return {
								firstName: '',
								lastName: '',
								company: '',
								email: ''
							}
						}
						break;
				}


				// Table var and functions
				$scope.datatable[type].sort = {
					sortingOrder : '',
					reverse : 0
				}

				if(type == 'broker' || type == 'primary'){
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

				// Remove a row on the products table
				$scope.datatable[type].removeRow = function(item, $index) {
					// Get the index from the original array
					var index = items.indexOf(item);
					if(type == 'broker' || type == 'primary'){
						// Save the current page
						var currentPage = $scope.datatable[type].currentPage;
					}
					// Remove from the original array
					items.splice(index, 1);

					if($scope.is_edit && type == 'products'){
						$scope.removedProds.push(index);
						delete $scope.newGroup.products[item.$id];
					}
					if(type == 'broker' || type == 'primary'){
					// Remove from the page array
						$scope.datatable[type].pagedItems[currentPage].splice($index, 1);
						// Recalculate what to show
						$scope.datatable[type].search();
						// Go back to current page
						$scope.datatable[type].setPage(currentPage);
					}
				}

				if(type == 'broker' || type == 'primary'){
					// Start table
					$scope.datatable[type].search();
				}

			}

			// Add a row on the products table
			$scope.addRow = function(paramObj){
				var item,
					type;
				if(paramObj == 'broker' || paramObj == 'primary'){
					type = paramObj;
					item = $scope.datatable[type].row();
				}else{
					item = paramObj.item;
					type = paramObj.type;
					index = $scope.response.indexOf(item);
					$scope.newGroup.products[item.$id] = true;
					item.FBindex = index;

					// Add the new item
					$scope[type].push(item);
				}

				if(type == 'broker' || type == 'primary'){
					// Add the new item
					$scope.newGroup.contacts[type].push(item);
					// Recalculate what to show
					$scope.datatable[type].search();
				}
			}


			function startTables(){
				// Start products table
				if(angular.isUndefined($scope.products)){
					$scope.products = [];
				}
				datatable('products', $scope.products);

				// Start primary contacts table
				if(angular.isUndefined($scope.newGroup.contacts)){
					$scope.newGroup.contacts = {};
				}
				if(angular.isUndefined($scope.newGroup.contacts.primary)){
					$scope.newGroup.contacts.primary = [];
				}
				datatable('primary', $scope.newGroup.contacts.primary);
				// Start broker contacts table
				if(angular.isUndefined($scope.newGroup.contacts.broker)){
					$scope.newGroup.contacts.broker = [];
				}
				datatable('broker', $scope.newGroup.contacts.broker);
			}

			// Check is new or is edit mode
			if($stateParams.id){
				$scope.stateID = $stateParams.id;
				$scope.FBobject = FBService.init('groups')
				$scope.FBobject.getItem(
					$stateParams.id,
					function(group){
						if(angular.isUndefined(group.products)){
							group.products = {};
						}else{
							$scope.getGroupProds(group.products);
						}
						$scope.newGroup = group;
					});
				$scope.is_edit = 1;
				$scope.removedProds = [];
			}else{
				startTables();
			}

			$scope.getGroupProds = function(products){
				// Get groups products
				$scope.FBobjectProd = FBService.init('products');
				var deferred = $q.defer();
				var promise = deferred.promise;
				angular.forEach(products, function(value, key){
					console.log(value, key);
					$scope.FBobjectProd.getItem(
						key,
						function(product){
							console.log('product: ', product);
							$scope.products.push(product);
						}
					);
				});
				$q.all($scope.products).then(function () {
					startTables();
				});
				deferred.resolve();
			}


			$scope.submitGroup = function(is_edit) {
				if(is_edit){
					$scope.updateGroup($scope.newGroup);
				}else{
					$scope.addGroup($scope.newGroup);
				}
			}

			$scope.addGroup = function(newGroup) {
				FBService.init('groups').addItem(newGroup);
			}

			$scope.updateGroup = function (newGroup) {
				$scope.FBobject.updateItem(newGroup);
			}

			// Get the products from the carrier
			$scope.getProducts = function (callback) {
				return FBService.init('products').getItems(
					function(products){
						return callback(products);
					}
				);
			}
		}])

		.controller('GroupsCtrl', ['$scope', 'FBService', function($scope, FBService) {
			// Get groups
			FBService.init('groups').getItems(
				function(groups){
					$scope.groups = groups;
			});
		}]);
};
