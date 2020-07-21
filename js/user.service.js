(function () {
    'use strict';

    angular
        .module('app')
        .factory('UserService', UserService);

    UserService.$inject = ['$http','$q', 'Order'];
    function UserService($http, $q, Order) {
        var service = {};
		var API_URL = Order.settings.apiurl+'users';

        service.GetAll = GetAll;
        service.GetById = GetById;
        service.GetByUsername = GetByUsername;
        service.Create = Create;
        service.Update = Update;
        service.Delete = Delete;

        return service;

		
        function GetAll() {
            return $http.get(API_URL).then(handleSuccess, handleError('Error getting all users'));
        }

        function GetById(id) {
            return $http.get(API_URL + '/edit/' + id).then(handleSuccess, handleError('Error getting user by id'));
        }

        function GetByUsername(username) {
            return $http.get(API_URL + '/edit/' + username).then(handleSuccess, handleError('Error getting user by username'));
        }

        function Create(user) {
            return $http.post(API_URL + '/save', user).then(handleSuccess, handleError('Error creating user'));
        }

        function Update(user) {
            return $http.put(API_URL + '/save/' + user.id, user).then(handleSuccess, handleError('Error updating user'));
        }

        function Delete(id) {
            return $http.delete(API_URL + '/remove/' + id).then(handleSuccess, handleError('Error deleting user'));
        }

        // private functions

        function handleSuccess(res) {
            //return res.data;
            return { success: true, message: res.data };
        }

        function handleError(error) {
            return function () {
                return { success: false, message: error };
            };
        }
    }

})();
