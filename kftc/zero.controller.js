(function () {
    'use strict';

    angular
        .module('app')		
		.controller('ZeroController', ZeroController);
    
    ZeroController.$inject = ['$routeParams', '$http', '$scope', '$timeout', '$filter', '$location', 'Order', 'PrintService'];
    function ZeroController($routeParams, $http, $scope, $timeout, $filter, $location, Order, PrintService) {
        var vm = this;
        var API_URL = Order.settings.apiurl; 
        var status;        
        var mytimeout; 
        		
		vm.order = Order;
		$scope.BASE_URL = Order.BASE_URL;
		vm.totalpaid = 0;

        //vm.viewmode = 'cardmode';
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
		vm.zeroqr = '';

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
			ocxlog('gotoMenu('+res+') '+Order.MENU_URL);
			$location.path(Order.MENU_URL);	
		}

		function printOrder()
		{
			var prtres = PrintService.OrderPrint1(vm, vm.order, vm.order.selmenu);
			if (prtres!=123) {
				$scope.RcvState += 'print1 error :'+prtres;
			}
			prtres = PrintService.OrderPrint2(vm, vm.order, vm.order.selmenu);
			if (prtres!=123) {
				$scope.RcvState += ' print2 error :'+prtres;
			}
		}

        function handleReceipt()
        {            
			//ocxlog('handleReceipt 1');
			printOrder();
			if ($scope.breceipt1==1) {
				vm.RevTitle = "영수증";
				PrintService.receiptPrint(vm, vm.order.selmenu, vm.payment);			
			}
			gotoMenu(1);		
        }
        
		function recordPayment(payment) {   
			//ocxlog('recordPayment enter, vm.order.selmenu.length='+vm.order.selmenu.length);  
			Order.recordPayment(payment).then(function(res) {
				if (res) {
					//ocxlog('recordPayment finish, vm.order.selmenu.length='+vm.order.selmenu.length);  
					var idx = 0;
					for (idx=0; idx<vm.order.selmenu.length; idx++) {
						//ocxlog('recordOrderItem start idx='+idx); 
						Order.recordOrderItem(idx).then(function(res) {
							//ocxlog('recordOrderItem finish res='+res);  
							if (res>=0) {
								if (res==vm.order.selmenu.length) {
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
			//ocxlog('recordOrder '+checktype+', vm.order.selmenu.length='+vm.order.selmenu.length);
			Order.recordOrder(checktype).then(function(res) {				
				if (res) {
					//ocxlog('recordOrder success');
					vm.retry = 3;
					vm.payment.orderid = vm.order.id;
					vm.payment.checked_by = vm.order.checked_by;	
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
                        var prtres = PrintService.receiptPrint(vm, vm.order.selmenu, vm.payment);
                        gotoMenu(1);
                    }, 
                    function errorCallback(response) {
                        $scope.RcvState = 'updatePayment error '+response.status;
                    }
                );
        }
                
		
		function zeropaytmout() { 
			ocxlog('zeropaytmout');
			$scope.backtomenu();
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
                //ocxlog('vm.order.selmenu.length='+vm.order.selmenu.length); 
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
                            //vm.order.JumpoNo = items[i].substr(1);
                            break;
                        case 'e' :
                            break;
                        case 'g' :
                            $scope.RcvState = items[i].substr(1);
                            break;
                        case 'h' : // serial no.
                            //vm.order.MaeipSeq = items[i].substr(1);
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
							if (Trcode.charAt(0)=='Z') {
								vm.zeroqr = items[i].substr(1);
							} else {
								vm.payment.cardno = items[i].substr(1, 16);
							}
                            break;
                        case 't' :
                            break;
                        case 'u' :
                            break;
                        case 'y' :
                            //vm.order.BalgubCodeName = items[i].substr(1);
                            break;                        
                    }
                }
                if (resCode==='000') {
					if (Trcode=='Z0') {
						$scope.RcvState = "제로페이앱으로 결제해주세요";
						var qrcode = new QRCode(document.getElementById("qrcode"), {
							text: vm.zeroqr, //"2-ZP-4856200603000002273877--KnpI",
							width: 128,
							height: 128,
							colorDark : "#000000",
							colorLight : "#ffffff",
							correctLevel : QRCode.CorrectLevel.H
						});						
						vm.state = 17;
					}
					else if (Trcode=='Z1') {
						$scope.RcvState = "결제완료";
						vm.state = 10;
					}
					else if (Trcode.charAt(0)=='A') {					
						vm.state = 10;                
					} 
					else if (Trcode.charAt(0)=='B') {
						vm.state = 13;                
					} else {
						$scope.RcvState += ":"+resCode;  
						vm.state = 90;
					}
                } else {
					ocxlog('kftc_err:'+resCode);
					$scope.RcvState += ":"+resCode;  
					if (resCode=='E87') { // 취소					
						$scope.backtomenu();
					}
					else if (resCode=='614')  { // 카드번호 오류					
						vm.cashrcno = '';
						vm.curmode = 10;
						vm.state = 0;
					} 
					else {
						vm.state = 90;
					}
                }
            }
			if (vm.state==99) {                
				ocxcmd('KE'); 
				$timeout.cancel(mytimeout);
			}
			else if (vm.state==17) {
				// wait zeropay ok
				ocxcmd('KE'); 
				$timeout.cancel(mytimeout);
				mytimeout = $timeout(zeropaytmout,20000);
			} 
			else {				                
				if (vm.state==10) {
					//ocxlog('vm.state==10 orderid='+vm.order.id);
                    if (vm.order.id==0) {
                        recordOrder(17);
                    } else {
                        recordPayment();
                    }                    
                    vm.state = 99;                    
				} 
				else if (vm.state==13) {
					vm.payment.checked_by = $scope.breceipt1; 
                    updatePayment();
                    vm.state = 99;
				}
				$timeout.cancel(mytimeout);              
				mytimeout = $timeout(checkres,1000);
            }			
		}
		
		

		$scope.zeropaycheck = function() { 
			$timeout.cancel(mytimeout);
			ocxlog('ZEROPAY 결제요청 qr:'+vm.zeroqr+', vm.order.selmenu.length='+vm.order.selmenu.length);
			$scope.RcvState = "결제중입니다";
			var status;
			status = ocxcmd('Z1' + vm.balance+','+vm.zeroqr);
			if (status>0) {
				vm.timecnt = 0;
				vm.state = 18;
				mytimeout = $timeout(checkres,1000);
			} else {
				vm.state = 90;
				$scope.RcvState = "ZEROPAY 결제오류";   
			}
		}

		$scope.zeropayqr = function(amount) {			
			if (amount<=0) {
				gotoMenu(0);				
				return ;
			}
			ocxlog('ZEROPAY 거래시작 금액:'+amount+', 주문내역:'+vm.order.detail+', vm.order.selmenu.length='+vm.order.selmenu.length);
			$scope.RcvState = "QR 생성중..";
			vm.order.id = 0;
			vm.payment.amount = amount;
			vm.balance = amount;
			vm.RevTitle = "ZEROPAY";
			var status;
			status = ocxcmd('Z0' + amount);
			if (status>0) {
				vm.timecnt = 0;
				vm.state = 1;
				mytimeout = $timeout(checkres,1000);
			} else {
				vm.state = 90;
				$scope.RcvState = "ZEROPAY QR생성 오류";   
			}  
		}
		
        $scope.backtomenu = function() {   
			ocxlog('카드거래취소');
			ocxcmd('KE');
            vm.state = 99;
			gotoMenu(0);
        }
        
        vm.reloadsite = function() {
            $scope.backtomenu();
        }
       
		function blinker() {
			$('.blink_me').fadeOut(500).fadeIn(500);
		}

		setInterval(blinker, 500); //Runs every second		
		
		$scope.zeropayqr(vm.order.amount);
		
    }	
	
})();
