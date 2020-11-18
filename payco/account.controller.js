(function () {
  'use strict';

  angular
    .module('app') //,['ui.bootstrap'])
    .filter('startFrom', function () {
      return function (input, start) {
        start = +start; //parse to int
        return input.slice(start);
      }
    })
    .controller('AccountListCtrl', AccountListCtrl)
    .controller('AccountMenuCtrl', AccountMenuCtrl);

  AccountListCtrl.$inject = ['$routeParams', '$scope', '$http', '$rootScope', '$filter', 'Order'];

  function AccountListCtrl($routeParams, $scope, $http, $rootScope, $filter, Order) {
    var vm = this;
    var API_URL = Order.settings.apiurl;

    vm.m_strSendCmd = "";
    //vm.user = null;
    vm.siteid = $routeParams.id;
    vm.checkouts = [];
    vm.cancellist = [];
    vm.viewdetail = viewDetail;
    vm.monthly = false;

    if ($routeParams.date == undefined) {
      $scope.today = new Date();
    } else {
      if ($routeParams.date.length == 8) {
        $scope.today = new Date($routeParams.date.slice(0, 4) + '-' + $routeParams.date.slice(4, 6) + '-' + $routeParams.date.slice(6));
      } else if ($routeParams.date.length == 6) {
        $scope.today = new Date($routeParams.date.slice(0, 4) + '-' + $routeParams.date.slice(4, 6) + '-01');
        vm.monthly = true;
      } else if ($routeParams.date.length == 7) {
        $scope.today = new Date($routeParams.date + '-01');
        vm.monthly = true;
      } else {
        $scope.today = new Date($routeParams.date);
      }
    }
    if (vm.monthly) {
      $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
    } else {
      $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
    }

    function ocxcmd(cmd) {
      if (window.external.Test) {
        return window.external.BNCmd(cmd);
      } else if (("ActiveXObject" in window) && cashif) {
        return cashif.BNCmd(cmd);
      }
      return -1;
    }

    $scope.prevDate = function () {
      if (vm.monthly) {
        $scope.today.setMonth($scope.today.getMonth() - 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
      } else {
        $scope.today.setDate($scope.today.getDate() - 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
      }
      loadAllCheckout();
    }

    $scope.nextDate = function () {
      if (vm.monthly) {
        $scope.today.setMonth($scope.today.getMonth() + 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
      } else {
        $scope.today.setDate($scope.today.getDate() + 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
      }
      loadAllCheckout();
    }

    initController();

    function initController() {
      loadCurrentUser();
      loadAllCheckout();
    }

    function loadCurrentUser() {
      //vm.user = $rootScope.globals.currentUser;  
    }

    function loadAllCheckout() {
      $http.get(API_URL + 'payments/date2/' + $scope.accdate + '/' + vm.siteid)
        .then(
          function successCallback(response) {
            var allcheckouts = response.data;
            vm.checkouts = [];
            vm.cancellist = [];
            $scope.totalamount = 0;
            $scope.cardtotal = 0;
            $scope.numtotal = 0;
            $scope.cardnumtotal = 0;
            $scope.totalcancel = 0;
            $scope.cardcancel = 0;
            $scope.numcancel = 0;
            $scope.numcardcancel = 0;
            var amount, cnt, param2, points;
            for (var i = 0; i < allcheckouts.length; i++) {
              if (allcheckouts[i].cardtype.length == 0) {
                allcheckouts[i].cardtype = "__"
              }
              amount = Number(allcheckouts[i].amount);
              cnt = Number(allcheckouts[i].count);
              if (Number(allcheckouts[i].type) == 1) {                
                $scope.numtotal += cnt;
                $scope.totalamount += amount;
                if (allcheckouts[i].cardtype == 'PAYCO') {
                  param2 = Number(allcheckouts[i].param2);
                  points = amount - param2;
                  allcheckouts[i].points = points;
                  allcheckouts[i].amount = param2;
                  $scope.cardtotal += param2;
                  $scope.cardnumtotal += cnt;
                  $scope.totalamount -= points;                  
                }
                else if (allcheckouts[i].cardtype != '현금') {
                  $scope.cardtotal += amount;
                  $scope.cardnumtotal += cnt;
                }
                vm.checkouts.push(allcheckouts[i]);
              } else {
                vm.cancellist.push(allcheckouts[i]);
                $scope.totalcancel += amount;
                $scope.numcancel += cnt;
                if (allcheckouts[i].cardtype != '현금') {
                  $scope.cardcancel += amount;
                  $scope.numcardcancel += cnt;
                }
              }
            }
          },
          function errorCallback(response) {
            alert(response);
          }
        );
    }

    function viewDetail(cardtype) {
      var accdate = $filter('date')($scope.today, 'yyyyMMdd');
      $location.path('payments/' + accdate + '/' + cardtype);
    }

    vm.print = function () {
      var i = 0;
      var cashidx = -1;
      var paycoidx = -1;
      vm.recprtport = "0"; // 
      var tkstr = "PP" + vm.recprtport;
      tkstr += "S<" + Order.site.name + ">;"
      tkstr += "F%-28s%12s|[매입사별 금액]|날짜:" + $scope.accdate + ";S ";
      tkstr += ";F%-20s%8s%12s|매입사|건수|금액";
      tkstr += ";========================================";
      for (i = 0; i < vm.checkouts.length; i++) {
        if (vm.checkouts[i].cardtype.indexOf("PAYCO") >= 0) {
          paycoidx = i;
        } 
        if (vm.checkouts[i].cardtype.indexOf("현금") >= 0) {
          cashidx = i;
        }        
        else {
          tkstr += ";F%-20s%8s%12s|" + vm.checkouts[i].cardtype + "|" + $filter('number')(vm.checkouts[i].count) + "|" + $filter('number')(vm.checkouts[i].amount);
        }
      }
      tkstr += ";F%-20s%8s%12s|[카드합계]|" + $filter('number')($scope.cardnumtotal) + "|" + $filter('number')($scope.cardtotal);
      tkstr += ";----------------------------------------";
      if (cashidx >= 0) {
        for (i = 0; i < vm.checkouts.length; i++) {
          if (vm.checkouts[i].cardtype.indexOf("현금") >= 0) {
            tkstr += ";F%-20s%8s%12s|" + vm.checkouts[i].cardtype + "|" + $filter('number')(vm.checkouts[i].count) + "|" + $filter('number')(vm.checkouts[i].amount);
          }
        }        
      }      
      tkstr += ";F%-20s%8s%12s|합계|" + $filter('number')($scope.numtotal) + "|" + $filter('number')($scope.totalamount);
      if (paycoidx >= 0) {
        for (i = 0; i < vm.checkouts.length; i++) {
          if (vm.checkouts[i].cardtype.indexOf("PAYCO") >= 0) {
            tkstr += ";F%-20s%8s%12s|PAYCO 쿠폰+포인트|"  + $filter('number')(vm.checkouts[i].count) + "|" + $filter('number')(vm.checkouts[i].points);
          }
        }        
      }
      tkstr += ";----------------------------------------";

      if (vm.cancellist && vm.cancellist.length > 0) {
        i = 0;
        cashidx = -1;
        if (vm.cancellist.length > 0) {
          for (i = 0; i < vm.cancellist.length; i++) {
            if (vm.cancellist[i].cardtype.indexOf("현금") >= 0) {
              cashidx = i;
            } else {
              tkstr += ";F%-20s%8s%12s|" + vm.cancellist[i].cardtype + " 취소|" + $filter('number')(vm.cancellist[i].count) + "|" + $filter('number')(vm.cancellist[i].amount);
            }
          }
          tkstr += ";F%-20s%8s%12s|[카드취소합계]|" + $filter('number')($scope.numcardcancel) + "|" + $filter('number')($scope.cardcancel);
          tkstr += ";----------------------------------------";
          if (cashidx >= 0) {
            tkstr += ";F%-20s%8s%12s|" + vm.cancellist[cashidx].cardtype + " 취소|" + $filter('number')(vm.cancellist[cashidx].count) + "|" + $filter('number')(vm.cancellist[cashidx].amount);
          }
          tkstr += ";F%-20s%8s%12s|취소합계|" + $filter('number')($scope.numcancel) + "|" + $filter('number')($scope.totalcancel);
          tkstr += ";----------------------------------------";
        }
      }
      status = ocxcmd(tkstr);
    }

  }

  AccountMenuCtrl.$inject = ['$routeParams', '$scope', '$http', '$rootScope', '$filter', 'Order'];

  function AccountMenuCtrl($routeParams, $scope, $http, $rootScope, $filter, Order) {
    var vm = this;
    var API_URL = Order.settings.apiurl;

    vm.siteid = $routeParams.id;
    vm.site = Order.site;
    vm.checkouts = [];
    vm.comptotals = [];
    vm.viewdetail = viewDetail;
    vm.export = fnExcelReport;
    vm.monthly = false;
    vm.datestr = '';

    if ($routeParams.date == undefined) {
      $scope.today = new Date();
    } else {
      if ($routeParams.date.length == 8) {
        $scope.today = new Date($routeParams.date.slice(0, 4) + '-' + $routeParams.date.slice(4, 6) + '-' + $routeParams.date.slice(6));
      } else if ($routeParams.date.length == 6) {
        $scope.today = new Date($routeParams.date.slice(0, 4) + '-' + $routeParams.date.slice(4, 6) + '-01');
        vm.monthly = true;
      } else if ($routeParams.date.length == 7) {
        $scope.today = new Date($routeParams.date + '-01');
        vm.monthly = true;
      } else {
        $scope.today = new Date($routeParams.date);
      }
    }
    if (vm.monthly) {
      $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
    } else {
      $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
    }

    function ocxcmd(cmd) {
      if (window.external.Test) {
        return window.external.BNCmd(cmd);
      } else if (("ActiveXObject" in window) && cashif) {
        return cashif.BNCmd(cmd);
      }
      return -1;
    }

    $scope.prevDate = function () {
      if (vm.monthly) {
        $scope.today.setMonth($scope.today.getMonth() - 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
      } else {
        $scope.today.setDate($scope.today.getDate() - 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
      }

      loadAllCheckout();
    }

    $scope.nextDate = function () {
      if (vm.monthly) {
        $scope.today.setMonth($scope.today.getMonth() + 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM');
      } else {
        $scope.today.setDate($scope.today.getDate() + 1)
        $scope.accdate = $filter('date')($scope.today, 'yyyy-MM-dd');
      }
      loadAllCheckout();
    }

    initController();

    function initController() {
      loadCurrentUser();
      loadAllCheckout();
    }

    function loadCurrentUser() {
      //vm.user = $rootScope.globals.currentUser;
    }

    function makereport(data) {
      var i;
      var gid = 0;
      vm.comptotals = [];
      var grdtotal = {
        group: 'Total',
        cnt1: 0,
        cnt2: 0,
        cnt3: 0,
        cnt4: 0,
        sum1: 0,
        sum2: 0,
        sum3: 0,
        sum4: 0
      }
      var grptotal = {};
      for (i = 0; i < data.length; i++) {
        if (gid != data[i].gid) {
          grptotal = {
            gid: data[i].gid,
            group: data[i].group,
            cnt1: 0,
            cnt2: 0,
            cnt3: 0,
            cnt4: 0,
            sum1: 0,
            sum2: 0,
            sum3: 0,
            sum4: 0
          }
          vm.comptotals.push(grptotal);
          gid = data[i].gid;
        }
        if (data[i].name.trim() == '조식') {
          grptotal.cnt1 = Number(data[i].cnt);
          grptotal.sum1 = Number(data[i].total);
          grdtotal.cnt1 += grptotal.cnt1;
          grdtotal.sum1 += grptotal.sum1;
        } else if (data[i].name.trim() == '중식') {
          grptotal.cnt2 = Number(data[i].cnt);
          grptotal.sum2 = Number(data[i].total);
          grdtotal.cnt2 += grptotal.cnt2;
          grdtotal.sum2 += grptotal.sum2;
        } else if (data[i].name.trim() == '석식') {
          grptotal.cnt3 = Number(data[i].cnt);
          grptotal.sum3 = Number(data[i].total);
          grdtotal.cnt3 += grptotal.cnt3;
          grdtotal.sum3 += grptotal.sum3;
        } else {
          grptotal.cnt4 = Number(data[i].cnt);
          grptotal.sum4 = Number(data[i].total);
          grdtotal.cnt4 += grptotal.cnt4;
          grdtotal.sum4 += grptotal.sum4;
        }
      }
      vm.comptotals.push(grdtotal);
    }

    function loadAllCheckout() {
      var i;
      if (vm.monthly)
        vm.datestr = $filter('date')($scope.today, 'yyyy-MM');
      else
        vm.datestr = $filter('date')($scope.today, 'yyyy-MM-dd');
      $http.get(API_URL + 'orderItems/menu1/' + vm.datestr + '/' + vm.siteid)
        .then(
          function successCallback(response) {
            vm.checkouts = response.data;
            $scope.totalnum = 0;
            $scope.totalamount = 0;
            for (i = 0; i < vm.checkouts.length; i++) {
              $scope.totalnum += Number(vm.checkouts[i].num);
              $scope.totalamount += Number(vm.checkouts[i].price);
            }
            if (vm.site.active == 4) {
              $http.get(API_URL + 'orderItems/compdaily/' + vm.datestr + '/' + vm.siteid)
                .then(
                  function successCallback(response) {
                    makereport(response.data);
                  },
                  function errorCallback(response) {
                    alert(response);
                  }
                );
            }
          },
          function errorCallback(response) {
            alert(response);
          }
        );
    }

    function viewDetail(cardtype) {
      $location.path('payments/' + $scope.accdate + '/' + cardtype);
    }

    vm.print = function () {
      vm.recprtport = "0"; // 
      var tkstr = "PP" + vm.recprtport;
      tkstr += "S<" + Order.site.name + ">;"
      tkstr += "F%-25s%15s|[메뉴별 금액]|날짜:" + $scope.accdate + ";S ";
      tkstr += ";F%-25s%5s%10s|메뉴|수량|금액";
      tkstr += ";========================================";
      for (var i = 0; i < vm.checkouts.length; i++) {
        tkstr += ";F%-25s%5s%10s|" //+vm.checkouts[i].category+":"
          +
          vm.checkouts[i].name +
          "|" + $filter('number')(vm.checkouts[i].num) + "|" + $filter('number')(vm.checkouts[i].price);
      }
      tkstr += ";----------------------------------------";
      tkstr += ";F%-25s%5s%10s|합계|" + $filter('number')($scope.totalnum) + "|" + $filter('number')($scope.totalamount);
      tkstr += ";----------------------------------------";
      status = ocxcmd(tkstr);
    }

    function fnExcelReport() {
      var tab_text = "<table border='2px'><tr bgcolor='#87AFC6'>";
      var textRange;
      var j = 0;
      tab = document.getElementById('table1'); // id of table

      for (j = 0; j < tab.rows.length; j++) {
        tab_text = tab_text + tab.rows[j].innerHTML + "</tr>";
        //tab_text=tab_text+"</tr>";
      }

      tab_text = tab_text + "</table>";
      tab_text = tab_text.replace(/<A[^>]*>|<\/A>/g, ""); //remove if u want links in your table
      tab_text = tab_text.replace(/<img[^>]*>/gi, ""); // remove if u want images in your table
      tab_text = tab_text.replace(/<input[^>]*>|<\/input>/gi, ""); // reomves input params

      var ua = window.navigator.userAgent;
      var msie = ua.indexOf("MSIE ");

      if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) // If Internet Explorer
      {
        txtArea1.document.open("txt/html", "replace");
        txtArea1.document.write(tab_text);
        txtArea1.document.close();
        txtArea1.focus();
        sa = txtArea1.document.execCommand("SaveAs", true, vm.site.name + '_' + vm.datestr + ".xls");
      } else //other browser not tested on IE 11
        sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));

      return (sa);
    }
  }


})();