(function($){
    window.BR ={

		versions:function(){
		var u = navigator.userAgent, app = navigator.appVersion;

		return {
		trident: u.indexOf('Trident') > -1, //IE内核
		presto: u.indexOf('Presto') > -1, //opera内核
		webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
		gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
		mobile: !!u.match(/AppleWebKit.*Mobile.*/)||!!u.match(/AppleWebKit/), //是否为移动终端
		ios: !!u.match(/(i[^;]+\;(U;)? CPU.+Mac OS X)/), //ios终端
		android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
		iPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者QQHD浏览器
		iPad: u.indexOf('iPad') > -1, //是否iPad
		webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部
		};
		}(),
		language:(navigator.browserLanguage || navigator.language).toLowerCase()
	};	
    var $dialog = $("#alert-dialog");
    
    $dialog.on("click", function(e){
        if($dialog[0] == e.target){
            $dialog.hide();
        }
    });
    
    window.alert = function(content){
	    $dialog.show();
		$dialog.find(".text").text(content);
		$dialog.find(".main-btn button").off("click").on("click", function(){
		    $dialog.hide();
		});
	}
    
    function CarinfoDialog(){
        this.$el = $('#car-category');
        
        this.reset = function(){
            this.$el.find('.license input').val('');
			this.$el.find('.color input').val('');
			//$('#brand').val('');
			//$('#model').val('');
        };
        
        this.show = function(){
            this.$el.show();
        };
        
        this.hide = function(){
            this.$el.hide();
			$("#color-selector").css("left", "-200%");
        };
		
		this.bind = function(){
		    var me = this;
			
		    this.$el.on('click', function(e){
				if(e.target == me.$el[0]){
				    me.$el.hide();
				}
			});
            
            this.$el.delegate(".close", "click", function(e){
                me.hide();
            });
			
			$("#car-category .ok").on('click', function(e){
			    me.$el.hide();
				this.trigger('ok');
			}.bind(this));
            
            this.$el.find('.color input').on("click", function(e){
                $("#color-selector").css("left", 0);
            });
            
            $("#color-selector li").on("click", function(){
                var text = $(this).find('span').html();
                me.$el.find('.color input').val(text);
                $("#color-selector").css("left", "-200%");
            });
		};
		
		this.getInput = function(){
		    var license = this.$el.find('.license input').val();
			var color = this.$el.find('.color input').val();
			var brand = $('#brand').val();
			var model = $('#model').val();
            
            return {
			    license: license,
				brand: brand,
				model: model,
				color: color
			}
		};
		this.bind();
    }
    $.extend(CarinfoDialog.prototype, Events);
	
	
	
	function DateDialog(){
        this.$el = $('#date-dialog');
        var dateScroller;
		var timeScroller;
		var secondScroller;
		
		var _this = this;
		
		this.$el.delegate(".close", "click", function(e){
            this.hide();
        }.bind(this));
        
        this.reset = function(){
            dateScroller && dateScroller.scrollTo(0, 0, 0);
            timeScroller && timeScroller.scrollTo(0, 0, 0);
            secondScroller && secondScroller.scrollTo(0, 0, 0);
        };
		
        this.show = function(){
		    if(!dateScroller){
			    this.fillData();
			    dateScroller = new iScroll('date-con', {
				    vScrollbar: false,
					hScrollbar: false,
					onBeforeScrollStart: this.scrollStart,
					onScrollEnd: this.onscrollEnd
				}); 
			}
			
			if(!timeScroller){
			    timeScroller = new iScroll('time-con', {
				    vScrollbar: false,
					hScrollbar: false,
					onBeforeScrollStart: this.scrollStart,
					onScrollEnd: this.onscrollEnd
				});  
			}
			
			if(!secondScroller){
			    secondScroller = new iScroll('second-con', {
				    vScrollbar: false,
					hScrollbar: false,
					onBeforeScrollStart: this.scrollStart,
					onScrollEnd: this.onscrollEnd
				});  
			}
			
            this.$el.css("left", 0);
        };
		
		this.scrollStart = function(e){
		    e.preventDefault();
		    this.options.onScrollEnd = _this.onscrollEnd ;
		};
		
		this.onscrollEnd = function(){
		    console.log('y1=', this.y);
		    var y = Math.abs(this.y);
			var m = Math.floor(y / 40);
			var r = y % 40;
			
			
			y = r > 20 ? m * 40 + 40 : y - r;
			this.options.onScrollEnd = null;
			
			console.log('y2=', y);
			this.scrollTo(0, -y, 0) 
		};
		
		
		this.fillData = function(){
		    var now = new Date();
			var fullYear = now.getFullYear();
			var month = now.getMonth() + 1;
			var dateDay = now.getDate();
			
			var curRemainDay = Calender.getCurrentMonthDays(fullYear, month) - dateDay + 1;
			var dateList = [];
			
			if(dateDay == 1){
			    var newDay = dateDay;
				var newMonth = month;
				var newYear = fullYear;
				
			    if(month == 1){
				    newMonth = 12;
					newYear = fullYear - 1;
				}else{
				    newMonth = month - 1;
				}
				newDay = Calender.getCurrentMonthDays(newYear, newMonth);
			    dateList.push({
				    year: newYear,
					month: newMonth,
					day: newDay,
					pre: true
				});
			}else{
			    dateList.push({
				    year: fullYear,
					month: month,
					day: dateDay - 1,
					pre: true
				});
			}
			
			for(var i=0; i < curRemainDay; i++){
			    dateList.push({
				    year: fullYear,
					month: month,
					day: dateDay + i
				});
			}
			
			if(dateList.length < 30){
			    var newYear = fullYear;
			    var newMonth = month + 1;
				
			    if(month == 12){
				    newYear = fullYear + 1;
					newMonth = 1;
				}
				
				var days = Calender.getCurrentMonthDays(newYear, newMonth);
			    for(var i=1; i <= days; i++){
					dateList.push({
						year: newYear,
						month: newMonth,
						day: i
					});
				}
			}
			
			var dateTemp = "";
			dateList.forEach( function( item ){
				var mm = item.month >= 10 ? item.month: '0' + item.month;
				var dd = item.day >= 10 ? item.day: '0' + item.day;
				var dmy = item.year + '-' + mm + '-' + dd;
				
				var lbl = item.year+ "年" + mm + "月" + dd + "日";
				
				if(item.pre){
				    lbl = "昨天";
				}
                
                var o = {
                    y: parseInt(item.year),
                    m: parseInt(item.month),
                    d: parseInt(item.day)
                };
                
                var ojson = JSON.stringify(o);
                ojson = encodeURIComponent(ojson);
				
				dateTemp += '<li data-ymd="' + dmy+ '"  data-json="' + ojson + '">' + lbl + '</li>';
			});
			dateTemp += "<li>&nbsp;</li>";
			$('#date-con .list ul').html(dateTemp);
				
			var timeTemp = '<li data-time="00">00时</li>';
			for(var i=1; i <= 24; i++){
			    var time = i >= 10 ? i : "0" + i;
				
			    if(i == 24){
				    time = '00';
				}
			    timeTemp += "<li data-time='" + time + "'>" + time + "时" + "</li>";
			}
			
			timeTemp += '<li data-time="00">&nbsp;</li>';
			$('#time-con .list ul').html(timeTemp);
			
			
			var secondTemp = '<li data-second="00">00分</li>';
			for(var i=15; i <= 60; i=i+15){
			    var second = i >= 10 ? i : "0" + i;
				
				if(i == 60){
				    second = "00";
				}
				
			    secondTemp += "<li data-second='" + second + "'>" + second + "分" + "</li>";
			}
			secondTemp += "<li>&nbsp;</li>";
			$('#second-con .list ul').html(secondTemp);
		};
        
        this.hide = function(){
		     this.$el.css("left", "-200%");
        };
		
		this.bind = function(){
		    var me = this;
		    this.$el.on('click', function(e){
			    var orginEv = e;
				if(orginEv.target == me.$el[0]){
				    me.hide();
				}
			});
			
			$("#date-dialog .ok").on('click', function(e){
			    me.hide();
				this.trigger('ok');
			}.bind(this));
		};
		
		this.getInput = function(){
			
			var ymdIndex = Math.round(Math.abs(dateScroller.y)/40) + 1;
			var timeIndex = Math.round(Math.abs(timeScroller.y)/40) + 1;
			var secondIndex = Math.round(Math.abs(secondScroller.y)/40) + 1;
			
			var $ymd = $(dateScroller.wrapper).find("ul li:eq('" + ymdIndex + "')");
			var ymdJson = $ymd.attr('data-json');
			
			var $time= $(timeScroller.wrapper).find("ul li:eq('" + timeIndex + "')");
			var timeValue = $time.attr('data-time');
			
			var $second = $(secondScroller.wrapper).find("ul li:eq('" + secondIndex + "')");
			var sValue = $second.attr('data-second');
            
            
            ymdJson = decodeURIComponent(ymdJson);
            ymdJson = JSON.parse(ymdJson);
			
			return {
                dateLabel: $ymd.attr("data-ymd"),
                y: ymdJson.y,
                m: ymdJson.m,
                d: ymdJson.d,
                h: parseInt(timeValue),
				mu: parseInt(sValue),
                time: timeValue + ':' + sValue
			}
		};
		this.bind();
    }
    $.extend(DateDialog.prototype, Events);
	window.CarinfoDialog = CarinfoDialog;
	window.DateDialog = DateDialog;
})(jQuery);