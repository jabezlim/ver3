(function () {
    'use strict';

    angular
        .module('app')
        .factory('Order', Order);
    
	Order.$inject = ['$http'];
    function Order($http) {
        var order = {};        
		var url = window.location.href;
		var n = url.indexOf('#/');
		var base = url.slice(0,n);
		n = base.lastIndexOf('/');
		order.BASE_URL = url.slice(0,n+1)+'/'; 
		order.CI_URL = order.BASE_URL+'../../ci/'; 
		order.settings = {
			bnval : 1000,
			pageSize : 10,
			apiurl : order.CI_URL+'index.php/api2/',
			ctype : '', //'ver3/',
			cardimg : 'insertcardv.png'
		};

		order.MENU_URL = '/';
        order.id = 0;
		order.siteid = 0;
		order.amount = 0;
		//order.selmenu = [];
		order.checked_by = 0;
		order.detail = '';
		order.saletype = 0;
		order.home = false;
		order.site = {
			id : 0,
			name : '',
			coinval : 100
		}
		order.payment = {
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
        order.check = {
			cardcheck : 1,	
			cashcheck : 1,	
			manualcheck : 0, 
			texrecpt : 1, 
			genrecpt : 0, 
			zeropay : 0,  
			payco : 1,
			option8 : 0,
			option9 : 0,
			option10 : 0
		};

		order.payco = {
			apipath : "https://alpha-dongle.payco.com",
			proxy: "http://menuroid.local.tst/hanyang/ver3/payco/proxy.php",
			//proxy: "http://menuroid.co.kr/hanyang/ver3/payco/proxy.php",
			vanCorpCode: "CMNKFTC", 
			vanPosTid: "KK06075399", 
			registrationNumber: "1098607871"			
		}

		order.PaycoInfo = {
            posTid : 'P2008144577',
            apiKey : '5407d0d647465df8d8b6ad422d682791'
        };

		order.paytype = paytype;
		order.InitOrder = initOrder;
		order.recordOrderAll = recordOrderAll;
		order.recordOrder = recordOrder;
		order.recordPayment = recordPayment;
		order.recordOrderItem = recordOrderItem;
		order.updateOrderItem = updateOrderItem;

        //initOrder(order.site);

        return order;

		function paytype(checked) {
            if (checked==2 || checked==3 || checked==13) {
                return "현금";
			}
			else if (checked==11) {
                return "페이온";
            }
            else if (checked==17) {
                return "제로페이";
            }
            else if (checked==8) {
                return "페이스페이";
			}
			else if (checked==18) {
                return "페이코";
            }
            else {
                return "신용카드";
            }
		}
		
        function initOrder(site) {
			order.id = 0;
			order.amount = 0;
			order.selmenu = [];
			order.checked_by = 0;
			order.detail = '';
			order.saletype = 0;
			order.site = site;
			order.MENU_URL = '/viewmenu/'+site.id;
			order.payment = {
				siteid : site.id,
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
			order.error = '';			
			order.payco.registrationNumber = site.busno.split('-').join('');
        } 
		
		function recordOrderAll(payment) {     
			order.checked_by = payment.checked_by;
			var order1 = { 
                siteid : order.site.id,
                amount : payment.amount,
                checked_by : payment.checked_by,
                ticketno : order.ticketno,
				termid : payment.termid,
				cardtype : payment.cardtype,
				cardno : payment.cardno,
				appno : payment.appno,
				saledate : payment.saledate,
				saletime : payment.saletime,				
				selmenus : order.selmenu
			}
            return $http.post(order.settings.apiurl+'orders/saveAll',order1)
                .then(
                    function successCallback(response) {                          
                        order.id = response.data.id; 
						order.dayindex = response.data.dayindex; 
                        return true;                         
                    }, 
                    function errorCallback(response) {
						order.id = 0; 
						order.dayindex = 0; 
						order.error = JSON.stringify(response);
						return false;           
                    }
                );
        }

		function recordOrder(checktype) {     
			order.checked_by = checktype;
			var order1 = { 
                siteid : order.site.id,
                amount : order.amount,
                checked_by : checktype,
                ticketno : order.ticketno
            }			
            return $http.post(order.settings.apiurl+'orders/save',order1)
                .then(
                    function successCallback(response) {                          
                        order.id = response.data.id; 
						order.dayindex = response.data.dayindex; 
                        return true;                         
                    }, 
                    function errorCallback(response) {
						order.id = 0; 
						order.dayindex = 0; 
						order.error = response.status;
						return false;           
                    }
                );
        }

		function recordPayment(payment, idx) {   
            return $http.post(order.settings.apiurl+'payments/save',payment)
                .then(
                    function successCallback(response) {    
						order.payment.id = response.data.id; 
                        return idx+1;                         
                    }, 
                    function errorCallback(response) {
						order.error = response.status;
						return false;
                    }
                );
        }

		function recordOrderItem(idx) {    			
            var orderitem = { 
                siteid : order.site.id,
                orderid : order.id,
                category : order.selmenu[idx].category,
                name : order.selmenu[idx].name,
                num : order.selmenu[idx].num,
                price : order.selmenu[idx].price,
                ticketno : order.selmenu[idx].ticketno
            };
			
			return $http.post(order.settings.apiurl+'orderItems/save',orderitem)
				.then(
					function successCallback(response) {    
						order.selmenu[idx].id = response.data.id; 
						return idx+1;
					}, 
					function errorCallback(response) {      
						//order.error = response.status;
						return -1;
					}
				);  
        }
		
		function updateOrderItem(idx) {    			
            var orderitem = { 
                orderid : order.id,
                category : order.selmenu[idx].category,
                name : order.selmenu[idx].name,
				num : 1,
                price : order.selmenu[idx].price
            };
			var startno = order.selmenu[idx].ticketno;
			var exp = 12;
			if (order.selmenu[idx].dsporder==899 && order.selmenu[idx].opt>0) {
				exp = order.selmenu[idx].opt;
			}
            return $http.post(order.settings.apiurl+'orderItems/saleticket/'+
								order.site.id+'/'+startno+'/'+order.selmenu[idx].num+'/'+exp,
								orderitem)
				.then(
					function successCallback(response) {    
						//order.selmenu[idx].id = response.data.id; 
						return idx+1;
					}, 
					function errorCallback(response) {      
						//order.error = response.status;
						return -1;
					}
				);            
        }
    }

})();