(function () {
    'use strict';

    angular
        .module('app')
        .controller('ProjectListCtrl', ProjectListCtrl)
		.controller('ProjectDetailCtrl', ProjectDetailCtrl);

    ProjectListCtrl.$inject = ['$scope', '$http', 'UserService', '$rootScope', '$location','$window', 'Order'];
    function ProjectListCtrl($scope, $http, UserService, $rootScope, $location,$window, Order) {
        var vm = this;

        vm.user = null;
        vm.projects = [];
        vm.destroy = deleteProject;
		vm.edit = editProject;
        vm.add = addProject;
        vm.editmenu = editMenu;
        vm.viewmenu = viewMenu;
        vm.printmenu = printMenu;
		vm.editinfo = editInfo;

		var API_URL = Order.settings.apiurl;
		vm.CTYPE = Order.settings.ctype;
        
        initController();

        $scope.listfilter = function(project){
            return (project.active>0) && ((project.owner === vm.user.user_id) || (vm.user.is_admin === true));
        };
        
        function initController() {
            loadCurrentUser();
            loadAllProjects();
        }

        function loadCurrentUser() {
            if ($rootScope.globals.currentUser!=undefined) {
                vm.user = $rootScope.globals.currentUser.userinfo;
            } else {
                vm.user = {id:0, username:'user'};
            }
        }

        function loadAllProjects() {
			if (vm.CTYPE.length==0)
			{
				$http.get(API_URL+'projects/')
                .then(
                    function successCallback(response) {
                        vm.projects = response.data;
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
			} else {
				$http.get(API_URL+'projects/type/'+vm.CTYPE)
					.then(
						function successCallback(response) {
							vm.projects = response.data;
						}, 
						function errorCallback(response) {
							
						}
					);
			}
        }

        function deleteProject(Project) {
			$http.delete(API_URL + 'projects/remove/' + Project.id)
                .then(
                    function successCallback(response) {
						vm.projects.splice(vm.projects.indexOf(Project), 1);
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
        }

		function editProject(project) {
			$http.post(API_URL + 'projects/save/' + project.id, project)
                .then(
                    function successCallback(response) {
                        return true;
                    }, 
                    function errorCallback(response) {
                        return false;
                    }
                );
		}
        
        function addProject() {
			$scope.project.indexurl = vm.CTYPE;
			$http.post(API_URL+'projects/save',$scope.project)
                .then(
                    function successCallback(response) {                          
                        loadAllProjects();
						$scope.project.name = '';
						$scope.project.description = '';
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
		}
        
        function editMenu(siteid) {
            $location.path('editmenu/'+siteid);
        }
        
        function viewMenu(siteid) {
            $location.path('viewmenu/'+siteid);
        }
        
        function printMenu(siteid) {
			$location.path('posview/'+siteid);
        }

		function editInfo(siteid) {
            $location.path('project/'+siteid);
        }
    }
	

	ProjectDetailCtrl.$inject = ['$routeParams', '$scope', '$http', '$rootScope', '$location','Order'];
    function ProjectDetailCtrl($routeParams, $scope, $http, $rootScope, $location,Order) {
        var vm = this;
		var API_URL = Order.settings.apiurl;

		vm.siteid = $routeParams.id;
		vm.project = {};
		// 0: disable
		// 1: active
		// 2: takeout / dinein
		// 3: print ticket
		// 4: mealcard
		$scope.prjopts = ['0','1','2','3','4'];


		function loadSiteData(siteid) {
            $http.get(API_URL+'projects/edit/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.project = response.data;    						
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
        }
		
		loadSiteData(vm.siteid);

		$scope.save = function() {
			$http.post(API_URL+'projects/save/'+vm.siteid,vm.project)
                .then(
                    function successCallback(response) {    
						$location.path('/');
                    }, 
                    function errorCallback(response) {
                    }
                );
			
		}

	}

})();