(function () {
    'use strict';

    angular
        .module('app', ['ngRoute', 'ngCookies'])
        .config(config)
        .run(run);

    config.$inject = ['$routeProvider', '$locationProvider'];
    function config($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', {
                controller: 'ProjectListCtrl',
                templateUrl: './view/list.view.html',
                controllerAs: 'vm'
            })
        
			.when('/project/:id', {
                controller: 'ProjectDetailCtrl',
                templateUrl: './view/detail.view.html',
                controllerAs: 'vm'
            })

			.when('/cards/:id', {
                controller: 'GroupListCtrl',
                templateUrl: './view/grplist.view.html',
                controllerAs: 'vm'
            })

			.when('/cards/:id/:gid', {
                controller: 'CardListCtrl',
                templateUrl: './view/cardlist.view.html',
                controllerAs: 'vm'
            })

			.when('/viewcard/:sid/:id', {
                controller: 'CardUseCtrl',
                templateUrl: './view/carduse.view.html',
                controllerAs: 'vm'
            })

            .when('/account/:id', {
                controller: 'AccountListCtrl',
                templateUrl: './view/account.view.html',
                controllerAs: 'vm'
            })  
        
            .when('/accmenu/:id', {
                controller: 'AccountMenuCtrl',
                templateUrl: './view/accmenu.view.html',
                controllerAs: 'vm'
            }) 
        
            .when('/account/:id/:date', {
                controller: 'AccountListCtrl',
                templateUrl: './view/account.view.html',
                controllerAs: 'vm'
            })  
        
            .when('/accmenu/:id/:date', {
                controller: 'AccountMenuCtrl',
                templateUrl: './view/accmenu.view.html',
                controllerAs: 'vm'
            }) 

			.when('/personal/:id/:gid/:date', {
                controller: 'AccountPersonalCtrl',
                templateUrl: './view/personal.view.html',
                controllerAs: 'vm'
            }) 
        
            .when('/payments/:id', {
                controller: 'PaymentListCtrl',
                templateUrl: './kftc/payments.view.html',
                controllerAs: 'vm'
            })
        
            .when('/payments/:id/:date/:cardtype', {
                controller: 'PaymentListCtrl',
                templateUrl: './kftc/payments.view.html',
                controllerAs: 'vm'
            })
        
            .when('/editmenu/:id', {
                controller: 'EditMenuController',
                templateUrl: './view/editmenu.view.html',
                controllerAs: 'vm'
            })
        
            .when('/editmenu/:id/:cat', {
                controller: 'EditMenuController',
                templateUrl: './view/editmenu.view.html',
                controllerAs: 'vm'
            })
        
            .when('/viewmenu/:id', {
                controller: 'ViewMenuController',
                templateUrl: './payco/menu.view.html',
                controllerAs: 'vm'
            })
        
			.when('/paycash', {
                controller: 'CashController',
                templateUrl: './cash/cash.view.html',
                controllerAs: 'vm'
            })

			.when('/paycard', {
                controller: 'CardController',
                templateUrl: './kftc/card.view.html',
                controllerAs: 'vm'
            })

            .when('/payco', {
                controller: 'PaycoController',
                templateUrl: './payco/payco.view.html',
                controllerAs: 'vm'
            })
			
			.when('/paycard/:checktype', {
                controller: 'CardController',
                templateUrl: './kftc/card.view.html',
                controllerAs: 'vm'
            })
			
			.when('/manpay', {
                controller: 'ManpayController',
                templateUrl: './view/manpay.view.html',
                controllerAs: 'vm'
            }) 

            .when('/posview/:id', {
                controller: 'PosViewController',
                templateUrl: './view/pos.view.html',
                controllerAs: 'vm'
            })
            
            .when('/posview/:id/:cat', {
                controller: 'PosViewController',
                templateUrl: './view/pos.view.html',
                controllerAs: 'vm'
            })
        
            .when('/login', {
                controller: 'LoginController',
                templateUrl: './view/login.view.html',
                controllerAs: 'vm'
            })

            .when('/register', {
                controller: 'RegisterController',
                templateUrl: './view/register.view.html',
                controllerAs: 'vm'
            })
        
            .when('/userdetail/:id', {
                controller: 'UserDetailController',
                templateUrl: './view/userdetail.view.html',
                controllerAs: 'vm'
            })

            .otherwise({ redirectTo: '/login' });
    }

    run.$inject = ['$rootScope', '$location', '$cookieStore', '$http'];
    function run($rootScope, $location, $cookieStore, $http) {
        // keep user logged in after page refresh
        $rootScope.globals = $cookieStore.get('globals') || {};
        if ($rootScope.globals.currentUser) {
            $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata; // jshint ignore:line
        }

        $rootScope.$on('$locationChangeStart', function (event, next, current) {
            // redirect to login page if not logged in and trying to access a restricted page
            var restrictedPage = $.inArray($location.path(), ['/login', '/register', '/']) === -1;
            if ($location.path().search('viewmenu')>=0) restrictedPage = false;
			if ($location.path().search('posview')>=0) restrictedPage = false;
            if ($location.path().search('payments')>=0) restrictedPage = false;
			if ($location.path().search('paycash')>=0) restrictedPage = false;
            if ($location.path().search('paycard')>=0) restrictedPage = false;
            if ($location.path().search('zeropay')>=0) restrictedPage = false;
			if ($location.path().search('manpay')>=0) restrictedPage = false;
			if ($location.path().search('account')>=0) restrictedPage = false;
			if ($location.path().search('accmenu')>=0) restrictedPage = false;
            if ($location.path().search('charger')>=0) restrictedPage = false;
            if ($location.path().search('payco')>=0) restrictedPage = false;
            var loggedIn = $rootScope.globals.currentUser;
            if (restrictedPage && !loggedIn) {
                $location.path('/login');
            }
        });
    }
	
})();