(function () {
	'use strict';

	angular
		.module('app')
		.controller('CashController', CashController);

	CashController.$inject = ['$http', '$scope', '$timeout', '$filter', '$location', 'Order', 'PrintService'];

	function CashController($http, $scope, $timeout, $filter, $location, Order, PrintService) {
		var vm = this;
		var API_URL = Order.settings.apiurl;
		var i = 0;
		var status;
		var mytimeout;

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

		function ocxcmd1(cmd) {
			if (window.external.Test) {
				return window.external.BNCmd(cmd);
			}
			return -1;
		}
		
		function ocxcmd(cmd) {
			if (window.external.Test) {
				return window.external.BNCmd(cmd);
			} else if ("ActiveXObject" in window) {
				return cashif.BNCmd(cmd);
			}
			return -1;
		}

		function ocxlog(logdata) {
			ocxcmd('LG' + logdata);
		}

		/**********************************
		// record transaction
		***********************************/
		function pausecomp(millis) {
			var date = new Date();
			var curDate = null;
			do {
				curDate = new Date();
			}
			while (curDate - date < millis);
		}

		function gotoMenu() {
			$location.path(Order.MENU_URL);
		}

		function printOrder() {
			var prtres = PrintService.OrderPrint1(vm, vm.order, Order.selmenu);
			if (prtres != 123) {
				$scope.RcvState += 'print1 error :' + prtres;
			}
			prtres = PrintService.OrderPrint2(vm, vm.order, Order.selmenu);
			if (prtres != 123) {
				$scope.RcvState += ' print2 error :' + prtres;
			}
		}

		function handleReceipt() {
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
				ocxcmd('SOvoices\\10_THANK.wav');
				gotoMenu();
			}
		}

		function recordPayment(payment) {
			Order.recordPayment(payment).then(function (res) {
				if (res) {
					var idx = 0;
					for (idx = 0; idx < Order.selmenu.length; idx++) {
						Order.recordOrderItem(idx).then(function (res) {
							if (res >= 0) {
								if (res == Order.selmenu.length) {
									handleReceipt();
								}
							} else {
								$scope.RcvState += " recordOrderItem:" + idx + " failure";
								ocxlog("recordOrderItem:" + idx + " failure " + Order.error);
							}
						});
					}
				} else {
					$scope.RcvState += " recordPayment failure";
					ocxlog('recordPayment failure ' + Order.error + ' data:' + JSON.stringify(vm.payment));
					if (--vm.retry > 0) {
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
			Order.recordOrder(checktype).then(function (res) {
				if (res) {
					vm.retry = 3;
					vm.payment.orderid = Order.id;
					vm.payment.checked_by = Order.checked_by;
					vm.payment.id = undefined; // make sure
					// errorfix : saledate and saletime is null
					var d = new Date();
					var saledate = $filter('date')(d, 'yyyyMMdd');
					if (vm.payment.saledate != saledate) {
						ocxlog('saledate is wrong...' + vm.payment.saledate + '/' + vm.payment.saletime);
						vm.payment.saledate = saledate;
						vm.payment.saletime = $filter('date')(d, 'HHmmss');
					}
					recordPayment(vm.payment);
				} else {
					$scope.RcvState += " recordOrder failure";
					ocxlog('recordOrder failure ' + Order.error);
					if (--vm.retry > 0) {
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

		function recordOrderAll(checktype) {
			//ocxlog('recordOrderAll '+checktype+', vm.order.selmenu.length='+vm.order.selmenu.length);
			/*if (!lostcheck()) {
				handleReceipt();
				return;
			}*/
			vm.payment.checked_by = checktype;
			Order.recordOrderAll(vm.payment).then(function (res) {
				if (res) {
					ocxlog('recordOrderAll success');
					vm.retry = 3;
					handleReceipt();
				} else {
					ocxlog('recordOrderAll failure ' + Order.error);
					if (--vm.retry > 0) {
						pausecomp(1000);
						ocxlog('recordOrderAll retry...');
						recordOrderAll(vm.payment);
					} else {
						ocxlog('recordOrderAll aborted !');
						handleReceipt();
					}
				}

			});
		}

		function updatePayment() {
			var payid = vm.payment.id;
			$http.post(BASE_URL + 'payments/edit/' + payid, vm.payment)
				.then(
					function successCallback(response) {
						PrintService.receiptPrint(vm, Order.selmenu, vm.payment);
						gotoMenu();
					},
					function errorCallback(response) {
						alert('updatePayment error ' + response.status);
					}
				);
		}

		$scope.cashreceipt = function (amount, type) {
			vm.payment.orderid = vm.order.id;
			vm.payment.amount = amount;
			vm.payment.checked_by = type;
			$scope.RcvState = "현금영수증";
			var status;
			if (type == 3)
				status = ocxcmd('K6' + amount);
			else
				status = ocxcmd('K7' + amount);
			if (status > 0) {
				vm.state = 1;
				mytimeout = $timeout(checkres, 1000);
			} else {
				vm.state = 90;
				$scope.RcvState = "통신오류";
			}
		}

		/*********************************************
		// Cash checkout 
		**********************************************/

		function printChange(reval, errcode) {
			var tkstr = "PP0L[잔돈 반환권];L금액:" + reval + " 원;S" + vm.order.site.name + "];S";
			tkstr += '관리자에게 제출하시고 반환받으세요 errcode:' + errcode + ';S';
			tkstr += $filter('date')(new Date(), 'yyyy/MM/dd HH:mm.ss');
			return PrintService.prtout(vm, tkstr);
		}

		$scope.onTimeout = function () {
			var prebal = vm.balance;
			var reval = 0;
			vm.balance = ocxcmd('BC');
			if (vm.balance <= 0) {
				$timeout.cancel(mytimeout);
				ocxcmd('BB');
				vm.curmode = 12;
				var d = new Date();
				var status = 0;
				vm.RevTitle = "영 수 증";
				Order.payment.saledate = $filter('date')(d, 'yyyyMMdd');
				Order.payment.saletime = $filter('date')(d, 'HHmmss');
				if (vm.balance < -99) {
					ocxlog('현금거래완료 잔돈:' + vm.balance);
					vm.curmode = 13;
					reval = -vm.balance;
					reval = ocxcmd('REFUND' + reval);
					if (reval > 0) {
						vm.curmode = 14;
						var errcode = ocxcmd('AE') + ',';
						errcode += ocxcmd('CE');
						var user = confirm(reval + '원이 미반환되었습니다. errcode:' + errcode + ' 재시도하시려면 확인을 눌러주세요');
						if (user) {
							reval = ocxcmd('REFUND' + reval);
							if (reval != 0) {
								errcode = ocxcmd('AE') + ',';
								errcode += ocxcmd('CE');
								alert(reval + '원이 미반환되었습니다. errcode:' + errcode + ' 관리자에게 확인을 요청하세요');
								printChange(reval, errcode);
								ocxcmd('AZ'); // banknote dispenser reset
								var status = ocxcmd('RESET');
								//vm.check.cashcheck = 0;								
								//saveCheck();
							} else {
								vm.curmode = 19;
							}
						} else {
							vm.curmode = 19;
							//vm.check.cashcheck = 0;
							//saveCheck();
						}
					} else {
						vm.curmode = 19;
					}
				} else if (vm.balance < 0) {
					reval = -vm.balance;
					ocxlog('현금거래에러 코드:' + reval);
					alert('에러가 발생했습니다(지폐끼임 등). errcode:' + reval + ' 관리자에게 확인을 요청하세요');
					if ((prebal > 0) && (Order.amount != prebal)) {
						reval = ocxcmd('REFUND' + (Order.amount - prebal));
					}
					gotoMenu();
					return;
				}
				$scope.RcvState = "";
				recordOrderAll(2);
			} else {
				vm.curmode = 11;
				mytimeout = $timeout($scope.onTimeout, 1000);
			}
		}

		$scope.backtomenu1 = function () {
			$timeout.cancel(mytimeout);
			vm.balance = ocxcmd('BC');
			ocxlog('현금거래취소 잔액:' + vm.balance);
			//if (vm.balance<-99) 
			{
				//ocxlog('현금거래취소 잔액:'+vm.balance);
				if ((vm.curmode < 12) && (vm.balance < Order.amount)) {
					status = ocxcmd('REFUND');
				}
			}
			ocxcmd('BB');
			gotoMenu();
		}

		vm.reloadsite = function () {
			gotoMenu();
		}

		$scope.cachcheckout = function (amount) {
			if (amount <= 0) {
				gotoMenu();
				return;
			}
			if (vm.order.check.genrecpt) {
				$scope.breceipt1 = '1';
			}
			ocxlog('현금거래시작 금액:' + amount + ', 주문내역:' + Order.detail);
			vm.balance = amount;
			var status = ocxcmd('RESET');
			status = ocxcmd('CV' + vm.order.site.coinval);
			if (vm.order.check.bnval) {
				status = ocxcmd('AV5000');
			} else {
				status = ocxcmd('AV1000');
			}
			status = ocxcmd('BA' + vm.balance);
			if (status == vm.balance) {
				Order.checked_by = 2;
				Order.amount = amount;
				Order.payment.id = 0;
				Order.payment.amount = amount;
				Order.payment.cardtype = "현금";
				vm.curmode = 10;
				$scope.RcvState = "지폐를 넣어주세요";
				vm.viewmode = 'cashmode';
				mytimeout = $timeout($scope.onTimeout, 1000);
				ocxcmd('SOvoices\\05_CASH.wav');
			} else {
				$scope.RcvState = "!! 지폐인식기 오류 !!";
			}
		}

		function blinker() {
			$('.blink_me').fadeOut(500).fadeIn(500);
		}

		setInterval(blinker, 500); //Runs every second

		$scope.cachcheckout(Order.amount);
	}

})();