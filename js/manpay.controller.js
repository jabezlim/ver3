(function () {
    'use strict';

    angular
        .module('app')		
		.controller('ManpayController', ManpayController);
    
    ManpayController.$inject = ['$http', '$scope', '$timeout', '$filter', '$location', 'Order', 'PrintService'];
    function ManpayController($http, $scope, $timeout, $filter, $location, Order, PrintService) {
        var vm = this;
        var API_URL = Order.settings.apiurl;
        var i = 0;
        var status;        
        var mytimeout; 
        
		vm.cashif = cashif;	
		vm.order = Order;
		$scope.BASE_URL = Order.BASE_URL;
		
		vm.totalpaid = 0;

        vm.viewmode = 'cashmode';
        vm.balance = 0;
        vm.cashocxver = 0;                
       
        vm.curmode = 0;		  
        
        vm.payment = Order.payment;
		
		vm.state = 0;
		vm.RevTitle = "영 수 증";	
		vm.retry = 3;
		$scope.paid = 0;
        $scope.bal = 0;

		function ocxcmd(cmd) {
			if ("ActiveXObject" in window) {			
				return cashif.BNCmd(cmd);
			}
			return -1;
		}

		function ocxlog(logdata) {
			ocxcmd('LG'+logdata);
		}

        /**********************************
        // record transaction
        ***********************************/         
        function pausecomp(millis)
        {
            var date = new Date();
            var curDate = null;
            do { curDate = new Date(); }
            while(curDate-date < millis);
        }
		
		function gotoMenu() 
		{
			$location.path(Order.MENU_URL);	
		}

		function printOrder()
		{
			var prtres = PrintService.OrderPrint1(vm, vm.order, Order.selmenu);
			if (prtres!=123) {
				$scope.RcvState += 'print1 error :'+prtres;
			}
			prtres = PrintService.OrderPrint2(vm, vm.order, Order.selmenu);
			if (prtres!=123) {
				$scope.RcvState += ' print2 error :'+prtres;
			}
		}

        function handleReceipt()
        {
			printOrder();
			if ($scope.breceipt1 == '3') {
				//$scope.cashreceipt(vm.order.amount, 3);
				$location.path('/paycard/3');
			} else if ($scope.breceipt1 == '13') {
				//$scope.cashreceipt(vm.order.amount, 13);
				$location.path('/paycard/13');
			} else {                  
				if ($scope.breceipt1 == '1') {
					PrintService.receiptPrint(vm, Order.selmenu, vm.payment);
				}
				gotoMenu();
			}                
        }
        
		function recordPayment(payment) {     
			Order.recordPayment(payment).then(function(res) {
				if (res) {
					var idx = 0;
					for (idx=0; idx<Order.selmenu.length; idx++) {
						if (Order.selmenu[idx].dsporder==899) {
							Order.updateOrderItem(idx).then(function(res) {
								if (res>=0) {
									if (res==Order.selmenu.length) {
										handleReceipt();
									}
								} else {
									$scope.RcvState += " updateOrderItem:"+idx+" failure";
									ocxlog("updateOrderItem:"+idx+" failure "+ Order.error);
								}
							});
						} else {
							Order.recordOrderItem(idx).then(function(res) {
								if (res>=0) {
									if (res==Order.selmenu.length) {
										handleReceipt();
									}
								} else {
									$scope.RcvState += " recordOrderItem:"+idx+" failure";
									ocxlog("recordOrderItem:"+idx+" failure "+ Order.error);
								}
							});
						}
					}
				} else {
					$scope.RcvState += " recordPayment failure";
					ocxlog('recordPayment failure '+ Order.error + ' data:'+JSON.stringify(vm.payment));
					if (--vm.retry>0) {
						pausecomp(1000);
						ocxlog('recordPayment retry...');
						recordPayment(vm.payment);
					} else {
						ocxlog('recordPayment aborted !');
						handleReceipt();
					}
				}				
			});
		}

       
        function recordOrder(checktype) {     
			Order.recordOrder(checktype).then(function(res) {				
				if (res) {	
					vm.retry = 3;
					vm.payment.orderid = Order.id;
					vm.payment.checked_by = Order.checked_by;	
					vm.payment.id = undefined; // make sure
					recordPayment(vm.payment);
				} else {
					$scope.RcvState += " recordOrder failure";
					ocxlog('recordOrder failure ' + Order.error);
					if (--vm.retry>0) {
						pausecomp(1000);
						ocxlog('recordOrder retry...');
						recordOrder(checktype);
					} else {
						ocxlog('recordOrder aborted !');
						handleReceipt();
					}
				}				
			});
        }
        
        function updatePayment() {         
            var payid = vm.payment.id;            
            $http.post(API_URL+'payments/edit/'+payid,vm.payment)
                .then(
                    function successCallback(response) {                          
                        PrintService.receiptPrint(vm, Order.selmenu, vm.payment);
                        gotoMenu();
                    }, 
                    function errorCallback(response) {
                        alert('updatePayment error '+response.status);
                    }
                );
        }
                        
        $scope.cashreceipt = function(amount, type) {             			
			if (type==3) {
				//$location.path('/paycard/3');
				$scope.breceipt1 = '3';
			} else { 
				//$location.path('/paycard/13');
				$scope.breceipt1 = '13'
			}                 
			$scope.manualOrder();
        }
               
        $scope.backtomenu1 = function() {    
			ocxlog('수동거래취소 잔액:'+$scope.bal);
			gotoMenu();
        }

		vm.reloadsite = function() {
            gotoMenu();
        }

		$scope.pay = function(money) {
            if (money==0) {
                $scope.paid = 0;
                $scope.bal = 0;
            } else {
                $scope.paid += money;
            }
            if ($scope.paid > vm.balance) {
                $scope.bal = $scope.paid - vm.balance;
            }
        }

		$scope.manualOrder = function() {
			var d = new Date();
			vm.RevTitle = "영 수 증";                				
			Order.payment.saledate = $filter('date')(d,'yyyyMMdd');
			Order.payment.saletime = $filter('date')(d,'HHmmss'); 
			vm.balance = 0;
			recordOrder(2); // cash order
        }

        $scope.manpaycheckout = function(amount) {
			if (amount<=0) {
				gotoMenu();
				return ;
			}
			ocxlog('수동거래시작 금액:'+amount+', 주문내역:'+Order.detail);
			vm.balance = amount;          
			{
				Order.checked_by = 2;
				Order.amount = amount;
				Order.payment.id = 0;				
				Order.payment.amount = amount;
				Order.payment.cardtype = "현금";
				$scope.RcvState = "";
			}                        
        }
        				
		$scope.manpaycheckout(Order.amount);
    }	
	
})();
