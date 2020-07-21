(function () {
    'use strict';

    angular
        .module('app')		
		.controller('UserDetailController', UserDetailController)
        .directive('passwordVerify1', passwordVerify1);

    function passwordVerify1() {
        return {
				require: 'ngModel',
				scope: {
					passwordVerify1: '='
				},
				link: function(scope, element, attrs, ctrl) {
					scope.$watch(
                        function() {
                            var combined;						
                            if (scope.passwordVerify1 || ctrl.$viewValue) {
                               combined = scope.passwordVerify1 + '_' + ctrl.$viewValue; 
                            }                    
                            return combined;
				        }, 
                        function(value) {
                            if (value) {
                                ctrl.$parsers.unshift(function(viewValue) {
                                    var origin = scope.passwordVerify1;
                                    if (origin !== viewValue) {
                                        ctrl.$setValidity('passwordVerify1', false);
                                        return undefined;
                                    } else {
                                        ctrl.$setValidity('passwordVerify1', true);
                                        return viewValue;
                                    }
                                });
                            }
					   }
                    );
				}
			};
    }
    
    UserDetailController.$inject = ['UserService', '$location', '$routeParams', 'FlashService'];
    function UserDetailController(UserService, $location, $routeParams, FlashService) {
        var vm = this;

        vm.user = null;
        vm.update = update;
        
        loadUserData($routeParams.id);
        
        function loadUserData(id) {
            UserService.GetById(id)
                .then(function (res) {
                    vm.user = res.message;
                    vm.user.password = '';
                });
        }
        
        function update() {
            vm.dataLoading = true;
            UserService.Update(vm.user)
                .then(function (response) {
                    if (response.success) {
                        FlashService.Success('Update successful', true);
                        $location.path('/');
                    } else {
                        FlashService.Error(response.message);
                        vm.dataLoading = false;
                    }
                });
        }
    }
	
	
})();
