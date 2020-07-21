(function () {
    'use strict';

    angular
        .module('app')		
		.controller('EditMenuController', EditMenuController);
    
    EditMenuController.$inject = ['$routeParams', '$http', '$scope','$location', '$rootScope', 'Order'];
    function EditMenuController($routeParams, $http, $scope, $location, $rootScope, Order) {
        var vm = this;
		vm.order = Order;
        var API_URL = Order.settings.apiurl;
        
        vm.categories = [];
        vm.menus = [];
        vm.siteid = $routeParams.id;        
        vm.categoryid = $routeParams.cat==undefined?0:$routeParams.cat;
        vm.newcat = {
                siteid:$routeParams.id,
                name:''
            };
        vm.cururl = $location.absUrl();
        
        vm.edit = editMenu;
        vm.catedit = editCategory;
		vm.catdelete = deleteCategory;
        vm.delete = deleteMenu;
        vm.addcat = addCategory;
		vm.addmenu = addMenu;

        vm.user = $rootScope.globals.currentUser.userinfo;
        
        loadSiteData(vm.siteid);
        
        $scope.setCategory = function(cat) {
			vm.category = cat;
            vm.categoryid = cat.id;
			vm.menu.catid = vm.categoryid;
            loadMenuData(vm.siteid, vm.categoryid);
        }
        
        function addCategory() {
            $http.post(API_URL+'categories/save',vm.newcat)
                .then(
                    function successCallback(response) {  
                        vm.category = response.data;
						vm.categoryid = vm.category.id;
                        vm.newcat.name = '';
                        loadSiteData(vm.siteid);
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
        }

		function addMenu() {
            $http.post(API_URL+'menus/save',vm.menu)
                .then(
                    function successCallback(response) {                          
                        loadMenuData(vm.siteid, vm.categoryid);
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }
        
        function loadSiteData(siteid) {
            $http.get(API_URL+'projects/edit/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.site = response.data;    
                        if (vm.user.is_admin || (vm.site.owner == vm.user.user_id)) {
                            loadCategory(siteid);
                        } else {
                            $location.path('/');
                        }
                    }, 
                    function errorCallback(response) {
                        $location.path('/');
                    }
                );
        }
        
        function loadCategory(siteid) {
            $http.get(API_URL+'categories/index/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.categories = response.data;                            
                        if (vm.categoryid == 0) {
                            if (vm.categories.length>0) {
                                vm.category = vm.categories[0];
								vm.categoryid = vm.category.id;
                            }
                        }
                        loadMenuData(siteid, vm.categoryid);
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
        }
        
        function loadMenuData(siteid, catid) {            
            $http.get(API_URL+'menus/index/'+siteid+'/'+catid)
                .then(
                    function successCallback(response) {
                        vm.menus = response.data;
                        vm.menu = {
                            siteid : vm.siteid,
							catid : vm.categoryid,
                            name : '',
                            description : '',
                            price : 3000,
                            qty : 1,
							opt : 0,
							image : vm.site.menuimg
                        }
                    }, 
                    function errorCallback(response) {
                    
                    }
                );
        }
        
        function editCategory(cat) {
            $http.post(API_URL + 'categories/save/' + cat.id, cat)
                .then(
                    function successCallback(response) {
                        return true;
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
        } 
        
		function deleteCategory(catid) {
            $http.delete(API_URL + 'categories/remove/' + catid)
                .then(
                    function successCallback(response) {
						vm.category = undefined;
                        vm.categoryid = 0;
                        vm.newcat.name = '';
                        loadSiteData(vm.siteid);
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
        }

        function editMenu(menu) {
            $http.post(API_URL + 'menus/save/' + menu.id, menu)
                .then(
                    function successCallback(response) {
                        return true;
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
        } 
        
        function deleteMenu(menu) {
            $http.post(API_URL + 'menus/remove/' + menu.id)
                .then(
                    function successCallback(response) {
                        loadMenuData(vm.siteid, vm.categoryid);
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
        }
        
    }	
	
})();
