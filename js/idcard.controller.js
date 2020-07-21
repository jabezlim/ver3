(function () {
    'use strict';

    angular
        .module('app')
        .controller('GroupListCtrl', GroupListCtrl)
		.controller('CardListCtrl', CardListCtrl)
		.controller('CardUseCtrl', CardUseCtrl);

    GroupListCtrl.$inject = ['$scope', '$http', '$routeParams', '$rootScope', '$location', 'Order'];
    function GroupListCtrl($scope, $http, $routeParams, $rootScope, $location, Order) {
        var vm = this;
		vm.siteid = $routeParams.id;
		vm.mode = 0;
        vm.groups = [];
        $scope.BASE_URL = Order.BASE_URL;
		$scope.find = '';
		$scope.group = {
				siteid : vm.siteid,
				name : '',
				contact : '',
				email : '',
				param1 : 0,
				param2 : 0,
				param3 : 0
			};		
		vm.add = addGroup;
		vm.edit = addGroup;
		vm.search = searchGroup;
		vm.del = delGroup;
		vm.find = findCard;

        initController();
        
        function initController() {
            loadAllGroups();
        }

        function loadAllGroups() {
			$http.get(Order.settings.apiurl+'cards/list/'+vm.siteid)
                .then(
                    function successCallback(response) {
						if (angular.isArray(response.data)){
							vm.groups = response.data;
						} else {
							alert(response.data);
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function addGroup() {
			$http.post(Order.settings.apiurl+'cards/savegrp',$scope.group)
                .then(
                    function successCallback(response) {                          
                        loadAllGroups();
						$scope.group = {
							siteid : vm.siteid,
							name : '',
							contact : '',
							email : '',
							param1 : 0,
							param2 : 0,
							param3 : 0
						};
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
		}

		function searchGroup(id) {
			$http.get(Order.settings.apiurl+'cards/group/'+id)
                .then(
                    function successCallback(response) {
						if (response.data.length>0){						
							$scope.group = response.data[0];
							vm.mode = 1;
						} else {
							alert('group can not found !');
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function delGroup(id) {
			var res = confirm('Are you sure to delete ?');
			if (!res) return ;
			$http.post(Order.settings.apiurl+'cards/delgrp/'+id)
                .then(
                    function successCallback(response) {
						loadAllGroups();
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function findCard(id) {
			$location.path('/cards/'+vm.siteid+'/s'+$scope.find);			
        }

    }

	CardListCtrl.$inject = ['$scope', '$http', '$routeParams', '$rootScope', '$location', 'Order'];
    function CardListCtrl($scope, $http, $routeParams, $rootScope, $location, Order) {
        var vm = this;
		vm.siteid = $routeParams.id;
		vm.gid = $routeParams.gid;
        vm.cards = [];
		vm.mode = 0;
		$scope.listtype = 0;
		
		$scope.card = {
			'id' : '',
			'name' : '',
			'uid' : '',
			'gid' : vm.gid,
			'dept' : '',
			'phone' : '',
			'siteid' : vm.siteid,
			'status' : '',
			'active' : 1
			};
        $scope.BASE_URL = Order.BASE_URL;

		vm.add = addCard;
		vm.search = searchCard;
		vm.edit = addCard;
		vm.del = delCard;
		vm.find = findCard;
		
		if (vm.gid.charAt(0)=='s') {
			$scope.listtype = 1;
			vm.gid = encodeURI(vm.gid.substring(1));
		}

        initController();
        
        function initController() {
            loadAllCards();
        }

        function loadAllCards() {
			if ($scope.listtype == 1) {
				$http.get(Order.settings.apiurl+'cards/search/'+vm.gid+'/'+vm.siteid)
					.then(
						function successCallback(response) {
							vm.cards = response.data;
						}, 
						function errorCallback(response) {
							alert(response.data);
						}
					);
			} else {
				$http.get(Order.settings.apiurl+'cards/list/'+vm.siteid+'/'+vm.gid)
					.then(
						function successCallback(response) {
							vm.cards = response.data;
						}, 
						function errorCallback(response) {
							alert(response);
						}
					);
			}
        }

		function addCard() {
			$http.post(Order.settings.apiurl+'cards/save',$scope.card)
                .then(
                    function successCallback(response) {   
						if (response.data.status){						
							loadAllCards();
							$scope.card = {
								'id' : '',
								'name' : '',
								'uid' : '',
								'gid' : vm.gid,
								'dept' : '',
								'phone' : '',
								'siteid' : vm.siteid,
								'status' : '',
								'active' : 1
								};
						} else {
							alert(response.data.error_message);
						}
                    }, 
                    function errorCallback(response) {
                        alert(response.responseText);
                    }
                );
		}

		function searchCard(id) {
			$http.get(Order.settings.apiurl+'cards/tkno/'+id+'/'+vm.siteid)
                .then(
                    function successCallback(response) {
						if (response.data.status){						
							$scope.card = response.data.data;
							vm.mode = 1;
						} else {
							alert('can not found !');
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }


		function delCard(id) {
			var res = confirm('Are you sure to delete ?');
			if (!res) return ;
			$http.post(Order.settings.apiurl+'cards/remove',{'id':id, 'siteid':vm.siteid})
                .then(
                    function successCallback(response) {
						loadAllCards();
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function findCard(id) {
			$scope.listtype = 1;
			vm.gid = encodeURI($scope.find);
			loadAllCards();
        }
    }
	
	CardUseCtrl.$inject = ['$scope', '$http', '$route','$routeParams', '$rootScope', '$location', 'Order'];
    function CardUseCtrl($scope, $http, $route, $routeParams, $rootScope, $location, Order) {
        var vm = this;
		vm.siteid = $routeParams.sid;
		vm.mode = 0;
		vm.histories = [];

		$scope.card = {};
		$scope.amt1 = 0;
        $scope.BASE_URL = Order.BASE_URL;
		vm.edit = addCard;
		vm.search = loadCardData;
		vm.refund = refundCard;
		vm.find = findCard;
		vm.paid = paidCard;
		vm.charge = chargeCard;

        initController();
        
        function initController() {
			loadAllGroups();
			loadCardData($routeParams.id);						
        }

		function loadAllGroups() {
			$http.get(Order.settings.apiurl+'cards/list/'+vm.siteid)
                .then(
                    function successCallback(response) {
						if (angular.isArray(response.data)){
							vm.groups = response.data;
						} else {
							alert(response.data);
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
		}
		
        function loadHistories() {
			$http.get(Order.settings.apiurl+'cards/use/'+vm.siteid+'/'+$scope.card.id)
                .then(
                    function successCallback(response) {
                        vm.histories = response.data;
						var i;
						var balance = 0;
						for (i=0; i<vm.histories.length; i++) {							
							vm.histories[i].price = Number(vm.histories[i].price);
							balance = Number(vm.histories[i].checked_on);
							vm.histories[i].balance = balance;
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function loadCardData(id) {
			$http.get(Order.settings.apiurl+'cards/tkno/'+id+'/'+vm.siteid)
                .then(
                    function successCallback(response) {
						if (response.data.status){						
							$scope.card = response.data.data;
							loadHistories();
						} else {
							alert('can not found !');
						}
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }

		function addCard() {
			$http.post(Order.settings.apiurl+'cards/save',$scope.card)
                .then(
                    function successCallback(response) {  
						if (response.data.status){						
							alert(response.data.message);
						} else {
							alert(response.data.error_message);
						}
                    }, 
                    function errorCallback(response) {
                        alert(response.data);
                    }
                );
		}
		
		function refundCard(id) {
			var res = confirm('Are you sure to refund ?');
			if (!res) return ;
			$http.post(Order.settings.apiurl+'cards/refund/'+id+'/'+vm.siteid, $scope.card)
                .then(
                    function successCallback(response) {                          
						alert('balance refunded !');
						//loadHistories();
						//loadCardData($routeParams.id);
						$route.reload();
                    }, 
                    function errorCallback(response) {
                        alert(response.data);
                    }
                );
		}

		function findCard(id) {
			$location.path('/cards/'+vm.siteid+'/s'+$scope.find);			
        }
		
		vm.item = {			
				siteid : vm.siteid,
				orderid : 0,
				category : '밀카드',
				name : '',
				num : 1,
				price : 0,
				ticketno : 0,
				checked_on : 0,
				used_on : ''
				};
		vm.payment = {
				siteid : vm.siteid,
				orderid : 1,
				amount : 0,
				checked_by : 1
				};
		vm.order = {
				siteid : vm.siteid,
				amount : 0,
				checked_by : 2,
				ticketno : 0
				};

		function recordOrderItem(item) {   
			return $.post(Order.settings.apiurl+'OrderItems/save',item)
				.done(function(result){
					if (result.status) {				
						//alert('Payment complete ! '+vm.menu+' amount:'+vm.payment.amount+' id:'+result.id);
						//loadHistories();
						//loadCardData($routeParams.id);
						$route.reload();
					} else {
						alert('recordOrderItem error :'+result.message);					
					}
				})
				.fail(function(xhr, status, error) {
					alert('recordOrderItem error :'+error);					
				});			
		}
	
		function pad(n, width, z) {
		  z = z || '0';
		  n = n + '';
		  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
		}

		function paidCard() {
			if ($scope.amt1<=0) {
				return ;
			}
			var amt2 = Number($scope.card.balance)-Number($scope.amt1);
			if (amt2<0) return ;
			var res = confirm($scope.amt1+'원을 차감하시겠습니까?');
			if (!res) return ;			
			$http.post(Order.settings.apiurl+'cards/charged/'+$scope.card.id+'/'+vm.siteid, {price: amt2})
			.then(
				function successCallback(response) { 
					if (response.data.status) {	
						vm.item.name = "관리자차감";
						vm.item.price = $scope.amt1;
						vm.item.ticketno = $scope.card.id;
						vm.item.checked_on = amt2; 
						vm.item.orderid = -1;
						vm.item.used_on = '2018-03-01 00:00:'+pad($scope.card.gid,2);
						recordOrderItem(vm.item);
						//alert('차감되었습니다!');
						//loadHistories();
					} else {
						alert('알수 없는 이유로 실패하였습니다! 재시도 바랍니다.');
					}
				}, 
				function errorCallback(response) {
					alert(response.data);
				}
			);
		}

		function chargeCard() {
			if ($scope.amt1<=0) {
				return ;
			}
			var amt2 = Number($scope.card.balance)+Number($scope.amt1);
			var res = confirm($scope.amt1+'원을 충전하시겠습니까?');
			if (!res) return ;
			$http.post(Order.settings.apiurl+'cards/charged/'+$scope.card.id+'/'+vm.siteid, {price: amt2})
			.then(
				function successCallback(response) { 
					if (response.data.status) {					
						vm.item.name = "관리자충전";
						vm.item.price = $scope.amt1;
						vm.item.ticketno = $scope.card.id;
						vm.item.checked_on = amt2; 
						vm.item.orderid = -1;
						vm.item.used_on = '2018-03-01 00:00:'+pad($scope.card.gid,2);
						recordOrderItem(vm.item);
						//alert('충전되었습니다!');
					} else {
						alert('알수 없는 이유로 충전이 실패하였습니다! 재시도 바랍니다.');
					}					
				}, 
				function errorCallback(response) {
					alert(response.data);
				}
			);
		}
    }
})();