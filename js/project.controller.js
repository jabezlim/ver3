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
			//if (vm.CTYPE.length==0) 
			{
				$http.get(API_URL+'projects/')
                .then(
                    function successCallback(response) {
                        vm.projects = response.data;
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
			} 
			/* else {
				$http.get(API_URL+'projects/type/'+vm.CTYPE)
					.then(
						function successCallback(response) {
							vm.projects = response.data;
						}, 
						function errorCallback(response) {
							
						}
					);
			}*/
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

        $scope.form = [];
		$scope.files = [];
		
		vm.uploadstatus = 0;

		$scope.submit1 = function(project) 
		{
			$scope.form.project = project;
			vm.uploadstatus = 1;
		}

		$scope.submit2 = function(project) 
		{
			$scope.form.project = project;
			vm.uploadstatus = 2;
		}

		$scope.onUpload = function() 
		{
			if (vm.uploadstatus>0)
			{
				var data = window.frames[0].document.body.innerHTML;
				//alert("Upload completed !"+data);
				if (vm.uploadstatus==1) {				
					$scope.form.project.background = data;
				} else {
					$scope.form.project.image = data;
				}				
				setTimeout(function() {
					$scope.$apply(function() {
						if (vm.uploadstatus==1)
							angular.element('body').css('background-image', 'url(\''+$scope.BASE_URL+'ci/uploads/' + data + '\')');
						vm.uploadstatus = 0;
					});
				}, 500);				
			}
		}
		
		$scope.submit = function(project) {

			$scope.form.image = $scope.files; 
			$scope.form.project = project;

			$http({
				method  : 'POST',
				url     : Order.BASE_URL+'ci/index.php/Auth/upload',  
				processData: false,
				transformRequest: function (data) {
					var formData = new FormData();
					formData.append("image", $scope.form.image);  
					formData.append("siteid", $scope.form.project.id);  
					formData.append("menuid", 0);  
					return formData;  
				},  
				data : $scope.form,
				headers: {
					'Content-Type': undefined
				}
			})			
			.then(function onSuccess(response) {
				project.background = response.data;
			}).catch(function onError(response) {
				// Handle error
				alert(response.message);
			});

		}


		$scope.uploadedFile = function(element) {
			if (element.files) {
				$scope.files = element.files[0];
			} else {
				$scope.files = element.value;				
			}
			var reader = new FileReader();
			reader.onload = function(event) {
				//var elem = angular.element("#img"+element.id);
				//elem[0].src = event.target.result;
				//angular.element('body').css('background-image', 'url(\'./ci/uploads/' + event.target.result + '\')');
				//$scope.$apply(function($scope) {
				//});
			}
			reader.readAsDataURL($scope.files);
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