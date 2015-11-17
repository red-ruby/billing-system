var fs = require('fs');
var template = fs.readFileSync(__dirname + '/employees.html', 'utf-8');
var template2 = fs.readFileSync(__dirname + '/employees.add.html', 'utf-8');
var template3 = fs.readFileSync(__dirname + '/employees.list.html', 'utf-8');
var template4 = fs.readFileSync(__dirname + '/employees.view.html', 'utf-8');

module.exports = function(angular) {
    return angular.module('myApp.employees', ['ui.router'])
        .config(['$stateProvider', 'AUTH_RESOLVE', function ($stateProvider, AUTH_RESOLVE) {
            $stateProvider
                .state('employees', {
                    url: '/employees',
                    template: template,
                    resolve: AUTH_RESOLVE

                })
                .state('employees.add', {
                    url:'/add',
                    template: template2,
                    controller: 'EmployeesFormCtrl',
                    resolve: AUTH_RESOLVE
                })
                .state('employees.edit', {
                    url:'/edit/:id',
                    template: template2,
                    controller: 'EmployeesFormCtrl',
                    resolve: AUTH_RESOLVE
                })
                .state('employees.list', {
                    url:'/list',
                    template: template3,
                    controller:'EmployeesCtrl',
                    resolve: AUTH_RESOLVE
                })
                .state('employees.view', {
                    url:'/view/:id',
                    template: template4,
                    controller:'EmployeeDetailsCtrl',
                    resolve: AUTH_RESOLVE
                });
        }])

        .controller("EmployeeDetailsCtrl",[
            '$scope', '$stateParams', 'FBService',
            function($scope, $stateParams, FBService) {
                $scope.products = [];
                $scope.FBobject = FBService.init('employees');
                $scope.FBobject.getItem(
                    $stateParams.id,
                    function(item){
                        $scope.employee = item;
                        $scope.getGroup(item.group_ID);
                        $scope.getProducts(item.products);
                    }
                );

                $scope.getGroup = function(id){
                    FBService
                        .init('groups')
                        .getItem(
                        id,
                        function(item){
                            $scope.group = item.name;
                        }
                    )};

                // Get employee products
                $scope.getProducts = function(products){
                    $scope.FBobjectProd = FBService.init('products');

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
                }



                $scope.removeEmployee = function() {
                    $scope.FBobject.confirmRemoveItem($scope.employee, FBService.auth(),'employee');
                };
            }
        ])

        .controller('EmployeesFormCtrl', [
            '$scope', '$q', '$stateParams', '$firebaseArray', 'FBService',
            function( $scope, $q, $stateParams, $firebaseArray, FBService) {
            $scope.is_edit = 0;
            $scope.newEmployee = {
                status: 0
            };

            $scope.products = [];
            $scope.tmpResponse = [];

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

                /*$scope[type].filteredItems = [];
                $scope[type].groupedItems = [];
                $scope[type].pagedItems = [];
                $scope[type].itemsPerPage = $scope[type].gap = 10;
                $scope[type].currentPage = 0;*/

                $scope.datatable[type].itemsPerPage = 10;

                /*var searchMatch = function (haystack, needle) {
                    if (!needle) {
                        return 1;
                    }
                    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
                }

                // init the filtered items
                $scope[type].search = function () {
                    $scope[type].filteredItems = $filter('filter')(items, function (item) {
                        for(var attr in item) {
                            if (searchMatch(item[attr], $scope[type].query)){
                                return 1;
                            }
                        }
                        return 0;
                    });
                    // take care of the sorting order
                    if ($scope[type].sort.sortingOrder !== '') {
                        $scope[type].filteredItems = $filter('orderBy')($scope[type].filteredItems, $scope[type].sort.sortingOrder, $scope[type].sort.reverse);
                    }
                    $scope[type].currentPage = 0;
                    // now group by pages
                    $scope[type].groupToPages();
                }

                // calculate page in place
                $scope[type].groupToPages = function () {
                    $scope[type].pagedItems = [];

                    for (var i = 0; i < $scope[type].filteredItems.length; i++) {
                        if (i % $scope[type].itemsPerPage === 0) {
                            $scope[type].pagedItems[Math.floor(i / $scope[type].itemsPerPage)] = [ $scope[type].filteredItems[i] ];
                        } else {
                            $scope[type].pagedItems[Math.floor(i / $scope[type].itemsPerPage)].push($scope[type].filteredItems[i]);
                        }
                    }
                }

                // Get range for pagination
                $scope[type].range = function (size, start, end) {
                    var ret = [];
                    if (size < end) {
                        end = size;
                        start = size-$scope[type].gap;
                    }
                    for (var i = start; i < end; i++) {
                        ret.push(i);
                    }
                    return ret;
                }

                $scope[type].prevPage = function () {
                    if ($scope[type].currentPage > 0) {
                        $scope[type].currentPage--;
                    }
                }

                $scope[type].nextPage = function () {
                    if ($scope[type].currentPage < $scope[type].pagedItems.length - 1) {
                        $scope[type].currentPage++;
                    }
                }

                $scope[type].setPage = function (page) {
                    $scope[type].currentPage = page;
                }*/

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
                    // Remove from the original array
                    items.splice(index, 1);

                    if($scope.is_edit && type == 'products'){
                        delete $scope.newEmployee.products[item.$id];
                    }
                }


                // Start table
                //$scope[type].search();

            }

            // Add a row on the products table
            $scope.addRow = function(paramObj){
                var item,
                    type;

                item = paramObj.item;
                type = paramObj.type;
                index = $scope.response.indexOf(item);
                $scope.newEmployee.products[item.$id] = true;
                //$scope.tmpResponse[index] = $scope.response;
                item.FBindex = index;

                // Add the new item
                $scope[type].push(item);
                // Recalculate what to show
                //$scope[type].search();
            }

            function startTables(){
                // Start products table
                if(angular.isUndefined($scope.products)){
                    $scope.products = [];
                }
                datatable('products', $scope.products);
            }

            $scope.getGroups = function(){
                // Get groups
                $scope.FBobjectGroups = FBService.init('groups')
                $scope.FBobjectGroups.getItems(
                    function(groups){
                        $scope.groups = groups;
                        // Hack for showing the selected group
                        $scope.group = {$id:$scope.newEmployee.group_ID};
                        console.log('Groups', groups);
                    });
            }

            // Check is new or is edit mode
            if($stateParams.id){
                $scope.stateID = $stateParams.id;
                $scope.FBobject = FBService.init('employees')
                $scope.FBobject.getItem(
                    $stateParams.id,
                    function(item){
                        if(angular.isUndefined(item.products)){
                            item.products = {};
                        }else{
                            $scope.getProds(item.products, startTables, 1);
                        }
                        $scope.newEmployee = item;
                        $scope.getGroups();
                    });
                $scope.is_edit = 1;
            }else{
                $scope.getGroups();
                startTables();
            }

            $scope.getGroupProds = function(callback){
                return $scope.getProds($scope.groupSelected.products, callback, 0);
            }

            $scope.getProds = function(prods, callback, isEmployee){
                // Get groups products
                $scope.FBobjectProd = FBService.init('products');
                var deferred = $q.defer(),
                    promise = deferred.promise,
                    products = [];
                angular.forEach(prods, function(value, key){
                    $scope.FBobjectProd.getItem(
                        key,
                        function(product){
                            console.log('product: ', product);
                            products.push(product);
                        }
                    );
                });
                $q.all(products).then(function () {
                    if(isEmployee){
                        $scope.products = products;
                        callback();
                        return;
                    }
                    return callback(products);
                });
                deferred.resolve();
            }

            $scope.submitEmployee = function(is_edit) {
                $scope.newEmployee.group_ID = $scope.group.$id;
                if(is_edit){
                    $scope.updateEmployee($scope.newEmployee);
                }else{
                    $scope.addEmployee($scope.newEmployee);
                }
            }

            $scope.updateEmployee = function (newEmployee) {
                $scope.FBobject.updateItem(newEmployee);
            }

            $scope.addEmployee = function(newEmployee) {
                FBService.init('employees').addItem(newEmployee);
            };
        }])

        .controller('EmployeesCtrl', ['$scope', 'FBService',
            function( $scope, FBService ) {
                FBService.init('employees').getItems(
                    function(employees){
                        $scope.employees = employees;
                });
            }
        ]);
};
