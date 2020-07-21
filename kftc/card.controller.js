(function () {
    'use strict';

    angular
        .module('app')		
		.controller('CardController', CardController);
    
    CardController.$inject = ['$routeParams', '$http', '$scope', '$timeout', '$filter', '$location', 'Order', 'PrintService'];
    function CardController($routeParams, $http, $scope, $timeout, $filter, $location, Order, PrintService) {
        var vm = this;
        var API_URL = Order.settings.apiurl; 
        var status;        
        var mytimeout; 
        
		vm.order = Order;
		$scope.BASE_URL = Order.BASE_URL;
		vm.totalpaid = 0;

        vm.viewmode = 'cardmode';
        $scope.breceipt1 = Number($routeParams.checktype);

        vm.balance = 0;
        vm.cashocxver = 0;                
       
        vm.curmode = 0;
				
        vm.payment = Order.payment;
		
		vm.state = 0;
		vm.RevTitle = "영 수 증";
		vm.cashrcno = '';
		vm.retry = 3;
		vm.timecnt = 0;

		function ocxcmd(cmd) {
			if (window.external.Test) {			
				return window.external.BNCmd(cmd);
			} else if ("ActiveXObject" in window) {			
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
        
		function gotoMenu(res) 
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
			if ($scope.breceipt1==1) {
				PrintService.receiptPrint(vm, Order.selmenu, vm.payment);			
			}
			gotoMenu(1);		
        }
        
		function recordPayment(payment) {     
			Order.recordPayment(payment).then(function(res) {
				if (res) {
					var idx = 0;
					for (idx=0; idx<Order.selmenu.length; idx++) {
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
				} else {
					$scope.RcvState += " recordPayment failure";
					//ocxlog('recordPayment failure '+ Order.error);
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
					ocxlog('recordOrder failure '+ Order.error);
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
						vm.RevTitle = "현금영수증";
                        var prtres = PrintService.receiptPrint(vm, Order.selmenu, vm.payment);
                        gotoMenu(1);
                    }, 
                    function errorCallback(response) {
                        $scope.RcvState = 'updatePayment error '+response.status;
                    }
                );
        }
                
        
		/*******************
		* Card KFTC
		********************/

		function checkres() {
            var status = ocxcmd('KC');
			vm.timecnt++;
            if (status>0) {
				var res; 
				if (window.external.Test) {			
					res =  window.external.GetBuffer('tbuf');
				} else if ("ActiveXObject" in window) {			
					res =  cashif.GetBuffer('tbuf');
				}
				ocxlog('kftc_rsp:'+res);
                var items = res.split(';');
                var i;
                var resCode = '999';
                vm.payment.checked_by = 1;

				var Trcode = items[0].substr(0,2);
				vm.payment.saledate = '20'+items[0].substr(2,6);
				vm.payment.saletime = items[0].substr(8,6);
                resCode = items[0].substr(14,3);
                for (i=1; i<items.length; i++) {					
                    switch (items[i].charAt(0)) {
                        /*case 'A' :
                            service.payment.saledate = '20'+items[i].substr(2,6);
                            service.payment.saletime = items[i].substr(8,6);
                            resCode = items[i].substr(14,3);
                            break;*/
                        case 'B' :
                            vm.payment.amount = Number(items[i].substr(1));
                            break;
                        case 'D' : // acctype
                            break;
                        case 'E' : // term id
                            vm.payment.termid = items[i].substr(1);
                            break;
                        case 'P' :
                            break;
                        case 'a' :
                            vm.payment.appno = items[i].substr(1);
                            break;
                        case 'd' :
                            vm.order.JumpoNo = items[i].substr(1);
                            break;
                        case 'e' :
                            break;
                        case 'g' :
                            $scope.RcvState = items[i].substr(1);
                            break;
                        case 'h' : // serial no.
                            vm.order.MaeipSeq = items[i].substr(1);
                            break;
                        case 'j' : // installment
                            break;
                        case 'p' :
							//vm.payment.cardtype = items[i].substr(1);
							break;
						case 'v' :
                            vm.payment.cardtype = items[i].substr(1);
                            break;
                        case 'q' :
                            vm.payment.cardno = items[i].substr(1, 16);
                            break;
                        case 't' :
                            break;
                        case 'u' :
                            break;
                        case 'y' :
                            vm.order.BalgubCodeName = items[i].substr(1);
                            break;                        
                    }
                }
                if (resCode==='000') {
					if (Trcode.charAt(0)=='A') {					
						vm.state = 10;                
					} else if (Trcode.charAt(0)=='B') {
						vm.state = 13;                
					} else {
						$scope.RcvState += ":"+resCode;  
						vm.state = 90;
					}
                } else {
					ocxlog('kftc_err:'+resCode);
                    $scope.RcvState += ":"+resCode;  
					if (resCode=='E87') // 취소
					{
						$scope.backtomenu();
					}
					else if (resCode=='614') // 카드번호 오류
					{
						vm.cashrcno = '';
						vm.curmode = 10;
						vm.state = 0;
					} else {
						vm.state = 90;
					}
                }
            }
			if (vm.state==99) {                
                vm.viewmode = 'menumode';
                ocxcmd('KE'); //CardService.cardfinish();
            } else {
                if (vm.state==15) {
                    vm.state = 99;                
                } else if (vm.state==10) {
                    if (vm.order.id==0) {
                        recordOrder(1);
                    } else {
                        recordPayment();
                    }                    
                    vm.state = 99;                    
                } else if (vm.state==13) {
					vm.payment.checked_by = $scope.breceipt1; 
                    updatePayment();
                    vm.state = 99;
                }
				mytimeout = $timeout(checkres,1000);
            }			
        }

		$scope.zerocheckout = function(amount) {			
			if (amount<=0) {
				gotoMenu(0);				
				return ;
			}
			ocxlog('ZEROPAY 거래시작 금액:'+amount+', 주문내역:'+Order.detail);
			$scope.RcvState = "QR 생성중..";
			vm.order.id = 0;
			vm.payment.amount = amount;
			vm.balance = amount;
			vm.viewmode = 'cardmode';
			vm.RevTitle = "ZEROPAY";
			var status;
			status = ocxcmd('Z0' + amount);
			if (status>0) {
				vm.timecnt = 0;
				vm.state = 1;
				mytimeout = $timeout(checkres,1000);
			} else {
				vm.state = 90;
				$scope.RcvState = "ZEROPAY 결제오류";   
			}  
		}
		
        $scope.cardcheckout = function(amount) {
			if ($scope.breceipt1==5){
				var d = new Date();
                vm.payment.saledate = $filter('date')(d,'yyyyMMdd');
                vm.payment.saletime = $filter('date')(d,'HHmmss'); 
				vm.payment.amount = amount;
				vm.payment.appno = '';
				$scope.RcvState = '외부결제';
                vm.order.MaeipSeq = '0000';
                vm.payment.cardtype = '외부결제';
                vm.payment.cardno = '****************';
                vm.order.BalgubCodeName = '0000';
				$scope.breceipt1 = 0;
				recordOrder(1);
				return ;
			}
			if (amount<=0) {
				gotoMenu(0);				
				return ;
			}
			ocxlog('카드거래시작 금액:'+amount+', 주문내역:'+Order.detail);
			$scope.RcvState = "카드를 넣고 티켓이 나올 때까지 절대로 카드를 빼지 마세요";
			vm.order.id = 0;
			vm.payment.amount = amount;
			vm.balance = amount;
			vm.viewmode = 'cardmode';
			vm.RevTitle = "신용거래";
			var status;
			status = ocxcmd('K1' + amount);
			if (status>0) {
				vm.timecnt = 0;
				vm.state = 1;
				mytimeout = $timeout(checkres,1000);
			} else {
				vm.state = 90;
				$scope.RcvState = "카드결제오류";   
			}  
        }
        
		$scope.cashreceipt = function(amount, type) { 			
            vm.payment.orderid = vm.order.id;
            vm.payment.amount = amount;
			vm.payment.checked_by = type;            
			$scope.RcvState = "현금영수증";            
			var status;
			var rcnostr='';
			if (vm.cashrcno.length>=0) {
				rcnostr += ';0'+vm.cashrcno;
			}
			if (type==3) 
				status = ocxcmd('K6' + amount + rcnostr);
			else 
				status = ocxcmd('K7' + amount + rcnostr);
            if (status>0) {
                vm.state = 1;
				mytimeout = $timeout(checkres,1000);   
            } else {
                vm.state = 90;
                $scope.RcvState = "통신오류";   
            }                                  
        }

        $scope.backtomenu = function() {   
			ocxlog('카드거래취소');
			ocxcmd('KE');
            vm.state = 99;
			gotoMenu(0);
        }
        
        vm.reloadsite = function() {
            gotoMenu(0);
        }
       
		function blinker() {
			$('.blink_me').fadeOut(500).fadeIn(500);
		}

		setInterval(blinker, 500); //Runs every second
				
		$scope.keynum1 = function(digit) {
            vm.cashrcno += digit;
        }

		$scope.backsp = function() {
			var len = vm.cashrcno.length;
			if (len){
				vm.cashrcno = vm.cashrcno.substring(0,len-1);
			}            
        }

		$scope.go = function() {
			if (vm.curmode==10) {			
				vm.curmode = 11;
				$scope.cashreceipt(Order.amount, $scope.breceipt1);
			}
		}

		$scope.cancelrc = function() {
			vm.cashrcno = '';
			gotoMenu(0);
		}

		if ($scope.breceipt1==3 || $scope.breceipt1==13)
		{
			vm.curmode = 10;
			vm.viewmode = 'cashmode';
		} else if ($scope.breceipt1==12) {
			$scope.zerocheckout(Order.amount);
		} else {
			$scope.cardcheckout(Order.amount);
		}
    }	
	
})();
