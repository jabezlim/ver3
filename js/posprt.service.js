(function () {
    'use strict';

    angular
        .module('app')
        .factory('PrintService', PrintService);

    PrintService.$inject = ['$filter'];
    function PrintService($filter) {
        var service = {};

        service.prtout = Prtout;
		service.TicketPrint = TicketPrint;        
		service.OrderPrint1 = OrderPrint1;
		service.OrderPrint2 = OrderPrint2;
		service.receiptPrint = receiptPrint;
		service.cancelReceipt = cancelReceipt;

        initService();

        return service;

        function initService() {
        }
        
		function ocxcmd(cmd) {
			if (window.external.Test) {			
				return window.external.BNCmd(cmd);
			} else if ("ActiveXObject" in window) {		
				return cashif.BNCmd(cmd);
			}
			return -1;
		}

		function Prtout(vm, message) {			
			var status = ocxcmd(message); 			
			if (status!=123) { // retry
				status = ocxcmd(message);
			}
			return status;
        }
		
		function zero(n, len) {
            var num = parseInt(n, 10);
            var len = parseInt(len, 10);
            if (isNaN(num) || isNaN(len)) {
                return n;
            }
            num = ''+num;
            while (num.length < len) {
                num = '0'+num;
            }
            return num;
        };
        
        function TicketPrint(vm, menu, idx) {            
            var tkstr; 
            var tkcode;
            tkcode = idx==0 ? menu.ticketno : menu.ticketno+zero(idx,2);
			if (menu.dsporder==997) {				
				tkstr = menu.name + ";L----------------;B";
			} else {
				tkstr = menu.name + ";B";
			}
			tkstr += tkcode + ";S";
			tkstr += tkcode + ";S"; 
            tkstr += $filter('number')(menu.price) + "원 "+menu.category+" No:"+vm.order.id+";";            
            tkstr += "F%-20s %20s|["+vm.order.site.name +"]|";
            tkstr += $filter('date')(new Date(),'yyyy/MM/dd HH:mm.ss'); 
			if (menu.dsporder==997) {
				tkstr += ";L----------------";
            }				
            if (idx<2) {
                tkstr += ";C0;C1";
            }	
            return Prtout(vm, "PP0L"+tkstr);   
        }

		function OrderPrint1(vm, order, selmenu) {
            var tknum = zero(order.dayindex % 1000,3);
            var tkstr = "PP0L[";			
			var i, j, cnt = 0;
			var status = 0;
			if (order.saletype.length>1){				
				tkstr += order.saletype+":"+tknum+"];";
			} else {
				tkstr += "No:"+tknum+"];";
			}
			
            for (i=0; i<selmenu.length; i++) {
				if (selmenu[i].dsporder==1004) {
					// charger no order sheet
					return 123;
				}
				if (selmenu[i].dsporder>=900) {
					for (j=0; j<selmenu[i].num; j++) {
						status = TicketPrint(vm, selmenu[i], selmenu[i].num>1 ? j+1 : 0);
						if (status!=123) {
							return status;
						}
					}
				} else {
					cnt++;
					if (Number(selmenu[i].num)>1) 
						tkstr += "L"+selmenu[i].name+"x"+selmenu[i].num+";";
					else 
						tkstr += "L"+selmenu[i].name+";";
				}
            }            
			if (cnt>0) {			
				tkstr += "B"+order.ticketno + "0;S";
				tkstr += order.ticketno + ";S[";
				tkstr += order.site.name +"];S";
                tkstr += $filter('date')(new Date(),'yyyy/MM/dd HH:mm.ss');
                if (cnt==selmenu.length) {
                    tkstr += ";C0;C1";
                }
				return Prtout(vm, tkstr);   
			}
			return 123;
        }

		function TicketPrint2(vm, menu, idx) {
            var tknum = zero(menu.id % 1000,3);
            var tkcode;            
            var tkstr = "];L" + menu.name + ";L";
            tkcode = idx==0 ? menu.ticketno : menu.ticketno+zero(idx,2);
            tkstr += menu.price + "원;S["+menu.category+" order no:"+vm.order.id+"];B";
            tkstr += tkcode + ";S";
            tkstr += tkcode + ";S[";
            tkstr += vm.order.site.name +"];S";
            tkstr += $filter('date')(new Date(),'yyyy/MM/dd HH:mm.ss');			
            return Prtout(vm, "PP9L[No:"+tknum+tkstr);   
        }

		function OrderPrint2(vm, order, selmenu) {
            var tknum = zero(order.dayindex % 1000,3);
            var tkstr = "PP9L ;L ;S------------------------;";			
			tkstr += "L["+order.saletype+" 주문서:"+tknum+" ];";
			var mname='';
			var i, j, cnt = 0;
            for (i=0; i<selmenu.length; i++) {
				if (selmenu[i].dsporder>=900) {
					for (j=0; j<selmenu[i].num; j++) {
						status = TicketPrint2(vm, selmenu[i], selmenu[i].num>1 ? j+1 : 0);
						if (status!=123) {
							return status;
						}
					}
				} else {
					cnt++;
					if (Number(selmenu[i].num)>1) 
						mname += "L"+selmenu[i].name+"x"+selmenu[i].num+";";
					else 
						mname += "L"+selmenu[i].name+";";
				}
            }            
			if (cnt>0) {			
				tkstr += "L ;";
				tkstr += mname + "S";
				tkstr += order.ticketno + ";S[";
				tkstr += vm.order.site.name +"];S";
                tkstr += $filter('date')(new Date(),'yyyy/MM/dd HH:mm.ss');                
				return Prtout(vm, tkstr);   
			}
			return 123;
        }

		function receiptPrint(vm, selmenu, payment) {
            var i;
            var mname;
            var totalamt = payment.amount; 
            var tax = parseInt(totalamt/11+0.5);
            var rcstr = "PP0L"+vm.RevTitle+";S;P상 호 : ";
            rcstr += vm.order.site.regname + ';P사업자번호:';
            rcstr += vm.order.site.busno + '  대표자:'+ vm.order.site.ownername+';P';
            rcstr += vm.order.site.addr + ';P전화번호:';
            rcstr += vm.order.site.tel +';;P';
            rcstr += payment.saledate+' '+payment.saletime+' OrderNo:';
            rcstr += payment.orderid + 
                ';P=========================================='+
                ';P메뉴명                   단가  수량   금액'+
                ';P==========================================';
            for (i=0; i<selmenu.length; i++) {
				mname = selmenu[i].name.split(":");
                rcstr += ';F%-24s%6s%4s%8s|'+mname[0]+'|';
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
            if (vm.order.site.PrtMsgs.length>0) {
                var spstr = vm.order.site.PrtMsgs.split('\x1E');
                rcstr += ';P'+spstr.join(' ');
            }
            return Prtout(vm, rcstr);                
        }

		function cancelReceipt(vm, payment) {
            var totalamt = payment.amount; 
            var tax = parseInt(totalamt/11+0.5);
            var rcstr = "PP0L"+vm.RevTitle+";S;P상 호 : ";
            rcstr += vm.order.site.regname + ';P사업자번호:';
            rcstr += vm.order.site.busno + '  대표자:'+ vm.order.site.ownername+';P';
            rcstr += vm.order.site.addr + ';P전화번호:';
            rcstr += vm.order.site.tel +';;P';
            rcstr += payment.saledate+' '+payment.saletime+' OrderNo:';
            rcstr += payment.orderid + ';P판매금액 : ';
            rcstr += payment.amount +';P세    금 : ';
            rcstr += tax+';P취소금액 : ' + payment.amount;
            if (payment.appno.length>0) {
                rcstr += ';P승인번호:'+payment.appno;
            }
            if (payment.cardno.length>0) {
                if (payment.checked_by!=1) 
                    rcstr += ';P식별번호:'+payment.cardno;
                else    
                    rcstr += ';P카드번호:'+payment.cardno;
            }
            if (payment.cardtype.length>0) {
                    ';P매입사:'+payment.cardtype;
            } 
            rcstr += ';P====================================;';
            if (vm.order.site.PrtMsgs.length>0) {
                var spstr = vm.order.site.PrtMsgs.split('\x1E');
                rcstr += ';P'+spstr.join(' ');
            }            
            return Prtout(vm, rcstr);    
            
        }
    }

})();