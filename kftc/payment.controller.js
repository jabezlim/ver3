(function () {
    'use strict';

    angular
        .module('app') //,['ui.bootstrap'])
        .filter('startFrom', function() {
            return function(input, start) {
                start = +start; //parse to int
                return input.slice(start);
            }
        })        
        .controller('PaymentListCtrl', PaymentListCtrl);

    
    PaymentListCtrl.$inject = ['$scope', '$http', '$routeParams', '$filter','$rootScope', '$timeout', '$location', 'Order'];
    function PaymentListCtrl($scope, $http, $routeParams, $filter, $rootScope, $timeout, $location, Order) {
        var vm = this;
		var API_URL = Order.settings.apiurl; 
        
		vm.order = Order;
        $scope.BASE_URL = Order.BASE_URL;

        vm.user = "admin";
        vm.isPos = 0; //(vm.user) && (vm.user.userinfo.user_id>0);
        vm.recprtport =  "0"; //
        vm.payments = [];
        vm.siteid = $routeParams.id;
        vm.accdate = $routeParams.date;
        vm.cardtype = $routeParams.cardtype;
        
        vm.payment = {
            siteid : 0,
            termid : 0,
            orderid : 0,
            amount : 0,
            cardtype : '',
            cardno : '',
            appno : '',
            saledate: '',
            saletime: '',
            checked_by : 0
        }; 
		
		vm.state = 0;
		vm.cashrcno = '';
		$scope.bcash = 0;

        if (vm.cardtype && (vm.cardtype.slice(0, 7)=="cancel_")) {
            vm.cardtype = vm.cardtype.slice(7);
            vm.bcancel = true;
        } else vm.bcancel = false;
        
        vm.viewmode = 'listmode';
        vm.reorderid = 0;
        $scope.cr = {AppTermNo:0};
        $scope.cancelamount = 0;
        
        $scope.today = new Date();    
        vm.accday = $filter('date')($scope.today,'yyyyMMdd');            
        vm.accmonth = $filter('date')($scope.today,'yyyyMM');    
        
        $scope.currentPage = 0;
        $scope.pageSize = Order.settings.pageSize;
        $scope.numberOfPages=function(){
            return Math.ceil(vm.payments.length/$scope.pageSize);                
        }
    
        if (vm.accdate==undefined) {
            vm.accdate = $filter('date')($scope.today,'yyyyMMdd');    
            vm.cardtype = 'all';
        }

		function ocxcmd(cmd) {
            if (window.external.Test) {
                return window.external.BNCmd(cmd);                
            //} else if ("ActiveXObject" in window) {
			//	return cashif.BNCmd(cmd);
            }             
			return -1;
		}

		function ocxlog(logdata) {			
            ocxcmd('LG'+logdata);
			//if (ocxcmd('LG'+logdata)<0) {
			//	console.log(logdata);
			//};			
        }
        
        $scope.paytype = function(checked) {
            return Order.paytype(checked);
        }

		$scope.gotoMenu = function() 
		{
			$location.path(Order.MENU_URL);	
		}

		function reload() {
			vm.viewmode = 'listmode';
			loadSiteData(vm.siteid);
			if (vm.bcancel) loadAllCancel();
			else loadAllCheckout();
		}
        
        function loadSiteData(siteid) {
            $http.get(API_URL+'projects/edit/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.site = response.data;                            
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
        }
        
        function loadAllCheckout() {
            $http({
                    url: API_URL+'payments/cardtype', 
                    method: "GET",
                    params: {date:vm.accdate, cardtype:vm.cardtype, siteid:vm.siteid}
                 })
                .then(
                    function successCallback(response) {
                        vm.payments = response.data;
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }
        
        function loadAllCancel() {
            $http({
                    url: API_URL+'payments/cardcancel', 
                    method: "GET",
                    params: {date:vm.accdate, cardtype:vm.cardtype, siteid:vm.siteid}
                 })
                .then(
                    function successCallback(response) {
                        vm.payments = response.data;                                                    
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );
        }
        
		function cancelReceipt(payment) {
            var totalamt = payment.amount; 
            var tax = parseInt(totalamt/11+0.5);
            var rcstr = "PP0L"+vm.RevTitle+";S;P상 호 : ";
            rcstr += Order.site.regname + ';P사업자번호:';
            rcstr += Order.site.busno + '  대표자:'+ Order.site.ownername+';P';
            rcstr += Order.site.addr + ';P전화번호:';
            rcstr += Order.site.tel +';;P';
            rcstr += payment.saledate+' '+payment.saletime+' OrderNo:';
            rcstr += payment.orderid;
			rcstr += ';P==========================================;P판매금액 : ';
            rcstr += payment.amount +';P세    금 : ';
            rcstr += tax+';P취소금액 : ' + payment.amount;
            if (payment.appno.length>0) {
                rcstr += ';P승인번호 : '+payment.appno;
            }
            if (payment.cardno.length>0) {
                if (payment.checked_by!=1) 
                    rcstr += ';P식별번호 : '+payment.cardno;
                else    
                    rcstr += ';P카드번호 : '+payment.cardno;
            }
            if (payment.cardtype.length>0) {
                    ';P매입사 : '+payment.cardtype;
            } 
            rcstr += ';P==========================================;';
            if (vm.PrtMsgs.length>0) {
                var spstr = vm.PrtMsgs.split('\x1E');
                rcstr += ';P'+spstr.join(' ');
            }            
            return ocxcmd(rcstr);                
        }

        function cancelOrderItem(orderItem, index) {
			var data = {status:2};
            //$http.put(API_URL+'orderItems/printed/'+orderItem.id+'/'+2)
			$http.post(API_URL+'orderItems/printed/'+orderItem.id, data)
                .then(
                    function successCallback(response) {
                        if (index==$scope.itemlist.length-1) {                            
                            cancelReceipt(vm.cancelpayment);
                            alert("취소되었습니다.");
                            //location.reload();
							ocxlog('취소 완료');
							reload();
                        }
                    }, 
                    function errorCallback(response) {
						ocxlog('cancelOrderItem error '+index);
                        alert(response.status); //data.message);
                    }
                );
        }
        
        function cancelOrderItems(orderid) {
            $http.get(API_URL+'orderItems/index/'+orderid)
                .then(
                    function successCallback(response) { 
                        $scope.itemlist = response.data;   
                        if ($scope.itemlist.length) {
                            $scope.itemlist.forEach(cancelOrderItem);
                        } 
                    }, 
                    function errorCallback(response) {
						ocxlog('cancelOrderItems error');
                        alert(response.status); //data.message);
                    }
                );
        }
        
        function cancelOrder(orderid) {
            var data = {active:0};
            $http.post(API_URL+'orders/save/'+orderid, data)
                .then(
                    function successCallback(response) { 
                        cancelOrderItems(orderid);
                    }, 
                    function errorCallback(response) {
						ocxlog('cancelOrder error');
                        alert(response.status); //data.message);
                    }
                );
        }
        
        
        function cancelPayment(payment) {
			var d = new Date();
            var data = {refund_on:$filter('date')(d,'MMddHHmmss')};
            $http.post(API_URL+'payments/cancel/'+payment.id, data)
                .then(
                    function successCallback(response) {                         
                        cancelOrder(payment.orderid);                        
                    }, 
                    function errorCallback(response) {
						ocxlog('cancelPayment error');
                        alert(response.status); //data.message);
                    }
                );
        }
        
        function receiptPrint(payment, selmenu) {
			var i;
            var totalamt = payment.amount; 
            var tax = parseInt(totalamt/11+0.5);
            var rcstr = "PP0L영수증재발행;S;P상 호 : ";
            rcstr += Order.site.regname + ';P사업자번호:';
            rcstr += Order.site.busno + '  대표자:'+ Order.site.ownername+';P';
            rcstr += Order.site.addr + ';P전화번호:';
            rcstr += Order.site.tel +';;P';
            rcstr += payment.saledate+' '+payment.saletime+' OrderNo:';
            rcstr += payment.orderid + 
                ';P=========================================='+
                ';P메뉴명                   단가  수량   금액'+
                ';P==========================================';
            for (i=0; i<selmenu.length; i++) {
                rcstr += ';F%-24s%6s%4s%8s|'+selmenu[i].name+'|';
                rcstr += $filter('number')(selmenu[i].price)+
                    '|'+selmenu[i].num+
                    '|'+$filter('number')(selmenu[i].price*selmenu[i].num);
            }
                     
            rcstr += ';P------------------------------------------'+
                ';P합계금액 : ';
            rcstr += $filter('number')(totalamt)+';P과    세 : ';
            rcstr += $filter('number')(totalamt-tax) + ';P세    금 : ';             
            rcstr += $filter('number')(tax); 
            if (payment.checked_by == 1) {
                rcstr += ';P신용카드 : '+$filter('number')(totalamt) +
                         ';P카드번호 : '+payment.cardno +
                         ';P매 입 사 : '+payment.cardtype +
                         ';P승인번호 : '+payment.appno;                    
            }
            else if (payment.checked_by == 2) { // 현금
                rcstr += ';P현    금 : '+$filter('number')(totalamt)                
            } else {
                rcstr += ';P현    금 : '+$filter('number')(totalamt) +
                         ';P식별번호 : '+payment.cardno +
                         ';P승인번호 : '+payment.appno;                    
            }
            rcstr += ';P==========================================';
            // if (Order.site.PrtMsgs.length>0) {
            //     var spstr = Order.site.PrtMsgs.split('\x1E');
            //     rcstr += ';P'+spstr.join(' ');
            // }
            if (payment.checked_by != 1) {
                rcstr += ';C';
            }
            return ocxcmd(rcstr);             
        }

		$scope.reprint = function(payment) {
            $http.get(API_URL+'orderItems/index/'+payment.orderid)
                .then(
                    function successCallback(response) { 
                        var ticketlist = response.data;   
						receiptPrint(payment, ticketlist);
                    }, 
                    function errorCallback(response) {
                        alert(response.status); 
                    }
                );
        }
        
        $scope.tkreprint = function(orderid) {
            vm.reorderid = orderid;
            $http.get(API_URL+'orderItems/index/'+orderid)
                .then(
                    function successCallback(response) { 
                        var ticketlist = response.data;   
                        if (ticketlist.length) {
                            for (var i=0; i<ticketlist.length; i++) {
                                //PrintService.ticketprint(vm, ticketlist[i], false);
                            }
                        }
                    }, 
                    function errorCallback(response) {
                        alert(response.status); //data.message);
                    }
                );
        }
        
        /*******************
		* Card KFTC
		********************/

		function checkres() {
			if (vm.state != 2) {
				ocxlog('wrong state');
				return ;
			}
            var status = ocxcmd('KC');
            if (status>0) {                
                var res=''; 
                if (window.external.Test) {
                    res = window.external.GetBuffer('tbuf');
                } else {
                    res = ''; //cashif.GetBuffer('tbuf');
                }
				ocxlog('kftc_cancelrsp:'+res);
                var items = res.split(';');
                var i;
                var resCode = '999';
                vm.payment.checked_by = 1;
                vm.PrtMsgs = "";

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
                            vm.JumpoNo = items[i].substr(1);
                            break;
                        case 'e' :
                            break;
                        case 'g' :
                            $scope.RcvState = items[i].substr(1);
                            break;
                        case 'h' : // serial no.
                            vm.MaeipSeq = items[i].substr(1);
                            break;
                        case 'j' : // installment
                            break;
                        case 'p' :
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
                            vm.BalgubCodeName = items[i].substr(1);
                            break;                        
                    }
                }
				
                if (resCode==='000') {					
					vm.state = 13;  
                } else {
                    $scope.RcvState += ":"+resCode;  
					if (resCode=='E87') {
						$scope.backtomenu();
					} else if (resCode==500 || resCode=='500') { // 이미 취소된 거래
						//cancelPayment(vm.cancelpayment)
						vm.state = 13;
					} else {
						vm.state = 90;
					}
                }
				ocxlog('resCode:'+resCode+" state:"+vm.state);
				if (vm.state<90) {
					if (vm.state==15) {
						vm.state = 99;                
					} else if (vm.state==13) {
						ocxlog('취소거래완료');
						cancelPayment(vm.cancelpayment);
						vm.state = 99;
					}					
				}
				if (vm.state>=90) {                
					//if (vm.state==99)
					//	vm.viewmode = 'listmode';
					ocxcmd('KE'); //CardService.cardfinish();
				} 
            }
			else {
				mytimeout = $timeout(checkres,1000);
			}
					
        }


        
        $scope.cardcancel = function(payment) {  
			
			var status = 0;
			var cancelcmd = '';
            vm.cancelpayment = payment;
            $scope.cancelamount = payment.amount;
            if (payment.appno != '') {                
                if (!confirm("승인번호 "+payment.appno+ " 거래를 취소하시겠습니까?")) {
                    return ;
                }
                vm.RevTitle = "영수증취소";
                if (payment.cardtype=="현금") {
					ocxlog('현금영수증취소시작 '+payment.orderid);
					vm.cashrcno = '';
					$scope.bcash = 1;
					$scope.RcvState = "현금영수증취소";   										
					/*if (payment.checked_by==13)						
						status = ocxcmd('K9' + cancelcmd);
					else
						status = ocxcmd('K8' + cancelcmd);*/
					vm.viewmode = 'cardmode';
				} else {
					cancelcmd = payment.amount+';'+payment.saledate.substring(4)+';'+payment.appno;
					$scope.bcash = 0;
					$scope.RcvState = "카드취소";   
                    vm.viewmode = 'cardmode';
					if (Number(payment.checked_by)==1) {
                        ocxlog('카드취소');
						status = ocxcmd('K4' + cancelcmd);								
                    } else if (Number(payment.checked_by)==17) { // zeropay
                        ocxlog('제로페이취소');
                        status = ocxcmd('Z2' + cancelcmd);								
                    } else if (Number(payment.checked_by)==11) { // payon
                        ocxlog('페이온취소');
						status = ocxcmd('G8' + cancelcmd);								
					}
					if (status>0) {
						vm.state = 2;
						mytimeout = $timeout(checkres,1000);
					} else {
                        vm.state = 90;
                        $scope.RcvState = "오류";   					
					}
				}
            } else {                
                if (!confirm("취소하시겠습니까?")) {
                    return ;
                }
                vm.PrtMsgs = "";
                vm.RevTitle = "현금취소";
                cancelPayment(payment);
            }            
        }
        
        $scope.backtomenu = function() {            
            vm.viewmode = 'listmode';
        }
        
        $scope.keynum1 = function(digit) {
            vm.cashrcno += digit;
        }

		$scope.backsp = function() {
			var len = vm.cashrcno.length;
			if (len){
				vm.cashrcno = vm.cashrcno.substring(0,len-1);
			}            
        }

		$scope.cancelrc = function() {
			vm.cashrcno = '';
			//$scope.breceipt1 = 0; 
			vm.viewmode = 'listmode';
		}
   
		$scope.onok = function() {
			var rcnostr='';
			var cardcmd = '';
			var status = 0;
			if (vm.cashrcno.length>=0) {
				rcnostr += ';0'+vm.cashrcno;
				var payment = vm.cancelpayment;
				var cancelcmd = payment.amount+';'+payment.saledate.substring(4,8)+';'+payment.appno;
				if (payment.checked_by==13)						
					cardcmd = 'K9' + cancelcmd + rcnostr;
				else
					cardcmd = 'K8' + cancelcmd + rcnostr;
				status = ocxcmd(cardcmd);
				if (status>0) {
					vm.state = 2;
					mytimeout = $timeout(checkres,1000);
				} else {
					// retry
					status = ocxcmd(cardcmd);
					if (status>0){
						vm.state = 2;
						mytimeout = $timeout(checkres,1000);
					} else {
						vm.state = 90;
						$scope.RcvState = "오류";   
					}
				}
			} 
		}

		reload();
    }
	
})();