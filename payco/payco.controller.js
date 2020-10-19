(function () {
    'use strict';

    angular
        .module('app')		
		.controller('PaycoController', PaycoController);
    
    PaycoController.$inject = ['$routeParams', '$http', '$scope', '$timeout', '$filter', '$location', 'Order', 'PrintService'];
    function PaycoController($routeParams, $http, $scope, $timeout, $filter, $location, Order, PrintService) {
        var vm = this;
        var API_URL = Order.settings.apiurl; 
        var status;        
        var mytimeout; 
        		
		vm.order = Order;
		vm.items = JSON.parse(JSON.stringify(Order));
		$scope.BASE_URL = Order.BASE_URL;
        vm.totalpaid = 0;
        vm.PrtMsgs = "";

        //vm.viewmode = 'cardmode';
        $scope.breceipt1 = Number($routeParams.checktype);

        vm.balance = 0;
        vm.cashocxver = 0;                
       
        vm.curmode = 0;
				
        vm.payment = Order.payment;
		
		vm.state = 0;
		vm.RevTitle = "영 수 증";
		vm.cashrcno = '';
		vm.retry = 1;
		vm.timecnt = 0;

        //var tid = Order.PaycoInfo.posTid;
        //var vanTid = "KK06075399";
        //var regNum = "1098607871";
        //var apipath = "https://alpha-dongle.payco.com";
        //var proxyurl = "http://amz4.local.tst/ver3/payco/proxy.php";
        var data1 = {
            type : "POST",
            data : {} 
        };
                
        var resdata = {
            resOrderNo : 0,
            pinCode : 0,
            vanCorpCode : ''
        };

        var paydt = {};

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
            var idx = 0, cnt = 0;
            var payment1 = [];            
            var paystr = "";
            for (idx=0; idx<paydt.approvalResultList.length; idx++) {
                var pay = paydt.approvalResultList[idx];         
                if (pay.paymentMethodCode==0) {
                    var pay1 = {
                        siteid : Order.site.id,
                        orderid : Order.id,
                        checked_by : 18,
                        termid : paydt.tradeRequestNo,
                        cardtype : pay.vanApprovalCompanyName, //Order.PaycoInfo.posTid,
                        appno : pay.approvalNo,
                        saledate : pay.approvalDatetime.substr(0,8),
                        saletime : pay.approvalDatetime.substr(8,6),
                        amount : paydt.totalTaxableAmount + paydt.totalVatAmount,
                        cardno : pay.approvalCardNo,
                        param1 : resdata.pinCode,
                        param2 : pay.approvalAmount
                    }
                    payment1.push(pay1);
                    vm.payment.saledate = pay.approvalDatetime.substr(0,8);
                    vm.payment.saletime = pay.approvalDatetime.substr(8,6);
                    vm.payment.appno = pay.approvalNo;
                    vm.payment.cardtype = pay.vanApprovalCompanyName;
                    vm.payment.cardno = pay.approvalCardNo ? pay.approvalCardNo : '';
                }
                if (pay.approvalAmount>0) {
                    paystr += "F%-34s%8s|"+pay.paymentMethodName+"|"+$filter('number')(pay.approvalAmount)+";";
                }
            }
            if (paystr.length>0) {
                vm.PrtMsgs = "               PAYCO 승인정보                ;";
                vm.PrtMsgs += "P------------------------------------------;";
                vm.PrtMsgs += paystr;
            }
            for (idx=0; idx<payment1.length; idx++) {
			    Order.recordPayment(payment1[idx], idx).then(function(res) {
                    if (res>=0) {	                        
                        if (res==payment1.length) {
                            if (vm.order.selmenu.length==0) {
                                ocxlog("OrderItem lost!");
                                if (vm.items.selmenu.length>0) {
                                    ocxlog("copy from backup amount:"+vm.items.amount);
                                    Order.selmenu = vm.items.selmenu;
                                    Order.amount = vm.items.amount;
                                } else {
                                    ocxlog("backup lost!");
                                    handleReceipt();
                                }
                            } 
                            var idx1;				
                            for (idx1=0; idx1<vm.order.selmenu.length; idx1++) {						
                                Order.recordOrderItem(idx1).then(function(res) {                                
                                    if (res>=0) {
                                        if (res==vm.order.selmenu.length) {
                                            handleReceipt();
                                        }
                                    } else {
                                        $scope.RcvState += " recordOrderItem:"+idx1+" failure";
                                        ocxlog("recordOrderItem:"+idx1+" failure "+ Order.error);
                                    }
                                });
                            }
                        }
                    } 
                    else {
                        $scope.RcvState += " recordPayment failure";
                        //ocxlog('recordPayment failure '+ Order.error);
                        ocxlog('recordPayment failure '+ Order.error + ' data:'+JSON.stringify(vm.payment));
                        handleReceipt();
                    }		
                });
            }				
		}

		function recordOrder(checktype) {     
            Order.ticketno = paydt.tradeNo;
			Order.recordOrder(checktype).then(function(res) {				
				if (res) {
					vm.retry = 1;
					vm.payment.orderid = Order.id;
					vm.payment.checked_by = Order.checked_by;	
					vm.payment.id = undefined; // make sure
					recordPayment(vm.payment);
				} else {
					//$scope.RcvState += " recordOrder failure";
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

        function paycocheck() 
        { 			
			ocxlog('PAYCO 결제요청 vm.order.selmenu.length='+vm.order.selmenu.length);
            $scope.RcvState = "결제중입니다";
            var tidcode = resdata.pinCode+Order.PaycoInfo.posTid;
            var hash = CryptoJS.HmacSHA256(tidcode, Order.PaycoInfo.apiKey);
            var hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
            var today = new Date();
            var i;
            var refkey = $filter('date')($scope.today,'yyyyMMddHHmmsssss');
            data1.data = {
                signature : hashInBase64,
                deviceAuthType : 'QR',
                serviceType : 'PAYCO',
                registrationNumber: Order.payco.registrationNumber, 
                posTid : Order.PaycoInfo.posTid,
                vanCorpCode : resdata.vanCorpCode,
                vanPosTid: Order.payco.vanPosTid, 
                pinCode : resdata.pinCode,
                posReferenceKey : refkey,
                totalAmount : Order.amount,
                currency : 'KRW',
                productName : Order.detail,
                productInfoList : [],
                extras : {
                    posVersion : '1.0.0.0',
                    posDevCorpName : 'NETPAY',
                    posSolutionName : 'MENUROID',
                    posSolutionVersion : 'ver3'
                }
            }             
			for (i = 0; i < Order.selmenu.length; i++) {
                var item1 = {
                    productCode : Order.selmenu[i].dsporder,
                    productName : Order.selmenu[i].name,
                    productUnitAmount : Order.selmenu[i].price,
                    productQuantity : Order.selmenu[i].num
                };
                data1.data.productInfoList.push(item1);
            }
            ocxlog(JSON.stringify(data1.data));
            $.ajax({
                crossOrigin: true,
                proxy: Order.payco_proxy,
                url:Order.payco.apipath+"/payment/v1/approval/simple",
                data:data1,
                success: function( response ){                     
                    ocxlog(response);
                    var res = JSON.parse(response);
                    if (res.resultCode==0) {
                        $scope.RcvState = "PAYCO 결제완료";
                        paydt = res.result;                        
                        recordOrder(18);
                        vm.state = 99;                   
                    } else {
                        $scope.RcvState = "PAYCO 결제 오류";   
                        vm.state = 90;                   
                    }
                },
                error: function(response){ 
                    ocxlog(response);  
                    vm.state = 90;
				    $scope.RcvState = "PAYCO 결제 api 오류";                  
                },
                complete: function(){ 
                    //ocxlog('complete');  
                }                    
            });

        }
        
        function checkres() {
            data1.data = {
                posTid : Order.PaycoInfo.posTid,
                registrationNumber: Order.payco.registrationNumber, 
                vanPosTid: Order.payco.vanPosTid, 
                reserveOrderNo : resdata.resOrderNo
            } 
            
            $.ajax({
                crossOrigin: true,
                proxy: Order.payco_proxy,
                url:Order.payco.apipath+"/qr/v1/authentication/status",
                data:data1,
                success: function( response ){                     
                    //ocxlog(response);
                    var res = JSON.parse(response);
                    if (res.resultCode==0) {
                        if (res.result.statusCode=='AUTHENTICATED' || res.result.statusCode=='REQUEST_SIGN') {
                            $timeout.cancel(mytimeout);      
                            $scope.RcvState = "PAYCO 결제확인"; 
                            resdata.pinCode = res.result.pinCode;											
                            resdata.vanCorpCode = res.result.vanCorpCode;
                            paycocheck();
                            vm.state = 19;
                        } 
                        else if (res.result.statusCode=='READY') {
                            vm.state = 17;
                            mytimeout = $timeout(checkres,2000);
                        }
                        else if (res.result.statusCode=='IN_PROGRESS') {
                            vm.state = 18;
                            $scope.RcvState = "PAYCO 결제 진행 중...";  
                            mytimeout = $timeout(checkres,2000);
                        }
                        else if (res.result.statusCode=='EXPIRE' || res.result.statusCode=='CANCEL') {
                            ocxlog('payco '+res.result.statusCode);
			                $scope.backtomenu();
                        }
                        else {
                            ocxlog(response);
                            $scope.RcvState = "PAYCO res : "+res.result.statusCode;
                            if (res.result.failMessage) {
                                $scope.RcvState += '('+res.result.failMessage+')';
                            }
                            vm.state = 90;
                        }
                    } else {
                        $scope.RcvState = "PAYCO 결과확인 오류";                      
                    }
                },
                error: function(response){ 
                    ocxlog(response);  
                    vm.state = 90;
				    $scope.RcvState = "PAYCO 결과확인 api 오류";                  
                },
                complete: function(){ 
                    //ocxlog('complete');  
                }                    
            });
        }

        $scope.paycoqr = function(amount) {
            if (amount<=0) {
				gotoMenu(0);				
				return ;
			}
			ocxlog('PAYCO 거래시작 금액:'+amount+', 주문내역:'+vm.order.detail+', vm.order.selmenu.length='+vm.order.selmenu.length);
			$scope.RcvState = "QR 생성중..";
			vm.order.id = 0;
			vm.payment.amount = amount;
			vm.balance = amount;
            
            data1.data = {
                posTid : Order.PaycoInfo.posTid,
                registrationNumber: Order.payco.registrationNumber, 
                vanPosTid: Order.payco.vanPosTid, 
                totalAmount : Order.amount,
                productName : Order.detail, //'식권',
                posVersion : '1.0.0.0',
                posDevCorpName : "NETPAY", 
                posSolutionName : "vCAT데몬 Solution",
                posSolutionVersion : "ver 1.0.0.0"
            } 
            
            $.ajax({
                crossOrigin: true,
                proxy: Order.payco_proxy,
                url:Order.payco.apipath+"/qr/v1/qrIssue",
                data:data1,
                success: function( response ){                     
                    ocxlog(response);
                    var res = JSON.parse(response);
                    if (res.resultCode==0) {
                        $scope.RcvState = "페이코앱으로 결제해주세요";
                        resdata.resOrderNo = res.result.reserveOrderNo;
						var qrcode = new QRCode(document.getElementById("qrcode"), {
							text: res.result.appPayKey, //"2-ZP-4856200603000002273877--KnpI",
							width: 128,
							height: 128,
							colorDark : "#000000",
							colorLight : "#ffffff",
							correctLevel : QRCode.CorrectLevel.H
                        });					
                        vm.state = 17;
                        mytimeout = $timeout(checkres,2000);
                        
                    } else {
                        vm.state = 90;
				        $scope.RcvState = "ZEROPAY QR생성 오류";  
                    }
                },
                error: function(response){ 
                    ocxlog(response);  
                    vm.state = 90;
				    $scope.RcvState = "ZEROPAY QR생성 오류";                  
                },
                ocxlog: function(){ 
                    //ocxlog('ocxlog');  
                }                    
            });
        }
        /*
		$scope.paycoqr = function(amount) {			
			if (amount<=0) {
				gotoMenu(0);				
				return ;
			}
			ocxlog('PAYCO 거래시작 금액:'+amount+', 주문내역:'+vm.order.detail+', vm.order.selmenu.length='+vm.order.selmenu.length);
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
		}*/
		
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
		
		$scope.paycoqr(vm.order.amount);
		
    }	
	
})();
