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
		.controller('AccountPersonalCtrl', AccountPersonalCtrl)
		.controller('AccountPersonal2Ctrl', AccountPersonal2Ctrl);

	AccountPersonalCtrl.$inject = ['$routeParams', '$scope', '$http', '$rootScope', '$filter', 'Order'];
    function AccountPersonalCtrl($routeParams, $scope, $http, $rootScope, $filter, Order) {
        var vm = this;
        var API_URL = Order.settings.apiurl;
        
        vm.siteid = $routeParams.id;
		vm.gid = $routeParams.gid;
		vm.site = Order.site; 
		vm.ptotals = [];
		vm.export = fnExcelReport;
        vm.monthly = false;
		vm.datestr = '';
        
        if ($routeParams.date == undefined) {
            $scope.today = new Date();                           
        } else {
			if ($routeParams.date.length==8) {
                $scope.today = new Date($routeParams.date.slice(0,4)+'-'+$routeParams.date.slice(4,6)+'-'+$routeParams.date.slice(6));
            } else if ($routeParams.date.length==6) {
                $scope.today = new Date($routeParams.date.slice(0,4)+'-'+$routeParams.date.slice(4,6)+'-01');
                vm.monthly = true;
            } else if ($routeParams.date.length==7) {
				$scope.today = new Date($routeParams.date+'-01');
				vm.monthly = true;
			} else {
				$scope.today = new Date($routeParams.date);
			}
        }
		if (vm.monthly) {
			$scope.accdate = $filter('date')($scope.today,'yyyy-MM'); 
		} else {
			$scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd'); 
		}
        
        
        $scope.prevDate = function() {
            if (vm.monthly) {
                $scope.today.setMonth($scope.today.getMonth() - 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM');
            } else {
                $scope.today.setDate($scope.today.getDate() - 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd');
            }
            
            loadAllCheckout();
        }
        
        $scope.nextDate = function() {
            if (vm.monthly) {
                $scope.today.setMonth($scope.today.getMonth() + 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM');
            } else {
                $scope.today.setDate($scope.today.getDate() + 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd');
            }
            //loadAllCheckout();
        }
        
        initController();

        function initController() {
            //loadCurrentUser();
            loadAllCheckout();
        }

		function makereport(data) {
			var i;
			var pname = '';
			var puid = '';
			vm.ptotals = [];
			var grdtotal = {
					pname : 'Total',
					dept : '',
					uid : '',
					cnt1 : 0,
					cnt2 : 0,
					cnt3 : 0,
					cnt2 : 0,
					sum1 : 0,
					sum2 : 0,
					sum3 : 0,
					sum4 : 0
				}
			var ptotal = {};
			for (i=0; i<data.length; i++) {
				if ((pname!=data[i].pname)||(puid!=data[i].dept)) {
					ptotal = {
						pname : data[i].pname,
						dept : data[i].dept,
						uid : data[i].uid,
						cnt1 : 0,
						cnt2 : 0,
						cnt3 : 0,
						cnt4 : 0,
						sum1 : 0,
						sum2 : 0,
						sum3 : 0,
						sum4 : 0
					}
					vm.ptotals.push(ptotal);
					pname = data[i].pname;
					puid = data[i].dept;
				}
				if (data[i].mname=='조식') {
					ptotal.cnt1 = Number(data[i].cnt);
					ptotal.sum1 = Number(data[i].total);
					grdtotal.cnt1 += ptotal.cnt1;
					grdtotal.sum1 += ptotal.sum1;
				} else if (data[i].mname=='중식') {
					ptotal.cnt2 = Number(data[i].cnt);
					ptotal.sum2 = Number(data[i].total);
					grdtotal.cnt2 += ptotal.cnt2;
					grdtotal.sum2 += ptotal.sum2;
				} else if (data[i].mname=='석식') {
					ptotal.cnt3 = Number(data[i].cnt);
					ptotal.sum3 = Number(data[i].total);
					grdtotal.cnt3 += ptotal.cnt3;
					grdtotal.sum3 += ptotal.sum3;
				} else {
					ptotal.cnt4 = Number(data[i].cnt);
					ptotal.sum4 = Number(data[i].total);
					grdtotal.cnt4 += ptotal.cnt4;
					grdtotal.sum4 += ptotal.sum4;
				}				
			}
			vm.ptotals.push(grdtotal);
		}

		function loadAllCheckout() {
			var i;
            if (vm.monthly) 
                vm.datestr = $filter('date')($scope.today,'yyyy-MM'); 
            else
                vm.datestr = $filter('date')($scope.today,'yyyy-MM-dd'); 
			$http.get(API_URL+'orderItems/personal/'+vm.siteid+'/'+vm.gid+'/'+vm.datestr)
                .then(
                    function successCallback(response) {
                        makereport(response.data);   
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );			
        }

		
		function fnExcelReport()
		{
			var tab_text="<table border='2px'><tr bgcolor='#87AFC6'>";
			var textRange; var j=0;
			tab = document.getElementById('table1'); // id of table

			for(j = 0 ; j < tab.rows.length ; j++) 
			{     
				tab_text=tab_text+tab.rows[j].innerHTML+"</tr>";
				//tab_text=tab_text+"</tr>";
			}

			tab_text=tab_text+"</table>";
			tab_text= tab_text.replace(/<A[^>]*>|<\/A>/g, "");//remove if u want links in your table
			tab_text= tab_text.replace(/<img[^>]*>/gi,""); // remove if u want images in your table
			tab_text= tab_text.replace(/<input[^>]*>|<\/input>/gi, ""); // reomves input params

			var ua = window.navigator.userAgent;
			var msie = ua.indexOf("MSIE "); 

			if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer
			{
				txtArea1.document.open("txt/html","replace");
				txtArea1.document.write(tab_text);
				txtArea1.document.close();
				txtArea1.focus(); 
				sa=txtArea1.document.execCommand("SaveAs",true,vm.gid+"_"+vm.datestr+".xls");
			}  
			else                 //other browser not tested on IE 11
				sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));  

			return (sa);
		}
	}

	AccountPersonal2Ctrl.$inject = ['$routeParams', '$scope', '$http', '$rootScope', '$filter', 'Order'];
    function AccountPersonal2Ctrl($routeParams, $scope, $http, $rootScope, $filter, Order) {
        var vm = this;
        var API_URL = Order.settings.apiurl;
        
        vm.siteid = $routeParams.id;
		vm.gid = $routeParams.gid;
		vm.site = Order.site; 
		vm.ptotals = [];
		vm.export = fnExcelReport;
        vm.monthly = false;
		vm.datestr = '';
        
        if ($routeParams.date == undefined) {
            $scope.today = new Date();                           
        } else {
			if ($routeParams.date.length==8) {
                $scope.today = new Date($routeParams.date.slice(0,4)+'-'+$routeParams.date.slice(4,6)+'-'+$routeParams.date.slice(6));
            } else if ($routeParams.date.length==6) {
                $scope.today = new Date($routeParams.date.slice(0,4)+'-'+$routeParams.date.slice(4,6)+'-01');
                vm.monthly = true;
            } else if ($routeParams.date.length==7) {
				$scope.today = new Date($routeParams.date+'-01');
				vm.monthly = true;
			} else {
				$scope.today = new Date($routeParams.date);
			}
        }
		if (vm.monthly) {
			$scope.accdate = $filter('date')($scope.today,'yyyy-MM'); 
		} else {
			$scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd'); 
		}        
        
        $scope.prevDate = function() {
            if (vm.monthly) {
                $scope.today.setMonth($scope.today.getMonth() - 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM');
            } else {
                $scope.today.setDate($scope.today.getDate() - 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd');
            }
            
            loadAllCheckout();
        }
        
        $scope.nextDate = function() {
            if (vm.monthly) {
                $scope.today.setMonth($scope.today.getMonth() + 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM');
            } else {
                $scope.today.setDate($scope.today.getDate() + 1)
                $scope.accdate = $filter('date')($scope.today,'yyyy-MM-dd');
            }
            //loadAllCheckout();
        }
        
        initController();

        function initController() {
            //loadCurrentUser();
            loadAllCheckout();
        }
		
		$scope.nom = 0;
		$scope.dow = 0;

		function daysInMonth (month, year) {
			var date = new Date(year, month+1, 0);
			$scope.nom = date.getDate();
			$scope.dow = new Date(year, month, 1).getDay();
		}
		
		daysInMonth($scope.today.getMonth(), $scope.today.getFullYear());
		
		$scope.getNumber = function(num) {
			var days = new Array(num);   
			var i;
			for (i=0; i<num; i++) days[i] = i+1;
			return days;
		}

		function makereport(data) {
			var i, j, cnt1;
			var pname = '';
			var puid = '';
			vm.ptotals = [];
			var grdtotal = {
					pname : 'Total',
					dept : '',
					uid : '',					
					sum : 0,
					cnts : []
				}
			var ptotal = {};
			for (j=0; j<$scope.nom; j++) {
				var count = {cnt:0};
				grdtotal.cnts.push(count);
			}
			for (i=0; i<data.length; i++) {
				if ((pname!=data[i].pname)||(puid!=data[i].dept)) {
					ptotal = {
						pname : data[i].pname,
						dept : data[i].dept,
						uid : data[i].uid,
						sum : 0,
						cnts : []
					}
					for (j=0; j<$scope.nom; j++) {
						var count = {cnt:0};
						ptotal.cnts.push(count);
					}
					vm.ptotals.push(ptotal);
					pname = data[i].pname;
					puid = data[i].dept;
				}
				cnt1 = Number(data[i].cnt);
				ptotal.cnts[Number(data[i].day)-1].cnt = cnt1;
				grdtotal.cnts[Number(data[i].day)-1].cnt += cnt1;
				ptotal.sum += cnt1;
				grdtotal.sum += cnt1;
			}
			vm.ptotals.push(grdtotal);
		}

		function loadAllCheckout() {
			var i;
            if (vm.monthly) { 
                vm.datestr = $filter('date')($scope.today,'yyyy-MM'); 
            } else {
				return ;
			}
			$http.get(API_URL+'orderItems/personal2/'+vm.siteid+'/'+vm.gid+'/'+vm.datestr)
                .then(
                    function successCallback(response) {
                        makereport(response.data);   
                    }, 
                    function errorCallback(response) {
                        alert(response);
                    }
                );			
        }

		function fnExcelReport()
		{
			var tab_text="<table border='2px'><tr bgcolor='#87AFC6'>";
			var textRange; var j=0;
			tab = document.getElementById('table1'); // id of table

			for(j = 0 ; j < tab.rows.length ; j++) 
			{     
				tab_text=tab_text+tab.rows[j].innerHTML+"</tr>";
				//tab_text=tab_text+"</tr>";
			}

			tab_text=tab_text+"</table>";
			tab_text= tab_text.replace(/<A[^>]*>|<\/A>/g, "");//remove if u want links in your table
			tab_text= tab_text.replace(/<img[^>]*>/gi,""); // remove if u want images in your table
			tab_text= tab_text.replace(/<input[^>]*>|<\/input>/gi, ""); // reomves input params

			var ua = window.navigator.userAgent;
			var msie = ua.indexOf("MSIE "); 

			if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer
			{
				txtArea1.document.open("txt/html","replace");
				txtArea1.document.write(tab_text);
				txtArea1.document.close();
				txtArea1.focus(); 
				sa=txtArea1.document.execCommand("SaveAs",true,vm.gid+"_"+vm.datestr+".xls");
			}  
			else                 //other browser not tested on IE 11
				sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));  

			return (sa);
		}
	}
	
})();