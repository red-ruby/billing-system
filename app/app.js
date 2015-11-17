/*jslint node: true */
'use strict';

var fs = require('fs');
var domify = require('domify');


var appHtml = fs.readFileSync(__dirname + '/app.html', 'utf-8');
document.body.insertBefore(domify(appHtml), document.body.firstChild);

var insertCss = require('insert-css');
var css = fs.readFileSync(__dirname + '/app.css');
insertCss(css);

//require('jquery/dist/jquery');
require('angular/angular');
require('angular-ui-router/release/angular-ui-router');

// Declare app level module which depends on views, and components
var myApp = angular.module('myApp', [
        'firebase',
        'ngSanitize',
        'xeditable',
        'appDirectives',
        'appFilters',
        'appServices',
        'ui.router',
        require('./views/carriers')(angular).name,
        require('./views/groups')(angular).name,
        require('./views/subgroups')(angular).name,
        require('./views/employees')(angular).name,
        require('./views/products')(angular).name,
        require('./views/user')(angular).name,
        require('./views/invoices')(angular).name,
        require('./views/reports')(angular).name
    ])
    .run(function(editableOptions) {
        editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    })

    .run(['$rootScope', '$state', 'Auth', function($rootScope, $state, Auth) {
        // track status of authentication
        Auth.$onAuth(function(user) {
            $rootScope.loggedIn = !!user;
            console.log('loggedIn:', $rootScope.loggedIn);
            // if user is not logged in, go to login page
            if(!$rootScope.loggedIn){
                $state.go('login');
            }
        });
     }])

    .run(["$rootScope", "$state", function($rootScope, $state) {
        $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
            // We can catch the error thrown when the $requireAuth promise is rejected
            // and redirect the user back to the home page
            if (error === "AUTH_REQUIRED") {
                $state.go('login');
            }
        });
    }])

    .constant('FIREBASE_URI', "https://dsw.firebaseIO.com/")

    .controller('LogoutCtrl', ['$rootScope','$scope', '$state', 'FIREBASE_URI', function($rootScope, $scope, $state, FIREBASE_URI) {
        var ref = new Firebase(FIREBASE_URI);

        $scope.logout = function() {
            console.log("logging out");
            ref.unauth();
        }
    }])

    .factory('Auth', ['$firebaseAuth', 'FIREBASE_URI', function($firebaseAuth, FIREBASE_URI) {
        var ref = new Firebase(FIREBASE_URI);
        return $firebaseAuth(ref);
      }
    ]);


// TODO: Move to a services.js file
var appServices = angular.module('appServices', []);
appServices
    .constant('AUTH_WAIT', {
        // controller will not be loaded until $waitForAuth resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        'currentAuth': ['Auth', function(Auth) {
            // $waitForAuth returns a promise so the resolve waits for it to complete
            return Auth.$waitForAuth();
        }]
    })
    .constant('AUTH_RESOLVE', {
        // controller will not be loaded until $requireAuth resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ["Auth", function(Auth) {
            // $requireAuth returns a promise so the resolve waits for it to complete
            // If the promise is rejected, it will throw a $stateChangeError (see above)
            return Auth.$requireAuth();
        }]
    })

    .factory('FBService', ['$rootScope','$firebaseArray', '$firebaseObject', '$state', 'FIREBASE_URI',
        function ($rootScope, $firebaseArray, $firebaseObject, $state, FIREBASE_URI) {

            var init = function(type){

                var that = this;

                this.ref = new Firebase(FIREBASE_URI + '/' + type);
                console.log('FBService Init - Type: ' + type);
                this.item_type = type;

                this.getItems = function(callback){
                    console.log('getItems: ' + that.item_type);
                    that.items = $firebaseArray(that.ref);
                    return that.items.$loaded(function(data){
                        return callback(data);
                    });
                }

                this.getItem = function (id, callback) {
                    var item = $firebaseObject(that.ref.child(id));
                    return item.$loaded(
                        function(data) {
                            if(typeof callback != 'undefined'){
                                return callback(data);
                            }
                            return data;
                        },
                        function(error) {
                            console.error("Error:", error);
                        }
                    );
                }

                this.addItem = function (item, products) {
                    that.items = $firebaseArray(that.ref);
                    that.items.$add(item).then(
                        function(ref) {
                            var id = ref.key();
                            console.log("added record with id " + id);
                            if(!angular.isUndefined(products)){
                                if(that.item_type == 'carriers'){
                                    that.handleProducts(products, id, item.name);
                                }
                            }
                            $state.go(that.item_type + '.view', {id: id});
                        }, function(error) {
                            console.log("Error:", error);
                        });
                }

                this.updateItem = function (item, products){
                    item.$save().then(
                        function(ref) {
                            var id = ref.key();
                            console.log("edited record with id " + id);

                            if(!angular.isUndefined(products)){
                                if(that.item_type == 'carriers'){
                                    that.handleProducts(products, id, item.name);
                                }
                            }
                            $state.go(that.item_type + '.view', {id: id});
                        }, function(error) {
                            console.log("Error:", error);
                        });
                }

                this.removeItem = function (item, products) {
                    item.$remove().then(
                        function(ref) {
                            if(!angular.isUndefined(products)){
                                that.removeProducts(products);
                            }
                            var id = ref.key();
                            console.log('Removed record with id ' + id);
                            $state.go(that.item_type + '.list');
                        }, function(error) {
                            console.log("Error:", error);
                        });
                }

                // Modal for confirm and enter the email before removing
                this.confirmRemoveItem = function(item, loginObj, type, products){
                    $rootScope.modal_title = 'Delete' + type + ' ' + item.name;

                    $rootScope.user = {};
                    $rootScope.modalMsg = $rootScope.modal_loading = 0;
                    $('#confirm-modal').modal('show');

                    $rootScope.confirm = function(user){
                        $rootScope.modalMsg = 0;
                        $rootScope.modal_loading = 1;
                        var authInfo = loginObj.getAuth();
                        user.email = authInfo.password.email;

                        loginObj.login(
                            user,
                            function (err, authData) {
                                console.log('err');
                                // callback
                                if (err){
                                    $rootScope.$apply(function () {
                                        $rootScope.modalMsg = err.message;
                                    });
                                }else{
                                    // No Error Success
                                    that.removeItem(item, products);
                                    $('#confirm-modal').modal('hide');
                                }
                                $rootScope.$apply(function () {
                                    $rootScope.modal_loading = 0;
                                });
                        });
                    }
                }

                this.removeProducts = function(products){
                    for (var i = products.length - 1; i >= 0; i--) {
                        products.$remove(products[i]).then(function(ref) {
                            console.log('Removed product with id ' + ref.key());
                        });
                    }
                }

                this.removeProduct = function(index){
                    var ref = new Firebase(FIREBASE_URI + '/products'),
                        products = $firebaseArray(ref);
                    products.$loaded(function(data) {
                        var product = data[index];


                        data.$remove(product).then(function(ref) {
                            console.log('Removed product ' + product.$id);
                        });

                    });
                }

                this.handleProducts = function(items, carrier_ID, name){

                    var ref = new Firebase(FIREBASE_URI + '/products'),
                        products = $firebaseArray(ref);
                    for (var i = items.length - 1; i >= 0; i--) {
                        var item = items[i];
                        // is a new product
                        if(angular.isUndefined(item.$id)){
                            delete item.isDirty;
                            // Set Carrier name and ID
                            item.carrier_ID = carrier_ID;
                            item.carrier = name;
                            products.$add(item).then(
                                function(ref) {
                                    var key = ref.key();
                                    console.log("Added record with id " + key);
                                }, function(error) {
                                    console.log("Error:", error);
                                });

                        }else if(!angular.isUndefined(item.isDirty)){ // or we edit it or added to a group
                            delete item.isDirty;
                            items.$save(item).then(
                                function(ref) {
                                    var key = ref.key();
                                    console.log("Edited record with id " + key);
                                }, function(error) {
                                    console.log("Error:", error);
                                });
                        }

                    };
                }

                this.addProdToGroup = function(products, response, group_ID, name){
                    for (var i = products.length - 1; i >= 0; i--) {
                        var item = products[i],
                            index = item.FBindex;

                        delete item.FBindex;
                        item.group_ID = group_ID;
                        response[index].$save(item).then(
                            function(ref) {
                                var id = ref.key();
                                console.log("Edited record with id " + id);
                            }, function(error) {
                                console.log("Error:", error);
                            });
                    }
                }

                this.searchItems = function(type, parent, id, callback){
                    var ref = new Firebase(FIREBASE_URI + '/' + type),
                        query = ref.orderByChild(parent + '_ID').equalTo(id);
                    return $firebaseArray(query).$loaded(function(snapshot) {
                        return callback(snapshot);
                    });
                }

                return this;
            }

            // Login
            var auth = function(){
                var ref = new Firebase(FIREBASE_URI),
                    //authObj = $firebaseAuth(ref),
                    that = this;

                this.login = function(user, callback){
                    ref.authWithPassword({
                        email: user.email,
                        password: user.password
                    }, function (err, authData) {
                        return callback(err, authData);
                    });
                }

                this.getAuth = function(){
                    return ref.getAuth();
                }

                return this;
            }

            return {
                init: function(type){
                    return new init(type);
                },
                auth: auth
            }

        }]);;

// TODO: Move to a dierectives.js file
var appFilters = angular.module('appFilters', []);
appFilters
    /**
     * Used for format Social Security Number field
     */
    .filter('ssnFilter', function() {
        return function(value, mask) {
            var len, val;
            if (mask == null) {
                mask = false;
            }
            if (value) {
                val = value.toString().replace(/\D/g, "");
                len = val.length;
                if (len < 4) {
                    return val;
                } else if ((3 < len && len < 6)) {
                    if (mask) {
                        return "***-" + (val.substr(3));
                    } else {
                        return (val.substr(0, 3)) + "-" + (val.substr(3));
                    }
                } else if (len > 5) {
                    if (mask) {
                        return "***-**-" + (val.substr(5, 4));
                    } else {
                        return (val.substr(0, 3)) + "-" + (val.substr(3, 2)) + "-" + (val.substr(5, 4));
                    }
                }
            }
            return value;
        };
    })
    /**
     * Used for masking the Social Security Number
     */
    .filter("ssnReverse", function() {
        return function(value) {
            if (!!value) {
              return value.replace(/\D/g, "").substr(0, 9);
            }
            return value;
        };
    });

// TODO: Move to a dierectives.js file
var appDirectives = angular.module('appDirectives', []);
appDirectives
    /**
     * Used for Social Security Number fields
     */
    .directive('ssnField', function($filter) {
      var ssnFilter, ssnReverse;
      ssnFilter = $filter('ssnFilter');
      ssnReverse = $filter('ssnReverse');
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, modelCtrl) {
          var formatter, mask, parser;
          mask = attrs.ssnFieldMask;
          formatter = function(value) {
            return ssnFilter(value);
          };
          parser = function(value) {
            var formatted;
            formatted = ssnReverse(value);
            element.val(ssnFilter(formatted));
            return formatted;
          };
          modelCtrl.$formatters.push(formatter);
          return modelCtrl.$parsers.unshift(parser);
        }
      };
    })
    /**
     * Used for bootstrap tabs
     */
    .directive('tabs', [function(){
        function link(scope, ele, attrs) {
            var preventDefault = function (e) {
                e.preventDefault();
                $(this).tab('show');
            };
            ele.on('click', '[role=tab]', preventDefault);

            scope.$on('$destroy', function() {
                ele.off('click', '[role=tab]', preventDefault);
            });
        }
        return {
            restrict: 'A',
            link: link
        };
    }])
    /**
     * Used for call the Accordion plugin
     */
    .directive('accordion', [function(){
        function link(scope, ele, attrs) {
            // Prevent changing the URL
            var preventDefault = function (e) {
                e.preventDefault();
            }

            ele.on('click', '[data-toggle=collapse]', preventDefault);

            scope.$on('$destroy', function() {
                ele.off('click', '[data-toggle=collapse]', preventDefault);
            });
        }
        return {
            restrict: 'A',
            link: link
        };
    }])
    /**
     * Used for call the datepicker plugin
     */
    .directive('datepicker', [function(){
        function link(scope, ele, attrs) {
            ele.datepicker();

            scope.$on('$destroy', function() {
                ele.datepicker('destroy');
            });
        }
        return {
            restrict: 'A',
            link: link
        };
    }])
    /**
     * Used on online editable fields
     */
    .directive('inputSwitch', [function(){
        function link(scope, ele, attrs) {
        	var label = $(ele).find('.input-switch-label'),
        		edit = $(ele).find('.input-switch-edit'),
        		index = attrs.index,
        		eventType = (edit.prop("tagName") === 'SELECT')?'change':'blur';
            label.on('click', function() {
                label.add(edit).toggleClass('ng-hide');
                edit.focus();
            });

            edit.on(eventType, function() {
                saveData();
            }).keypress(function (e) {
			  if (e.which == 13) {
			    edit[eventType]();
			  }
			});

			function saveData(){
				label.add(edit).toggleClass('ng-hide');
                scope.products[index].$save();
			}
        }
        return {
            restrict: 'E',
            link: link
        };
    }])
    /**
     * Autocomplete directive
     */
    .directive('autongcomplete', ['$timeout', function($timeout){
        function link(scope, ele, attrs) {
            scope.is_waiting = 0;
            ele.on('keyup', function() {
                if(scope.is_waiting){
                    return;
                }
                $timeout(
                    function(){
                        var str = scope.query;
                        if(str.length >= attrs.minLength){
                            // Show dropdown
                            scope.open = 'open';
                            scope[attrs.handler](function(items){
                                scope.response = items;
                                // Hide loading message
                                scope.is_waiting = 1;
                            });
                        }else{
                            // Hide loading message
                            scope.open = false;
                            scope.response = [];
                        }
                    }
                , attrs.pause);
            });

            scope.itemClick = function(item){
                scope[attrs.selectionHandler]({item: item, type: attrs.inputId});
                scope.hideDropdown();
            }

            scope.hideDropdown = function(){
                $timeout(
                    function(){
                        scope.query = '';
                        scope.is_waiting = scope.open = false;
                        scope.response = [];
                    },
                    500
                )
            }

            if(angular.isUndefined(attrs.watch)){
                scope.is_disable = false;
            }else{
                scope.$watch(function(scope){ return scope[attrs.watch]}, function(newValue, oldValue) {
                    scope.is_disable = (newValue)?false:true;
                });
            }
        }
        return {
            restrict: 'E',
            link: link,
            template: function(elem, attrs){
                var template = '<div class="form-group ng-class:open;"><label for="' + attrs.inputId + '" class="sr-only">'+ attrs.label + '</label>';
                template += '<input ng-disabled="is_disable" type="text" class="' + attrs.inputClass + '" placeholder="' + attrs.placeholder + '" ng-model="query" ng-blur="hideDropdown()">';
                template += '<ul class="dropdown-menu"><li ng-hide="is_waiting"><a>Loading...</a></li>';
                template += '<li ng-repeat="item in response | filter:query | limitTo: ' + attrs.limitTo + ' as results track by item.' + attrs.searchField + '"><a ng-click="itemClick(item)">{{item.name}}</a></li>';
                template += '<li ng-if="results.length == 0"><a>No results</a></li></ul></div>';
                return template;
            }
        };
    }])

    /**
     * Used editable tables
     * TODO: Find a clean way to do it
     */
    .directive('editabletable', [function(){
        function link(scope, element, attrs) {
            var nEditing = null,
                cols = Number(attrs.cols),
                oTable;

            function events() {


                element.parent()
                    .on('click', '.addRow', function () {
                        addRow(0);
                    })
                    .on('click', '.delete', function () {
                        var nRow = $(this).parents('tr')[0];
                        oTable.fnDeleteRow(nRow);
                    });

                    $(element[0]).parents('.editabletable-wrapper').find('.ti-plus').click(function(){
                        addRow(0);
                    });

            }

            function addRow(is_old) {
                var colsToAdd = [];

                if(is_old){
                    //colsToAdd = is_old;

                    var temp = [],
                        temp2 = [];
                    angular.forEach(is_old, function(value, key) {
                        angular.forEach(is_old, function(value, key) {
                          this.push(value);
                        }, temp);
                        this.push(temp);
                    },temp2);
                    colsToAdd = temp2;
                    for (var i = colsToAdd.length - 1; i >= 0; i--) {
                        for (var i = cols - 1; i >= 0; i--) {
                            if( i == cols - 1){
                                colsToAdd[i] = '<button type="button" class="delete btn btn-default">Delete <i class="fa fa-times"></i></button>';
                            }
                        }
                    }
                }else{
                    for (var i = cols - 1; i >= 0; i--) {
                        if( i == cols - 1){
                            colsToAdd[i] = '<button type="button" class="delete btn btn-default">Delete <i class="fa fa-times"></i></button>';
                        }else{
                            colsToAdd[i] = '';
                        }
                    }
                }

                var aiNew = oTable.fnAddData(colsToAdd),
                    nRow = oTable.fnGetNodes(aiNew[0]);
                editRow(oTable, nRow);
                nEditing = nRow;
            }

            function restoreRow(oTable, nRow) {
                var aData = oTable.fnGetData(nRow),
                    jqTds = $('>td', nRow);

                for (var i = 0, iLen = jqTds.length; i < iLen; i++) {
                    oTable.fnUpdate(aData[i], nRow, i, false);
                }

                oTable.fnDraw();
            }

            function editRow(oTable, nRow) {
                var aData = oTable.fnGetData(nRow),
                    jqTds = $('>td', nRow);

                for (var i = cols - 1; i >= 0; i--) {
                    if( i != cols - 1){
                        jqTds[i].innerHTML = '<input type="text" class="form-control" value="' + aData[i] + '">';
                    }
                }
            }

            function saveRow(oTable, nRow) {
                var jqInputs = $('input', nRow);

                for (var i = cols - 1; i >= 0; i--) {
                    oTable.fnUpdate(jqInputs[i].value, nRow, i, false);
                }
                oTable.fnDraw();
            }

            function plugins() {
                oTable = element.dataTable({
                    "sPaginationType": "bootstrap",
                    "sDom": "<'row'<'col-xs-6'l <'toolbar'>><'col-xs-6'f>r>t<'datatable-bottom'<'pull-left'i><'pull-right'p>>"
                });

                var $parent = element.parent();

                $('.toolbar', $parent).append('<button type="button" class="btn btn-primary mb15 ml15 addRow">Add new row</button>');

                $('.chosen', $parent).chosen({
                    width: "80px"
                });
            }

            $(function () {
                events();
                plugins();

                if(scope.is_edit){
                    scope.$watch('$scope.newGroup', function() {
                        addRow(scope.newGroup.products)
                    });
                }
            });

        }
        return {
            restrict: 'A',
            link: link
        };
    }]);

