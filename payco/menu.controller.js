(function () {
	'use strict';

	angular
		.module('app')
		.controller('ViewMenuController', ViewMenuController);

	ViewMenuController.$inject = ['$routeParams', '$http', '$scope', '$timeout', '$filter', '$location', '$rootScope', 'Order', '$interval'];

	function ViewMenuController($routeParams, $http, $scope, $timeout, $filter, $location, $rootScope, Order, $interval) {
		var vm = this;
		var i = 0;
		var status;
		var mytimeout;

		vm.initmode = 'menumode';
		vm.viewmode = vm.initmode;
		vm.cashocxver = 0;

		vm.category = undefined;
		vm.menus = [];
		vm.siteid = $routeParams.id;
		vm.type = $routeParams.type;
		vm.setcat = setCategory;
		vm.saveCheck = saveCheck;
		vm.paycoCheck = paycoCheck;

		vm.order = Order;
		$scope.BASE_URL = Order.BASE_URL;
		$scope.CI_URL = Order.CI_URL;
		var API_URL = Order.settings.apiurl;

		$scope.menuname = "선택하세요.";

		$scope.numMenu = -1;
		vm.selmenu = {
			name: ''
		};
		vm.optprice = 0;
		vm.optname = '';
		$scope.selection = [];

		vm.totalcnt = 0;

		//vm.modetimer = new Date();
		vm.bPinin = false;
		vm.pinnum = '1234';
		vm.password = '';
		vm.count = 0;

		loadCheck();
		loadSiteData(vm.siteid);

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

		window.onkeydown = function (e) {
			//ocxlog('onkwydown '+e.keyCode);
			if (e.keyCode == 8) // && e.target == document.body)
				e.preventDefault();
		}

		$scope.dinein = function () {
			vm.order.saletype = 98; //'매장';			
			vm.count = 0;
			if ((vm.category == undefined) || ((vm.category.dsporder % 100) == 99)) {
				var i;
				for (i = 0; i < vm.categories.length; i++) {
					//if ((vm.categories[i].dsporder % 100)<99) {
					if ((vm.categories[i].dsporder % 100) < 90 || (vm.categories[i].dsporder % 100) == vm.order.saletype) {
						vm.category = vm.categories[i];
						break;
					}
				}
			}
			vm.viewmode = 'menumode';
		}

		$scope.takeout = function () {
			vm.order.saletype = 99; //'포장';
			vm.count = 0;
			if ((vm.category == undefined) || ((vm.category.dsporder % 100) == 98)) {
				var i;
				for (i = 0; i < vm.categories.length; i++) {
					if ((vm.categories[i].dsporder % 100) < 90 || (vm.categories[i].dsporder % 100) == vm.order.saletype) {
						vm.category = vm.categories[i];
						break;
					}
				}
			}
			vm.viewmode = 'menumode';
		}

		function saveCheck() {
			localStorage.checkconf = JSON.stringify(vm.order.check);
			localStorage.pinnum = JSON.stringify(vm.pinnum);
			localStorage.PaycoInfo = JSON.stringify(vm.order.PaycoInfo);
		}

		function paycoCheck() {
			if (!vm.order.check.payco) {
				vm.order.PaycoInfo.apiKey = '';
				saveCheck();
			} else {
				$scope.registration();
			}			
		}

		function loadCheck() {
			if (!localStorage.checkconf) {
				localStorage.checkconf = JSON.stringify(vm.order.check);
			}
			if (!localStorage.pinnum) {
				localStorage.pinnum = JSON.stringify(vm.pinnum);
			}
			vm.order.check = JSON.parse(localStorage.checkconf);
			vm.pinnum = JSON.parse(localStorage.pinnum);
			if (vm.order.check.payco) {
				if (localStorage.PaycoInfo) {					
					vm.order.PaycoInfo = JSON.parse(localStorage.PaycoInfo);
				}
			}
		}

		$scope.optclose = function () {
			vm.selmenu = {
				name: ''
			};
			vm.optprice = 0;
			vm.optname = '';
			$scope.selection = [];
		}

		$scope.optok = function () {
			var newmenu = {
				mname: [''],
				price: 0,
				qty: vm.selmenu.qty,
				dsporder: vm.selmenu.dsporder,
				opt: 0
			};

			$scope.setMenu(newmenu);
		}

		$scope.setOption = function (menu) {
			var idx = $scope.selection.indexOf(menu.mname[0]);
			if (idx > -1) {
				$scope.selection.splice(idx, 1);
				vm.optprice -= Number(menu.price);
			} else {
				$scope.selection.push(menu.mname[0]);
				vm.optprice += Number(menu.price);
			}
		}

		$scope.setMenu = function (menu) {
			vm.count = 0;
			if (vm.viewmode == 'menumode') {
				//if ((vm.totalcnt+menu.qty)>50) {
				//	alert('총수량 50개 이하로 주문해주세요');
				//	return ;
				//}
				if (vm.selmenu.name.length == 0) {
					vm.optprice = 0;
					vm.optname = '';
					$scope.selection = [];
					vm.selmenu = {
						qty: Number(menu.qty),
						name: menu.mname[0],
						price: Number(menu.price),
						category: vm.category.name,
						ticketno: vm.siteid + Date.now().toString() + i,
						dsporder: menu.dsporder,
						opt: menu.opt
					};
				} else {
					vm.selmenu.name += ' ' + menu.mname[0];
					vm.selmenu.price += Number(menu.price);
				}
				if (menu.opt >= 1000) {
					vm.option = menu.opt;
					angular.element(document.querySelector('#myModal')).modal({
						backdrop: 'static',
						keyboard: false
					}); //'show');										
					return;
				} else {
					angular.element(document.querySelector('#myModal')).modal('hide');
				}

				if ($scope.selection.length > 0) {
					vm.optname = $scope.selection.join(',');
					vm.selmenu.name += ' ' + vm.optname;
					vm.selmenu.price += vm.optprice;
				}

				var i;
				//if ((Order.amount+Number(menu.price)*Number(menu.qty))<50000) 
				if (vm.category.dsporder == 901 && Order.selmenu.length > 0) {
					vm.optprice = 0;
					$scope.selection = [];
					return;
				}
				if (Number(vm.selmenu.price) >= 0) {
					for (i = 0; i < Order.selmenu.length; i++) {
						if (vm.selmenu.name === Order.selmenu[i].name) {
							if (vm.category.dsporder == 801) {
								// 금액입력 모드
								Order.selmenu[i].price += vm.selmenu.price * vm.selmenu.qty;
							} else if (vm.category.dsporder == 902) { //수량제한
								if ((Order.selmenu[i].num + Number(vm.selmenu.qty)) <= vm.selmenu.opt) {
									Order.selmenu[i].num += Number(vm.selmenu.qty);
									Order.amount += vm.selmenu.price * vm.selmenu.qty;
								}
							} else {
								Order.selmenu[i].num += Number(vm.selmenu.qty);
								Order.amount += vm.selmenu.price * vm.selmenu.qty;
							}
							break;
						}
					}
					if (i >= Order.selmenu.length) {
						var newmenu = {
							num: vm.selmenu.qty,
							name: vm.selmenu.name,
							price: vm.selmenu.price,
							category: vm.category.name,
							ticketno: vm.siteid + Date.now().toString() + i,
							dsporder: vm.selmenu.dsporder
						};
						if (vm.category.dsporder >= 900 && newmenu.dsporder < 900) { // modify for 997(big ticket)
							newmenu.dsporder = vm.category.dsporder;
						}
						if (newmenu.dsporder >= 900) { // for kidspark
							newmenu.name = menu.name;
						}
						Order.selmenu.push(newmenu);
						Order.amount += newmenu.price * newmenu.num;
						if (Order.selmenu.length==1) ocxcmd('SOvoices\\03_CHECKOUT.wav');
					}
				}
				vm.selmenu = {
					name: ''
				};
				vm.optprice = 0;
				vm.optname = '';
				vm.dough = -1;
				$scope.selection = [];
				draworder();
			}
		}

		$scope.cancelMenu = function (menu) {
			Order.selmenu.splice(Order.selmenu.indexOf(menu), 1);
			draworder();
		}

		$scope.clearMenu = function () {
			vm.selmenu = {
				name: ''
			};
			vm.optprice = 0;
			vm.optname = '';
			$scope.selection = [];
			Order.selmenu = [];
			$scope.selection = [];
			vm.viewmode = vm.initmode;
			vm.bPinin = false;
			vm.count = 0;
			draworder();
		}

		function draworder() {
			$scope.menuname = '';
			var total = 0;
			var totalcnt = 0;
			var i, add = 0;
			for (i = 0; i < Order.selmenu.length; i++) {
				if ($scope.menuname.length == 0) 
					$scope.menuname = Order.selmenu[i].name;
				add += Order.selmenu[i].num;				
				total += Order.selmenu[i].price * Order.selmenu[i].num;
				totalcnt += Order.selmenu[i].num;
			}
			add--;
			if (add>0) $scope.menuname += ' 외 '+add+' 건';
			Order.amount = total;
			vm.totalcnt = totalcnt;
			vm.order.ticketno = vm.siteid + Date.now().toString();
		}

		function loadSiteData(siteid) {
			ocxlog('loadSiteData ' + siteid);
			if (window.external.Test) {
				var vtid = window.external.GetBuffer('vanPosTid');
				var api = window.external.GetBuffer('apipath');
				Order.payco.vanPosTid = vtid;
				Order.payco.apipath = api;
				//alert(api+' '+vtid);
			}

			$http.get(API_URL + 'projects/edit/' + siteid)
				.then(
					function successCallback(response) {
						vm.site = response.data;
						//console.log(vm.site);
						Order.InitOrder(vm.site);
						if (vm.site.background && vm.site.background.length) {
							angular.element('body').css('background-image', 'url(\'../ci/uploads/' + vm.site.background + '\')');
						}
						if (vm.site.active == 2) {
							vm.initmode = 'typemode';
							vm.viewmode = vm.initmode;
						} else if (vm.site.active == 5) {
							vm.initmode = 'pinmode';
							vm.viewmode = vm.initmode;
						}

						loadCategory(siteid);
					},
					function errorCallback(response) {

					}
				);
		}

		function loadCategory(siteid) {
			$http.get(API_URL + 'categories/active/' + siteid)
				.then(
					function successCallback(response) {
						vm.categories = response.data;
						var d = new Date();
						var hour = d.getHours() * 100 + d.getMinutes();
						var i;
						var t1;
						var t2;
						var spstr;
						for (i = 0; i < vm.categories.length; i++) {
							t1 = Number(vm.categories[i].time1);
							t2 = Number(vm.categories[i].time2);
							if (t1 < t2) {
								if (hour < t1 || hour >= t2) {
									vm.categories[i].active = 0;
								}
							} else {
								if (t2 <= hour && t1 > hour) {
									vm.categories[i].active = 0;
								}
							}
							if (Number(vm.categories[i].active) > 0) {
								if (vm.category == undefined) {
									vm.category = vm.categories[i];
								}
							}
							spstr = vm.categories[i].name.split(':');
							vm.categories[i].name = spstr.join('\n');
						}

						if (vm.categories.length > 0) {
							loadMenuData(siteid);
						} else {
							vm.menus = [];
						}
					},
					function errorCallback(response) {

					}
				);
		}

		function loadMenuData(siteid) {
			$http.get(API_URL + 'menus/active/' + siteid)
				.then(
					function successCallback(response) {
						vm.menus = response.data;
						var d = new Date();
						var hour = d.getHours() * 100 + d.getMinutes();
						var i;
						var t1;
						var t2;
						var comments = "";
						var numMenu = 0;
						for (i = 0; i < vm.menus.length; i++) {
							vm.menus[i].price = Number(vm.menus[i].price);
							vm.menus[i].qty = Number(vm.menus[i].qty);
							t1 = Number(vm.menus[i].time1);
							t2 = Number(vm.menus[i].time2);
							comments = vm.menus[i].description.replace(/\r/gi, '');
							//comments = comments.concat(vm.menus[i].description.split('\r'));
							vm.menus[i].description = comments;
							if (t1 < t2) {
								if (hour < t1 || hour > t2) {
									vm.menus[i].active = 0;
								}
							} else {
								if (t2 < hour && t1 > hour) {
									vm.menus[i].active = 0;
								}
							}
							if (vm.menus[i].dsporder == 199) { // name.indexOf('라면')>=0) {
								if (d.getDay() == 6) { // saturday
									if (hour < 1000 || hour > 1330) {
										vm.menus[i].active = 0;
									}
								} else {
									if (hour >= 1100 && hour < 1400) {
										vm.menus[i].active = 0;
									}
									if (hour >= 1500 && hour < 1600) {
										vm.menus[i].active = 0;
									}
									if (hour < 959 || hour > 1659) {
										vm.menus[i].active = 0;
									}
								}
							} else if (vm.menus[i].dsporder == 99) { // 백반
								//if ((hour >= 1140) || (d.getDay() == 6)) {
								if (d.getDay() == 6) {
									vm.menus[i].active = 0;
								}
							}
							vm.menus[i].mname = vm.menus[i].name.split(':');
							if (vm.menus[i].active) numMenu++;
						}
						$scope.numMenu = numMenu;
						if (vm.order.check.payco && vm.order.PaycoInfo.apiKey.length<1) {
							$scope.registration();
						}
						ocxcmd('SOvoices\\01_MENU.wav');
					},
					function errorCallback(response) {

					}
				);
		}

		$scope.catefilter = function () {
			return function (item) {
				//return item['catid'] == vm.category.id && item['active'] != 0;
				if (item['active'] == 0) return false;
				if (item['dsporder'] >= 1000) return false;
				var optmod = item['dsporder'] % 100;
				if (optmod < 90) return true;
				return (vm.order.saletype == optmod);
			}
		}

		$scope.menufilter = function () {
			return function (item) {
				if (item['catid'] != vm.category.id || item['active'] == 0 || item['dsporder'] >= 1000) return false;
				//if (item['opt']<100 || item['opt']>=1000) return true;
				var optmod = item['opt'] % 1000;
				if (optmod < 990) return true;
				return (vm.order.saletype == optmod - 900);
			}
		}

		$scope.optfilter = function () {
			return function (item) {
				return item['catid'] == vm.category.id && item['dsporder'] == vm.option && item['qty'] == 1 && item['active'] != 0;
			}
		}

		$scope.setfilter = function () {
			return function (item) {
				return item['catid'] == vm.category.id && item['dsporder'] == vm.option && item['qty'] == 0 && item['active'] != 0;
			}
		}

		function setCategory(category) {
			vm.category = category;
		}

		$scope.registration = function () {
			var res;
			var apipath = Order.payco.apipath; //"https://alpha-dongle.payco.com";
			var data1 = {
				type: "POST",
				data: {
					posType: "POS",
					vanCorpCode: Order.payco.vanCorpCode, //"CMNKFTC", 
					vanPosTid: Order.payco.vanPosTid, //"KK06075399", 
					registrationNumber: Order.payco.registrationNumber, //"1098607871", 
					posDevCorpName: "NETPAY",
					posSolutionName: "vCAT데몬 Solution",
					posSolutionVersion: "ver 1.0.0.0",
				}
			};
			ocxlog('POS reg : '+Order.payco.registrationNumber+' '+Order.payco.vanPosTid);
			$.ajax({
				crossOrigin: true,
				proxy: Order.payco_proxy, //"http://amz4.local.tst/ver3/payco/proxy.php",
				url: apipath + "/pos/v1/registration",
				data: data1,
				success: function (response) {
					ocxlog(response);
					res = JSON.parse(response);
					if (res.resultCode == 0) {
						//alert('POS 단말 등록이 완료되었습니다');
						Order.PaycoInfo = JSON.parse(JSON.stringify(res.result));
						saveCheck();
					} else {
						//ocxlog(response);
						alert('POS 단말 등록 오류:' + res.message);
					}
				},
				error: function (response) {
					ocxlog(response);
				},
				complete: function () {
					//ocxlog('complete');  
				}
			});
		}

		$scope.paycocheckout = function () {
			draworder();
			if (Order.amount > 0) {
				Order.detail = $scope.menuname;
				$location.path('/payco');
			} else {
				alert('메뉴를 먼저 선택해 주세요');
			}
		}

		$scope.cardcheckout = function () {
			draworder();
			if (Order.amount > 0) {
				Order.detail = $scope.menuname;
				$location.path('/paycard/' + vm.order.check.manualcheck);
			} else {
				alert('메뉴를 먼저 선택해 주세요');
			}
		}

		$scope.cachcheckout = function () {
			draworder();
			if (Order.amount > 0) {
				Order.detail = $scope.menuname;
				$location.path('/paycash');
			} else {
				alert('메뉴를 먼저 선택해 주세요');
			}
		}

		$scope.cacherrorcheck = function () {
			var status = ocxcmd('CV' + vm.site.coinval);
			var cashocxver = ocxcmd('VERSION');
			var reval = ocxcmd('CHECKERR');
			vm.coinerr = ocxcmd('CE');
			if (reval > 0) {
				var user = confirm(reval + '원이 미반환되었습니다.\n' +
					'관리자에게 확인 후 재시도하시려면 확인을 눌러주세요\n cashif ver' + cashocxver +
					'\ncoin errcode:' + vm.coinerr
				);
				if (user) {
					reval = ocxcmd('REFUND' + reval);
					if (reval != 0) alert(reval);
				}
			} else {
				alert('미반환 금액이 확인되지 않습니다.\nver:' + cashocxver + '\ncoin errcode:' + vm.coinerr);
			}
		}

		function getTermInfo() {
			//CardService.payment.amount = 0;
			//CardService.cardreqinfo();
			//mytimeout = $timeout($scope.onCardTimeout,1000);
		}

		getTermInfo();

		vm.reloadsite = function () {
			ocxlog('reloadsite');
			location.reload();
		}

		$scope.cardcheck = function () {
			vm.password = '';
			vm.viewmode = 'cardqry';
		}

		$scope.backtomenu = function () {
			$scope.clearMenu();
			vm.viewmode = vm.initmode;
		}

		$scope.keynum = function (digit) {
			vm.password += digit;
		}

		$scope.clearpwd = function () {
			var len = vm.password.length;
			if (len > 0) {
				vm.password = vm.password.slice(0, len - 1);
			}
		}

		vm.numcoin = 10;
		vm.coinout = 0;

		$scope.adenter = function () {
			if (vm.viewmode == 'pinmode') {
				if (vm.password == vm.pinnum) {
					vm.bPinin = true;
					vm.password = '';
					$scope.dinein();
				} else {
					vm.password = '';
				}
			} else if (vm.password == vm.site.cardpw) {
				ocxlog('카드취소모드');
				var tmpuser = {
					'is_admin': false,
					'user_id': 0
				}
				$location.path('payments/' + vm.siteid);
			} else if (Number(vm.password) == Number(vm.site.cardpw) + 1) {
				ocxlog('동전방출모드');
				vm.password = '';
				vm.coinout = 0;
				vm.coinerr = ocxcmd('CE');
				var reval = ocxcmd('CHECKERR');
				if (reval > 0) {
					var status = ocxcmd('RESETALL');
				}
				vm.viewmode = 'coindrain';
			} else {
				vm.password = '';
			}
		}

		function coincheckerr() {
			vm.coinerr = ocxcmd('CE'); //CashifService.getcoinerr(cashif);
			var reval = ocxcmd('CHECKERR'); //CashifService.cacherrorcheck(cashif);
			if (reval > 0) {
				vm.coinout += vm.numcoin * vm.site.coinval - reval;
				alert('총방출금액 : ' + vm.coinout + '원');
			} else {
				vm.coinout += vm.numcoin * vm.site.coinval;
			}
		}

		$scope.coinDrain = function () {
			var status = ocxcmd('CV' + vm.site.coinval);
			status = ocxcmd('Ca');
			$timeout(coincheckerr, 13000);
		}

		$scope.coinReset = function () {
			var status = ocxcmd('CG');
		}

		// for change coinval
		vm.editproject = editProject;

		function editProject(site) {
			$http.post(API_URL + 'projects/save/' + site.id, site)
				.then(
					function successCallback(response) {
						return true;
					},
					function errorCallback(response) {
						return false;
					}
				);
		}

		function blinker() {
			$('.blink_me').fadeOut(500).fadeIn(500);
			vm.count++;
			if (vm.count>60) {		
				vm.count = 0;
				loadCategory(vm.siteid);
				$scope.backtomenu();				
			}
		}
		
		$interval(blinker, 1000);
	}

})();