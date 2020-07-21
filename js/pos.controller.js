(function () {
    'use strict';

    angular
        .module('app')		
		.controller('PosViewController', PosViewController);
    
    PosViewController.$inject = ['$routeParams', '$http', '$scope', '$timeout', '$filter', '$location', '$rootScope','Order']; //,'ngFileUpload'];
    function PosViewController($routeParams, $http, $scope, $timeout, $filter, $location, $rootScope, Order) { //, ngFileUpload) {
        var vm = this;        
        var i = 0;
        var status;        
        var mytimeout; 
        
		vm.cashif = cashif;	
		vm.initmode = 'menumode';
        vm.viewmode = vm.initmode;		
        vm.cashocxver = 0;
                
        vm.category = undefined;
        vm.menus = [];
        vm.siteid = $routeParams.id;
        vm.setcat = setCategory;
        vm.saveCheck = saveCheck;     
        
        vm.order = Order;
		$scope.BASE_URL = Order.BASE_URL;
		$scope.CI_URL = Order.CI_URL;
		var API_URL = Order.settings.apiurl;

		$scope.menuname = "선택하세요.";           
		vm.selmenu = {name : ''};
		
		$scope.numMenu = -1;
		
		vm.tkcount = 0;
		
		$scope.today = new Date();    
        vm.accday = $filter('date')($scope.today,'yyyyMMdd');            
        vm.accmonth = $filter('date')($scope.today,'yyyyMM');   

		loadCheck();
        loadSiteData(vm.siteid);                   
        
		function ocxcmd(cmd) {
			if ("ActiveXObject" in window) {		
				return cashif.BNCmd(cmd);
			}
			return -1;
		}

		function ocxlog(logdata) {
			ocxcmd('LG'+logdata);
		}
		
		$scope.dinein = function() {
			vm.order.saletype = '매장';
	        vm.viewmode = 'menumode';
		}

		$scope.takeout = function() {
			vm.order.saletype = '포장';
	        vm.viewmode = 'menumode';			
		}

        function saveCheck() {
            localStorage.checkconf = JSON.stringify(vm.order.check);
        }
        
        function loadCheck() {
            if(!localStorage.checkconf){
                localStorage.checkconf = JSON.stringify(vm.order.check);
            }
            vm.order.check = JSON.parse(localStorage.checkconf);
        }

		$scope.form = [];
		$scope.files = [];
		
		var options = { 
			target:        '#output2',   
			beforeSubmit:  showRequest,  
			success:       showResponse, 
			// other available options: 
			url:       Order.BASE_URL+'ci/index.php/Auth/upload',         
			type:      'post',       
			// $.ajax options can be used here too, for example: 
			//timeout:   3000 
			}; 

		// pre-submit callback 
		function showRequest(formData, jqForm, options) { 
			//var queryString = $.param(formData); 
			return true; 
		} 
		 
		// post-submit callback 
		function showResponse(responseText, statusText, xhr, $form)  { 
			alert('upload complete !');
			setTimeout(function() {
				$scope.$apply(function() {
					$scope.form.menu.image = $("#output2").text();										
				});
			}, 500);
		} 

		$scope.submit = function(menu) {
			$scope.form.image = $scope.files; 
			$scope.form.menu = menu;
			$("#uploadForm"+menu.id).ajaxSubmit(options); 
			return false;
		}

		$scope.uploadedFile = function(element) {
			if (element.files) {
				$scope.files = element.files[0];
			} else {
				$scope.files = element.value;				
			}
			var reader = new FileReader();
			reader.onload = function(event) {
				var elem = angular.element("#img"+element.id);
				elem[0].src = event.target.result;
				$scope.$apply(function($scope) {
					//$scope.files = element.files;
				});
			}
			reader.readAsDataURL($scope.files);
		}
        		
		function Msgdisp(msg) 
		{
			vm.message = msg;
			angular.element(document.querySelector('#MsgBox')).modal('show');	
		}

		$scope.msgclose = function() {
		}
		

		$scope.setOption = function(menu) {
			angular.element(document.querySelector('#myModal')).modal('hide');
			if (menu.dsporder>=1000) {
				var newmenu = {
					mname : [vm.selmenu.name + ' ' + menu.mname[0]], 
					price : Number(vm.selmenu.price) + Number(menu.price),
					qty : vm.selmenu.qty,
					dsporder : vm.selmenu.dsporder,
					opt : 0
				};
				$scope.setMenu(newmenu);
			}
		}

		function pad(n, width, z) {
		  z = z || '0';
		  n = n + '';
		  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
		}

		function getTicketno(type, siteid) {
			var tmval = parseInt(Date.now() / 100) % 100000;
			var ticketno = type+pad(siteid,2)+pad(tmval,6); 
			return ticketno;
		}

        $scope.setMenu = function(menu) {    
			if (vm.viewmode == 'menumode') {	
				if (vm.selmenu.name.length==0) {
					vm.optprice = 0;
					vm.optname = '';
					$scope.selection = [];
					vm.selmenu = {
						qty : Number(menu.qty), 
						name : menu.mname[0], 
						price : Number(menu.price),
						dsporder : menu.dsporder,
						opt : menu.opt
					};
				} else {
					vm.selmenu.name += ' ' + menu.mname[0];
					vm.selmenu.price += Number(menu.price);
				}
				if (menu.opt >= 1000) {
					vm.option = menu.opt;					
					angular.element(document.querySelector('#myModal')).modal('show');										
					return ;
				} else {
					angular.element(document.querySelector('#myModal')).modal('hide');
				}
                var i;
				// category.dsporder 
				// 901 : only one item can select
				// 801 : amount mode
				//
				// menu.dsporder
				// 899 : print meal ticket mode
				//
				if (vm.category.dsporder==901 && Order.selmenu.length>0) {
					return ;
				}
				if (Number(vm.selmenu.price)>=0) {	           
					for (i=0; i<Order.selmenu.length; i++) {
						if (vm.selmenu.name===Order.selmenu[i].name) {
							if (vm.category.dsporder==801){
								// 금액입력 모드
								Order.selmenu[i].price += vm.selmenu.price * vm.selmenu.qty;
							} else {
								Order.selmenu[i].num += Number(vm.selmenu.qty);
								Order.amount += vm.selmenu.price * vm.selmenu.qty;
							}
							break;
						}
					}
					if (i>=Order.selmenu.length)
					{
						var newmenu = {
							num : vm.selmenu.qty, 
							name : vm.selmenu.name, 
							price : vm.selmenu.price,
							category : vm.category.name,          
							ticketno : getTicketno(1,vm.siteid),
							dsporder : vm.selmenu.dsporder,
							opt : menu.opt
						};
						if (newmenu.dsporder<200 && vm.category.dsporder>=900) {
							newmenu.dsporder = vm.category.dsporder;
						}      
						if (newmenu.dsporder>=900) { // for kidspark
							newmenu.name = menu.name;
						}
						Order.selmenu.push(newmenu);	                    
						Order.amount += newmenu.price*newmenu.num;
					}
				}
				vm.selmenu = {name : ''};
				draworder();                
			}
        }

        $scope.cancelMenu = function(menu) {
            Order.selmenu.splice(Order.selmenu.indexOf(menu),1);
            draworder();
        }        
        
		$scope.clearMenu = function() {
            Order.selmenu = []; 
			vm.viewmode = vm.initmode;
			draworder();
        }

        function draworder() {
            $scope.menuname = '';
            var total = 0; 
            var i;
            for (i=0; i<Order.selmenu.length; i++) {
                if ($scope.menuname.length>0) 
                    $scope.menuname += ', ';
                $scope.menuname += Order.selmenu[i].name;
                total += Order.selmenu[i].price * Order.selmenu[i].num;
            }
            Order.amount = total;
            vm.order.ticketno = getTicketno(2,vm.siteid); //vm.siteid + Date.now().toString();
        }
        
        function loadSiteData(siteid) {
			ocxlog('loadSiteData');
            $http.get(API_URL+'projects/edit/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.site = response.data;
						Order.InitOrder(vm.site);
						Order.MENU_URL = '/posview/'+vm.siteid;
                        /*if (vm.site.background && vm.site.background.length) {
                            angular.element('body').css('background-image', 'url(\'./ci/uploads/' + vm.site.background + '\')');
                        }
						if (vm.site.active==2) {
							vm.initmode = 'typemode';
							vm.viewmode = vm.initmode;	
						}*/
                        loadCategory(siteid);
                    }, 
                    function errorCallback(response) {
                        
                    }
                );
		}

		function loadTicketData(siteid) {
			ocxlog('loadTicketData');
			$http.get(API_URL+'orderItems/startno/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.tkid = parseInt( Number(response.data.startno)/1000); //Number(response.data[0].startno);
						vm.tkcount = Number(response.data.count);
						vm.numreg = Number(response.data.numreg);
						vm.numused = Number(response.data.numused);
						if (response.data.numnotused) {
							vm.numnotused = Number(response.data.numnotused);
						} else {
							vm.numnotused = 0;
						}
						if (response.data.numused1) {
							vm.numused1 = Number(response.data.numused1);
						} else {
							vm.numused1 = 0;
						}
                    }, 
                    function errorCallback(response) {
						vm.tkid = 0;
                        vm.tkcount = 0;
                    }
                );
        }
        
        function loadCategory(siteid) {
            $http.get(API_URL+'categories/index/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.categories = response.data;            
                        var d = new Date();
                        var hour = d.getHours()*100+d.getMinutes();
                        var i;
                        var t1;
                        var t2;
						var spstr;
                        for (i=0; i<vm.categories.length; i++) {
                            t1 = Number(vm.categories[i].time1);
                            t2 = Number(vm.categories[i].time2);
                            if (t1<t2) {
                                if (hour<t1 || hour>=t2) {
                                    vm.categories[i].active = 0;
                                }
                            } else {
                                if (t2<=hour && t1>hour) {
                                    vm.categories[i].active = 0;
                                }
                            }
                            if (Number(vm.categories[i].active)>0) {
                                if (vm.category == undefined) {
                                    vm.category = vm.categories[i];
                                }    
                            }
							spstr = vm.categories[i].name.split(':');
					        vm.categories[i].name = spstr.join('\n');
                        }
                        
                        if (vm.categories.length>0) {
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
            $http.get(API_URL+'menus/active/'+siteid)
                .then(
                    function successCallback(response) {
                        vm.menus = response.data;    
                        var d = new Date();
                        var hour = d.getHours()*100+d.getMinutes();
                        var i;
                        var t1;
                        var t2;
						var comments = "";
						var numMenu = 0;
                        for (i=0; i<vm.menus.length; i++) {
							vm.menus[i].price = Number(vm.menus[i].price);
							vm.menus[i].qty = Number(vm.menus[i].qty);
                            t1 = Number(vm.menus[i].time1);
                            t2 = Number(vm.menus[i].time2);
							comments = vm.menus[i].description.replace( /\r/gi, '');
							//comments = comments.concat(vm.menus[i].description.split('\r'));
							vm.menus[i].description = comments;
                            if (t1<t2) {
                                if (hour<t1 || hour>t2) {
                                    vm.menus[i].active = 0;
                                }
                            } else {
                                if (t2<hour && t1>hour) {
                                    vm.menus[i].active = 0;
                                }
                            }
							vm.menus[i].mname = vm.menus[i].name.split(':');
							if (vm.menus[i].active) numMenu++;
                        }
						$scope.numMenu = numMenu;
						loadTicketData(siteid);
                    }, 
                    function errorCallback(response) {
                    
                    }
                );
        }
        
        $scope.catfilter = function(){
            return function(item){
				if (vm.category){				
					return item['catid'] == vm.category.id; // && item['active'] != 0;
				} else return true;
				/*if (vm.order.saletype == '포장') {
					return item['catid'] == vm.category.id && item['active'] != 0 && item['dsporder']>=100 && item['dsporder']<1000;
				} else {
	                return item['catid'] == vm.category.id && item['active'] != 0 && item['dsporder']<1000;
				}*/
            }
        }

		$scope.optfilter = function(){
            return function(item){
				if (vm.category){
	                return item['catid'] == vm.category.id && item['dsporder'] == vm.option && item['active'] != 0;
				} else {
					return true;
				}
            }
        }

		$scope.setfilter = function(){
            return function(item){
				if (vm.category){
	                return item['catid'] == vm.category.id && item['dsporder'] >= 500 && item['dsporder'] < 590 && item['active'] != 0;
				} else {
					return true;
				}
            }
        }
        
        function setCategory(category) {
            vm.category = category;
        }
 

        $scope.cardcheckout = function() {
            draworder();    
            if (Order.amount>0) {  
				Order.detail = $scope.menuname;
                $location.path('/paycard/'+vm.order.check.manualcheck);
            } else {
                Msgdisp('메뉴를 먼저 선택해 주세요');
            }            
        }
                
        $scope.manpaycheckout = function() {
            draworder();            
            if (Order.amount>0) {  
				Order.detail = $scope.menuname;
				$location.path('/manpay');
            } else {
                Msgdisp('메뉴를 먼저 선택해 주세요');
            }            
        }
                       
        $scope.cacherrorcheck = function() {
            var status = ocxcmd('CV'+vm.site.coinval);
            var cashocxver = ocxcmd('VERSION');
            var reval = ocxcmd('CHECKERR'); 
            vm.coinerr = ocxcmd('CE');
            if (reval>0) {
                var user = confirm(reval+'원이 미반환되었습니다.\n'
                                   +'관리자에게 확인 후 재시도하시려면 확인을 눌러주세요\n cashif ver'+cashocxver
                                   +'\ncoin errcode:'+vm.coinerr
                                  );
                if (user) {                               
                    reval = ocxcmd('REFUND'+reval); 
                    if (reval!=0) alert(reval);
                }
            } else {                
                alert('미반환 금액이 확인되지 않습니다.\nver:'+cashocxver+'\ncoin errcode:'+vm.coinerr);
            }
        }
        
        
              
		function getTermInfo()
        {
            //CardService.payment.amount = 0;
            //CardService.cardreqinfo();
            //mytimeout = $timeout($scope.onCardTimeout,1000);
        }
        
        getTermInfo();

        vm.reloadsite = function() {
			ocxlog('reloadsite');
            location.reload();
        }
        
        $scope.cardcheck = function() {
            vm.password = '';
            vm.viewmode = 'cardqry';
        }
        
		$scope.backtomenu = function() {			
			$scope.clearMenu();
            vm.viewmode = vm.initmode;
        }

        $scope.keynum = function(digit) {
            vm.password += digit;
        }
        
        vm.numcoin = 10;
        vm.coinout = 0;
        
        $scope.adenter = function() {
            if (vm.password == vm.site.cardpw) { 
				ocxlog('카드취소모드');
                var tmpuser = {
                    'is_admin' : false,
                    'user_id' : 0
                }                
                $location.path('payments/'+vm.siteid);
            } else if (Number(vm.password) == Number(vm.site.cardpw)+1) {
				ocxlog('동전방출모드');
                vm.password = '';
                vm.coinout = 0;
                vm.coinerr = ocxcmd('CE'); 
				var reval = ocxcmd('CHECKERR');
				if (reval>0) {
					var status = ocxcmd('RESETALL');
				}
                vm.viewmode = 'coindrain';
            } else {
                vm.password = '';
            }
        }        
        
        function coincheckerr() {
            vm.coinerr = ocxcmd('CE'); 
            var reval = ocxcmd('CHECKERR'); 
            if (reval>0) {
                vm.coinout += vm.numcoin * vm.site.coinval - reval;
                alert('총방출금액 : '+ vm.coinout + '원');                
            } else {
                vm.coinout += vm.numcoin * vm.site.coinval;
            }
        }
        
        $scope.coinDrain = function() {			
			var status = ocxcmd('CV'+vm.site.coinval);
            status = ocxcmd('Ca');
            $timeout(coincheckerr, 13000);
        }
        
        $scope.coinReset = function() {
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
		}

		setInterval(blinker, 500); //Runs every second
				
    }	
	
})();
