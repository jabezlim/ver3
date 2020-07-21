(function () {
    'use strict';

    angular
        .module('app')
		.directive('passwordVerify', function() {
			return {
				require: 'ngModel',
				scope: {
					passwordVerify: '='
				},
				link: function(scope, element, attrs, ctrl) {
					scope.$watch(function() {
						var combined;						
						if (scope.passwordVerify || ctrl.$viewValue) {
						   combined = scope.passwordVerify + '_' + ctrl.$viewValue; 
						}                    
						return combined;
					}, function(value) {
						if (value) {
							ctrl.$parsers.unshift(function(viewValue) {
								var origin = scope.passwordVerify;
								if (origin !== viewValue) {
									ctrl.$setValidity('passwordVerify', false);
									return undefined;
								} else {
									ctrl.$setValidity('passwordVerify', true);
									return viewValue;
								}
							});
						}
					});
				}
			};
		})
		.controller('RegisterController', RegisterController);

    RegisterController.$inject = ['UserService', '$location', '$rootScope', 'FlashService'];
    function RegisterController(UserService, $location, $rootScope, FlashService) {
        var vm = this;

        vm.register = register;

        function register() {
            vm.dataLoading = true;
            UserService.Create(vm.user)
                .then(function (response) {
                    if (response.success) {
                        FlashService.Success('Registration successful', true);
                        $location.path('/login');
                    } else {
                        FlashService.Error(response.message);
                        vm.dataLoading = false;
                    }
                });
        }
    }
	
	
})();
