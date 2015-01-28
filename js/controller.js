//require JQuery
(function($){
    var user_info;
	
	var carMap = {};
	
	var SERVICE = {
	    1: "清洗外观",
		2: "清洗内饰",
		3: "打蜡",
		4: "划痕修复",
		5: "特殊需求"
	};
	
    //服务器主机与端口
     var Host = "http://devel.jarvys.me/";
    //POST请求接口
    function post(path, data, success, error){
	    $.ajax({
		    type: "POST",
		    url: Host + path,
		    data: data,
		    success: success,
            timeout: 5000,
		    dataType: 'json',
		    error: error
		});
	}
    
    function getUserInfo(callback){
        if(localStorage.accountName){ 
            post('getUserInfo', {accountName: localStorage.accountName}, function(res){
                user_info = res.userinfo;
                callback && callback(user_info, res);
            }, function(){
                callback && callback(user_info);
            });
        }else{
            user_info = null;
            callback && callback(user_info);
        }
    }
    
    function submitOrder(order, callback){
        post('submitOrder', order, function(res){
            callback && callback(res);
        }, function(res){
            callback && callback({
               status: -1
            });
        });
    }
    
    
    /*
     *把hash转换为json对象
     *@paras hash {String} hash 字符串， hash格式：module/action/query/pageState
     */
    function converHashToJson ( hash ) {
        if(!hash){
            throw new Error('Invalid hash value:' + hash);
        }
        var splitHash = hash.split('/');
        var paras = {};
        
        paras.module = splitHash[0];
        paras.action = splitHash[1];
        
        
        if(splitHash[2]){
            var query = splitHash[2].split('&');
            paras.query = {};
            
            query.forEach(function(para){
                var splitParas = para.split('=');
                paras.query[splitParas[0]] = splitParas[1];
            });
        }
        if(splitHash[3]){
            var pageState = splitHash[3].split('&');
            paras.pageState = {};
            
            pageState.forEach(function(para){
                var splitParas = para.split('=');
                paras.pageState[splitParas[0]] = splitParas[1];
            });
        }
        return paras;
    };
    
    var getCurHashParas = function(){
         var hash = window.location.hash.slice(1);
         var paras = converHashToJson(hash);
          return paras;
     };

    //控制器管理中心
    var controllerMgr = {
        ctrMap: {},
        curController: null,
        controllerInstance: {},
        preParas: null,
        dispatch: function(hash){
            var paras = converHashToJson(hash);
            var module = paras.module;
            var action =  paras.action;
            
            var ctrName = module + '/' + action;
            
            if(this.curController){
               this.preParas = this.curController.paras;
               try{
                   this.curController.trigger('screenout', paras);
               }catch(e){
               }
            }
            
            if(!this.controllerInstance[ctrName]){
               this.controllerInstance[ctrName] = new handler[ctrName](paras);
           }else{
               this.controllerInstance[ctrName].update();
           }
           this.curController = this.controllerInstance[ctrName];
           
           this.curController.trigger('screenin', paras);
        }
    };
    
    //controller基础方法
    var BaseController = {
        _init: function(){
            this.on('screenin', function(){
                this.$el.removeClass('p-hide');
                this.$el.addClass('p-show');
            }.bind(this));
            
            this.on('screenout', function(){
                this.$el.removeClass('p-show');
                this.$el.addClass('p-hide');
            });
        },
        update: function(){
            
        }
    };
    
    //首页controller
    function HomeController(paras){
        this.$el = $('#homepage');
        this.paras = paras;
        
        this.init = function(){
            this._init();
            this.bind();
			
			this.getOrderList();
			this.updateUserinfo();
        };
		
		this.getOrderList = function(){
		    if(localStorage.accountName){
				post('getOrderList', {
				    accountName: localStorage.accountName,
					type: 2
				}, function(res){
					if(res.status == 1){
						var list = res.list || [];
						
						post('getOrderList', {
				            accountName: localStorage.accountName,
					        type: 3
				        }, function(res){
						    var ls = res.list || [];
							var count = list.length + ls.length;
							
							if(count > 0){
                                $("#my-order-count").show();
                                $("#my-order-count").html(count);
                            }else{
                                $("#my-order-count").hide();
                            }
						})
					}else{
                        $("#my-order-count").hide();
                    }
				});
			}else{
                $("#my-order-count").hide();
            }
		};
		
		this.updateUserinfo = function(){
		    post('getUserInfo', {accountName: localStorage.accountName}, function(res){
				user_info = res.userinfo;
				$('#my-account-balance, .account-limit').html(user_info.balance);
			}, function(){
				
			});
		};
        
        this.bind = function(){
		    $("#homepage .content .item").on("click", this.onTapItem.bind(this));
        };
        
        this.onTapItem = function(e){
            var orginEv = e;
            var $target = orginEv.target.tagName.toLowerCase() == 'li' ? $(orginEv.target) : $(orginEv.target).parents('li');
            var data_s = $target.attr('data-s');
            
            if(data_s == "0"){
                location.hash = 'serviceInfo/serviceInfo';
            }else if(data_s == "1"){
                if(!localStorage.accountName){
                    location.hash = 'code/code/toPage=myorder';
                }else{
                    location.hash = 'myorder/myorder';
                }
            }else if(data_s == "2"){
                if(!localStorage.accountName){
                    location.hash = 'code/code/toPage=myaccount';
                }else{
                    location.hash = 'myaccount/myaccount';
                }
            }
        };
		
		this.update = function(){
		    this.getOrderList();
			this.updateUserinfo();
		};
        
        this.init();
    }
    $.extend(HomeController.prototype, Events);
    $.extend(HomeController.prototype, BaseController);
	
	
	
	var orderBase = {
	    service: "",
		partService: "",
		brand: "",
		model: "",
		color: "",
		address: "",
		serviceTime: "",
		account: ""
	};
	
	var servicePrice = {
	    1: 38,
		2: 56,
		3: 39,
		4: 32,
		5: 0
	};
	
	
	var totalPrice = 0;
	
	var order = $.extend({}, orderBase);
	
	var clearOrder = function(){
	    order = $.extend({}, orderBase);
	};
    
    
    //步骤1、服务基本信息
    function ServiceInfoController(paras){
        var tpl = $('#temp-service-info').html();
        this.$el = $(tpl);
        
        this.paras = paras;
        
        this.init = function(){
            this.$el.appendTo($('#page-container'));
            
            this._init();
            this.bind();
        };
        
        this.bind = function(){
		    var _this = this;
            $('.p-service-info .content .item').on('click', this.select.bind(this));
            $('#page-service-info .next').on('click', this.next.bind(this));
			
			$("#specify-requirement").on("click", function(e){
			    if(this == e.target || $(e.target).hasClass("close")){
				    $(this).hide();
				}else if(e.target.tagName.toLowerCase() == "button") {
				   $(this).hide();
				   $("#specify-requirement textarea").prop("autofocus", false);
				    _this.$el.find(".part input").val($("#specify-requirement textarea").val());
				}
			});
            
            this.$el.find(".part").on("click", function(e){
			    if(BR.versions.ios){
				    _this.$el.find(".part input").removeAttr("readonly").focus();
					_this.$el.find(".part input")[0].scrollIntoView();
				}else{
				    $("#specify-requirement").show();
					$("#specify-requirement textarea").val(_this.$el.find(".part input").val());
					setTimeout(function(){
						$("#specify-requirement textarea").click().prop("autofocus", true).focus();
					}, 100);
				}
            });
            
        };
        
        this.select = function(e){
            var orginEv = e;
            var $target = orginEv.target.tagName.toLowerCase() == 'li' ? $(orginEv.target) : $(orginEv.target).parents('li');
            
			if($target.attr('data-service') != 5){
			   $target.toggleClass('checked');
			}
        };
        
        this.next = function(){
            var $checkedItems = this.$el.find('.content .item.checked');
            var ss = [];
			
			var partService = this.$el.find('.part input').val();
            
            if($checkedItems.length === 0 && !partService){
                alert('请选择你需要的服务或者输入您的特殊服务');
                return false;
            }
            
            $checkedItems.each(function(){
                var $this = $(this);
				var serviceIndex = $this.attr("data-service");
				
                ss.push(serviceIndex);
				totalPrice += servicePrice[serviceIndex];
            });
			
			if( partService ){
			    ss.push(5);
			}
            
		    order.service = ss.join("|");
			order.totalPrice = totalPrice;
			order.partService = partService || "";
			
            location.hash = "carInfo/carInfo";
        };
        
        this.update = function(){
            if(controllerMgr.preParas && controllerMgr.preParas.module == 'home'){
                this.$el.find(".item.checked").removeClass('checked');
				this.$el.find('.part input').val("");
                var carinfoInstance = controllerMgr.controllerInstance["carInfo/carInfo"];
                if(carinfoInstance){
                    carinfoInstance.reset();
                }
            }
			totalPrice = 0;
        };
        this.init();
    }
    $.extend(ServiceInfoController.prototype, Events);
    $.extend(ServiceInfoController.prototype, BaseController);
    
	var carInfoDialog;
    //步骤2、汽车基本信息填写
    function CarInfoController(paras){
        var tpl = $('#temp-car-info').html();
        this.$el = $(tpl);
		this.paras = paras;
		
		carInfoDialog = new CarinfoDialog();
		var dateDialog = new DateDialog();
		
		
		var carInfo = {};
		var dateTime = {};
        
        this.init = function(){
            this.$el.appendTo($('#page-container'));
            
            this._init();
            this.bind();
            
            var me = this;
			
			carInfoDialog.on("ok", function(){
			    carInfo = this.getInput();
                
				var bm = carInfo.brand + ' ' + carInfo.model;
				
                me.$el.find("span.lc").text(carInfo.license ? carInfo.license + "," : carInfo.license);
                me.$el.find("span.br").text(bm && carInfo.color ? bm + ',' : bm );
                me.$el.find("span.cl").text(carInfo.color);
			});
			
			dateDialog.on("ok", function(){
			    dateTime = this.getInput();
				
				var d = new Date();
                d.setFullYear(dateTime.y);
                d.setMonth(dateTime.m - 1);
                d.setDate(dateTime.d);
                
				var week = Calender.getWeek(d.getDay());
                
                me.$el.find('.datetime').html(dateTime.dateLabel + ' ' + week + ' ' + dateTime.time);
			});
			
			this.on("screenout", function(){
			    carInfoDialog.hide();
				dateDialog.hide();
			});
			
			this.carScroller = new iScroll('carinfo-content', {
				vScrollbar: true,
		     	hScrollbar: false,
				onBeforeScrollStart: function(e){
				    var tag = e.target.tagName.toLowerCase();
				    if(tag != "input" && tag != "select" && tag != "button" && !$(e.target).hasClass("edit")){
					     e.preventDefault(); 
					}
				}
			}); 
			
			this.renderServiceList();
        };
        
        this.bind = function(){
            this.$el.delegate('.car-info .item', 'click', this.onTapItem);
			$('#page-car-info .submit').on('click', this.submit.bind(this));
            this.$el.find('[name="address"]').blur(function(e){
                var $parent = $(e.target).parent();
                //$parent.find('p').show();
                //$parent.find('input').hide();
            });
            
            var $addressInput = this.$el.find('.car-info .item.adr input');
            
            $addressInput.on("blur", function(){
                //this.$el.find('.car-info .item.adr .edit').show();
            }.bind(this));
            $(document.body).on("touchstart mousedown", function(e){
                if(e.target != $addressInput[0]){
                    var $addrItem = this.$el.find('.car-info .item.adr');
                    
                    this.$el.find('.car-info .item.adr .edit').show();
                    var $input = this.$el.find('.car-info .item.adr input');
                    var addr = $input.val();
                    
                    if(!addr){
                        $input.hide();
                        $addrItem.find('.placeholder, .edit').show();
                    }
                }
            }.bind(this));
        };
		
		this.submit = function(){
		    order.brand = carInfo.brand;
			order.model = carInfo.model;
			order.color = carInfo.color;
            order.license = carInfo.license;
            
            if(!order.brand || !order.model || !order.license || !order.color){
                alert("请输入汽车相关信息");
                return false;
            }
            
			order.address = $('input[name="address"]').val();
            
            if(!order.address){
                alert('请输入您的地址');
                return;
            }
            
            if(!dateTime.dateLabel || !dateTime.time){
                alert("请输入服务时间");
                return;
            }
			
			var d = new Date();
            d.setFullYear(dateTime.y);
            d.setMonth(dateTime.m - 1);
            d.setDate(dateTime.d);
			
			d.setHours(dateTime.h);
			d.setMinutes(dateTime.mu);
            
			order.serviceTime = d.getTime();
			
			getUserInfo(function(user, res){
                if(user){
                    order.account = localStorage.accountName;
					$('#c-loading').show()
                    submitOrder(order, function(res){
					    $('#c-loading').hide()
                        if(res.status == 1){
                            location.hash = "paypage/paypage/orderid=" + res.orderid;
                        }else{
                            alert('订单提交失败');
                        }
                    }, function(){
					    $('#c-loading').hide()
					});
                }else{
                    location.hash = "code/code/toPage=paypage";
                }
            });
		};
		
		this.onTapItem = function(e){
		    var data_item = $(this).attr('data-item');
			
			if(data_item == 0){
			    setTimeout(function(){
				    carInfoDialog.show();
				}, 200);
			}else if(data_item == 2){
			    setTimeout(function(){
				    dateDialog.show();
				}, 200);
			}else if(data_item == 1){
                $(this).find('.placeholder, .edit').hide();
                $(this).find('input').show().focus();
            }
		};
        
        this.reset = function(){
            var $lc = this.$el.find("span.lc");
            var $br = this.$el.find("span.br");
            var $cl = this.$el.find("span.cl");
            $lc.html("牌照号");
            $br.html("品牌型号");
            $cl.html("颜色");
            
            this.$el.find('.adr p, .edit').show();
            this.$el.find('.adr input').hide();
            this.$el.find('.datetime').html('请选择时间');
            
            var carInfo = {};
		    var dateTime = {};
            
            carInfoDialog.reset();
			dateDialog.reset();
        };
		
		this.renderServiceList = function(){
		    var serviceList = order.service.split("|");
			var tpl = '';
			var total = 0;
			
			serviceList.forEach(function(si){
			    total += servicePrice[si];
				
				if(si != 5){
			        tpl += '<li class="item"> <p>' + SERVICE[si] + '</p> <span class="hui"></span>' + 
				        '<span class="sec"> ' +servicePrice[si]+ '元</span> </li>';
			    }else{
				    tpl += '<li class="item"> <p>' + order.partService + '</p></li>';
				}
			});
			
			$('#service-total-des').html('共计' + serviceList.length + '个服务, ' + total + '元');
			$('#selected-service-list .list').html(tpl);
			
			setTimeout(function(){
			    this.carScroller.refresh();
			}.bind(this));
		};
		
		this.update = function(){
		    this.renderServiceList();
		}
        
        this.init();
    }
    $.extend(CarInfoController.prototype, Events);
    $.extend(CarInfoController.prototype, BaseController);
    
	
	//获取验证码界面
    function VerifyCodeController(paras){
	    var tpl = $('#account-register').html();
        this.$el = $(tpl);
        this.paras = paras;
		
		var cellPhone;
		var responseVerifyCode;
		
		this.init = function(){
            this.$el.appendTo($('#page-container'));
            
            this._init();
            this.bind();
        };
		this.bind = function(){
		    $('#page-account .vcode .yellow-btn').on('click', this.send.bind(this));
			$('#page-account .tools .ok').on('click', this.confirm.bind(this));
		};
		
		this.confirm = function(){
		    var code = this.$el.find('.vcode input').val();
			
			if(!cellPhone){
			    return false;
			}
			
			if(!code){
			    return false;
			}
			
		    var paras = {
			    accountName: cellPhone,
				code: code
			};
			
			$('#c-loading').show()
			
		    post('validVerifyCode', paras, function(res){
			    if(res.status === 1){
				    localStorage.accountName = cellPhone;
					order.account = cellPhone;
					
					
					var curHash = getCurHashParas();
					var query = curHash.query || {};
					var toPage = query.toPage;
					
					if(toPage == "myorder"){
						location.hash = "myorder/myorder";
						$('#c-loading').hide()
					}else if(toPage == "paypage"){
					    submitOrder(order, function(res){
							if(res.status == 1){
								location.hash = "paypage/paypage/orderid=" + res.orderid;
							}else{
								alert('订单提交失败');
							}
							$('#c-loading').hide()
						}, function(){
						    $('#c-loading').hide()
						});
					}else if(toPage == "myaccount"){
						location.hash = "myaccount/myaccount";
						$('#c-loading').hide()
					}
				}else{
                    alert("验证失败");
					$('#c-loading').hide()
                }
			}, function(){
			    $('#c-loading').hide()
			    alert("验证失败");
			});
		};
		
		this.send = function(){
		    var cell = $('#cellphone').val();
			if(!cell){
			    alert('cell phone empty');
			}else{ 
			    var $yellowBtn = $('#page-account .vcode .yellow-btn');
				var time = 60;
				
				
				var set = function(){
				    time--;
					$yellowBtn.html(time + "秒后重新获取");
					if(time != 0){
					    setTimeout(set, 1000);
					}else{
					    $yellowBtn.html("获取验证码");
						$yellowBtn.prop("disabled", false);
					}
				}
				set();
				$yellowBtn.prop("disabled", true);
				
			    cellPhone = cell;
			    post('reqVerifyCode', {cellPhone: cell}, function(res){
				    if(res.status == 1){
					    responseVerifyCode = res.code;
					}else{
					    responseVerifyCode = "";
					}
				}, function(res){
				    responseVerifyCode = "";
				});
			}
		    
		};
		
		this.init();
	};
	$.extend(VerifyCodeController.prototype, Events);
    $.extend(VerifyCodeController.prototype, BaseController);
	
	
	//支付页面
    function PayController(paras){
        var tpl = $('#tpl-pay-page').html();
        this.paras = paras;
        this.$el = $(tpl);
        this.init = function(){
		    this.$el.appendTo($('#page-container'));
			
		    this._init();
			this.updateUserinfo();
			
			this.bind();
        };  
		
		this.updateUserinfo = function(){
		    $('#pay-total-num').html(totalPrice);
		    post('getUserInfo', {accountName: localStorage.accountName}, function(res){
				user_info = res.userinfo;
				$('.account-limit').html(user_info.balance);
			}, function(){
				
			});
		};
		
		this.bind = function(){
		    $('#page-pay .item').on("click", this.select.bind(this));
			$('#page-pay .ok').on("click", this.ok.bind(this));
		};
		
		this.ok = function(){
		    var checkedItem = this.$el.find(".checked");
			var item = checkedItem.attr("item");
			
			if(item == 1){
			    var orderId = this.paras.query.orderid;
				
			    if(user_info.balance < totalPrice){
				    alert("您的余额不足");
				}else{
				    $('#c-loading').show()
				    post("payForOrder", {
					    accountName: localStorage.accountName,
						orderId: orderId,
						payNumber: totalPrice
					}, function(res){
					    if(res.status == 1){
						    alert("支付成功");
							location.hash = "#home/home";
						}else{
						    alert("支付失败");
						}
						$('#c-loading').hide();
					}, function(){
					    $('#c-loading').hide();
					    alert("支付失败");
					});
				}
			}else if(item == 2){
			    var orderId = this.paras.query.orderid;
				$('#c-loading').show();
			    post("setPayDelivery", {
				    orderId: orderId
				}, function(res){
				    $('#c-loading').hide();
				    if(res.status == 1){
					    alert("完成订单");
						location.hash = "#home/home";
					}
				}, function(){
				    $('#c-loading').hide();
				    alert("请求失败");
				});
			}
		};
		
		this.select = function(e){
            var orginEv = e;
            var $target = orginEv.target.tagName.toLowerCase() == 'li' ? $(orginEv.target) : $(orginEv.target).parents('li');
            
			$('#page-pay .item').removeClass("checked");
			$target.addClass('checked');
        };
		
		this.update = function(){
		    this.updateUserinfo();
		}
        
        this.init();
    }
    $.extend(PayController.prototype, Events);
    $.extend(PayController.prototype, BaseController);
    
    
    //我的订单controller
    function MyOrderController(paras){
        var tpl = $('#tpl-my-order').html();
        var itemTpl = $("#tpl-myorder-item").html();
        this.$el = $(tpl);
        this.paras = paras;
		
		this.type = 1;
        
        this.init = function(){
            this.$el.appendTo($('#page-container'));
            this._init();
			
            this.getMyOrder(1);
			
			this.bind();
			
			this.scroller =  new iScroll('myorder-sroller', {
				vScrollbar: true,
				hScrollbar: false
			}); 
        };
		
		this.bind = function(){
		    var _this = this;
		    this.$el.delegate(".myorder-tab li", "click", function(){
			    $(".myorder-tab li").removeClass("checked");
				$(this).addClass("checked");
			    var type = $(this).attr("data-type");
				_this.getMyOrder(type);
			});
		};
        
        this.getMyOrder = function( type ){
		
		    if(!localStorage.accountName){
			    location.hash = 'code/code';
				return;
			}
			
			this.type = type;
			
			var _this = this;
			
			$('#c-loading').show().css("top", 85);
            post('getOrderList', {
			    accountName: localStorage.accountName,
				type: type
			}, function(res){
			    if(_this.type != type){
				    return;
				}
			
			    $('#c-loading').hide().css("top", 45);
				
			    if(res.status == 1){
                    var tplData = [];
                    var list = res.list;
					
					$("#my-order-count").html(list.length);
                   
                    list.forEach(function(data){
                        var statusText = '';
                        if(data.status === 0){
                            statusText = "待分配";
                        }else if(data.status === 1){
                            statusText = "正在进行";
                        }else if(data.status === 2){
                            statusText = "已完成";
                        }
						
						var sn = '';
						
						var sp = data.service.split(",");
						var pri = 0;
						
						sp.forEach(function(k){
						    sn += '，' + SERVICE[k];
							pri += servicePrice[k];
						});
						sn = sn.substring(1);
						
						var serviceTime = data.serviceTime || '';
						
						if( serviceTime ){
						    var td = new Date( serviceTime );
							td.setTime(serviceTime);
							var yyyy = td.getFullYear();
							var mm = td.getMonth() + 1;
							var dd = td.getDate();
							
							var hh = td.getHours();
							var mut = td.getMinutes();
							
							serviceTime = yyyy + '年' + mm + '月' + dd + '日'+ ' ' + hh + ":" +mut;
						}
                        
                        tplData.push({
                            statusText: statusText,
                            status: data.status,
                            
                            brand: data.brand,
                            model: data.model || "",
                            license: data.license || '',
							serviceTime: serviceTime,
							totalPrice: pri,
                            
                            serviceName: sn,
                            orderNumber: data.id,
                            worker: data.worker? data.worker.name : '未分配',
                            worker_cellphone: data.worker? data.worker.cellPhone : '无'
                        });
                    });
                    
                    var tpl = _.template(itemTpl, {list: tplData});
                    $('#myorder-items').html(tpl + '<div style="height:10px;"></div>');
					
					if(tplData.length == 0){
					    $('#myorder-items').html('<div class="sec" style="text-align: center;line-height: 34px;">没有符合条件的订单</div>');
					}
					
					_this.scroller.refresh();
					_this.scroller.scrollTo(0, 0, 0);
                }
            }, function(res){
			    $('#c-loading').hide().css("top", 45);
				alert("网络错误");
                console.log("getOrderList error", res);
            });
        };
        this.init();
    }
    $.extend(MyOrderController.prototype, Events);
    $.extend(MyOrderController.prototype, BaseController);
    
    //我的账户
    
    function MyAccount(paras){
        this.paras = paras;
        var tpl = $('#tpl-myaccount').html();
        
		tpl = _.template(tpl, {accountName:localStorage.accountName});
        this.$el = $(tpl);
        this.init = function(){
            this.$el.appendTo($('#page-container'));
            this._init();
            this.bind();
			this.updateUserinfo();
        };  
        
        this.bind = function(){
            
            this.$el.find('.charge-btn').on("click", function(){
                var cardNumber = this.$el.find(".card-input").val();
            
                if(!cardNumber){
                    alert("请输入卡号");
                    return;
                }
                
                post('chargeForAccount', {accountName: localStorage.accountName, cardNumber: cardNumber}, function(res){
                    if(res.status == 1){
                        $('.account-limit').html(res.balance);
                    }else if(res.status == 3){
                        alert('卡已经使用过了');
                    }else{
                        alert("出错了");
                    }
                }, function(){
                    
                });
            }.bind(this));
        };
		
		this.updateUserinfo = function(){
		    post('getUserInfo', {accountName: localStorage.accountName}, function(res){
				user_info = res.userinfo;
				$('.account-limit').html(user_info.balance);
			}, function(){
				
			});
		};
		
		this.update = function(){
		    this.updateUserinfo();
		}
        
        this.init();
    }
    $.extend(MyAccount.prototype, Events);
    $.extend(MyAccount.prototype, BaseController);
    
    //controller配置中心
    var handler = {};
	handler['home/home'] = HomeController;
    handler['serviceInfo/serviceInfo'] = ServiceInfoController;
    handler['carInfo/carInfo'] = CarInfoController;
	handler['code/code'] = VerifyCodeController;
    handler['myorder/myorder'] = MyOrderController;
    handler['myaccount/myaccount'] = MyAccount;
	handler['paypage/paypage'] = PayController;
    

    function route(){
        var hash = location.hash;
		if(hash){
		    controllerMgr.dispatch(hash.slice(1));
		}else{
		    location.hash = "home/home";
		}
	}
	
	function onDeviceReady(){
	    FastClick.attach(document.body);
	    window.onhashchange = route;
		
		if(navigator.userAgent.match(/iP[ha][od].*OS 7/)) {
	        $("#page-container").css({
		        postion: "absolute",
		        left: 0,
		        top: 20,
		        width: "100%",
		        height: window.innerHeight - 20
		    });
        }
		
		route();
		
		
		$(document.body).delegate("button", "touchstart", function(){
		    $(this).addClass("active");
		});
		$(document.body).delegate("button", "touchend", function(){
		    $(this).removeClass("active");
		});
		
		post("getCarList", {}, function(carRes){
		    var htmlTemp = "";
			var defaultModel = "";
			
			for(var i in carRes){
				var car = carRes[i];
				if(!defaultModel){
				    defaultModel = car;
				}
				var mStr = JSON.stringify(car.models);
				htmlTemp +=  "<option data=" + encodeURIComponent(mStr) + ">" + car.brand + "</option>"
			}
			$("#brand").html(htmlTemp);
			
			var renderModels = function( ms ){
			    var modelTemp = "";
			    ms.forEach(function(m){
				    modelTemp +=  "<option>" + m + "</option>"
			    });
				$("#model").html(modelTemp);
				return modelTemp;
			}
			renderModels(defaultModel.models);
			
			$("#brand").on("change", function( ){
			    var $checked = $('#brand :checked');
				var listStr = $checked.attr("data");
				var mlist = JSON.parse(decodeURIComponent(listStr));
				renderModels(mlist);
			});
		}, function(){} );
	}
    
    $(onDeviceReady);
    document.addEventListener('deviceready', onDeviceReady, false);
	
    var $alertDialog = $("#alert-dialog");
    
	function backHandler(){
	    var curHash = getCurHashParas();
        var module = curHash.module;
        
        if($alertDialog.is(':visible')){
            $alertDialog.hide();
            return;
        }
        
        if(module == "myaccount" || module == "myorder" || module == "code" || module == "paypage"){
            location.hash = "home/home";
        }else if(module == 'home'){
            navigator.app.exitApp();
        }else if(module == "carInfo"){
		    var $cat = $("#car-category");
			if($cat.is(":visible")){
			    carInfoDialog && carInfoDialog.hide();
			}else if($("#date-dialog").css("left") == "0px"){
			    $("#date-dialog").css("left", "-200%");
			}else{
			    history.back();
			}
		}else if($("#specify-requirement").is(":visible")){
		    $("#specify-requirement").hide();
		}else{
            history.back();
        }
	}
	
    document.addEventListener("backbutton", backHandler, false);
	$(document.body).delegate(".back", "click", backHandler);
})(jQuery);
