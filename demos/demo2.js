$(function () {
    $('body').css({overflow: 'hidden'});

    //获取直播信息
    var uid, token, livebym3u8, livebyreview, liveName;
    getLiveInfo().then(function (res) {
        liveName = res.eventname;
        var topImg = res.picture;
        var startTime = parseInt(res.starttime);
        var endTime = parseInt(res.endtime);
        var price = res.price;
        var liveDesc = res.text;
        if (res.host) {
            var host = res.host[0];
        }
        livebym3u8 = res.livebym3u8;
        livebyreview = res.livebyreview;
        var promotion = res.promotion;

        //修改头图
        if (topImg) $('.top-img img').attr('src', topImg);

        //修改开始时间
        if (startTime) $('.startTime').text(format(startTime));

        //修改直播状态
        var now = Math.round(new Date().getTime() / 1000);
        if (now < startTime) { //直播未开始（现在时间 < 开始时间）
            $('.live-state').text('直播未开始')
            // 24小时换成秒
            var day = 24 * 3600;
            // 还有多长时间开始
            var differ = startTime - now;

            if (differ < day) { //24小时内
                $('.live-state').text(Math.floor((day - differ) / 3600) + '小时内')
            } else { //大于24小时
                $('.live-state').text(Math.floor((differ - day) / day) + '天后')
            }
        } else if (now > startTime && now < endTime) {   //直播已开始（开始时间 < 现在时间 < 结束时间）
            $('.live-state').text('进行中')
        } else if (now > endTime) { // 直播已结束（ 现在时间 > 结束时间 ）
            $('.live-state').text('已结束')
        }

        //修改嘉宾信息
        if (host) {
            $('.user-touxiang img').attr('src', host.avatar);
            $('.user-info .user-name').text(host.realname);
            $('.user-info .user-desc').text(host.jobtitle);
        }

        //修改直播标题、简介
        if (liveName) document.title = liveName;
        $('.live-desc-title').text(liveName);
        if (liveDesc) $('.live-desc').html(liveDesc);

        $('#price').text('￥' + fenToYuan(price));
        if (now < startTime) { //直播未开始（现在时间 < 开始时间）
            if (price) $('#status').text('预约报名');
        } else if (now > endTime || (now > startTime && now < endTime)) { // 直播已结束（ 现在时间 > 结束时间 ）
            if (price) $('#status').text('付费观看');
        }
        if (promotion && promotion !== 0 && promotion < price) {
            $('#promotion').text('￥' + fenToYuan(promotion)).show();
            $('#price').addClass('youhui');
        }

        if (env.weiXin) {
            if (code === null && localStorage.getItem('newuser') != 1) {
                var url = "http://live.bbwc.cn/public/audiojs/demos/test5.html?eventid=" + eventid + "&scope=snsapi_base";
                $.getJSON('http://live.bbwc.cn/pay/getUserInfo', {
                    eventid: eventid,
                    scope: "snsapi_base",
                    redirect_uri: url
                }, function (res) {
                    window.location.href = res.url
                })
            } else if (code !== null && localStorage.getItem('newuser') != 1) {
                $.getJSON('http://live.bbwc.cn/pay/getUserInfo', {
                    eventid: eventid,
                    scope: "snsapi_base",
                    code: code
                }, function (res) {
                    uid = res.uid;
                    if (!uid) {
                        localStorage.setItem('newuser', 1);
                        var url = "http://live.bbwc.cn/public/audiojs/demos/test5.html?eventid=" + eventid + "&scope=snsapi_userinfo";
                        $.getJSON('http://live.bbwc.cn/pay/getUserInfo', {
                            eventid: eventid,
                            scope: "snsapi_userinfo",
                            redirect_uri: url
                        }, function (res) {
                            window.location.href = res.url
                        })
                    } else {
                        editStatus(res)
                    }
                })
            } else if (localStorage.getItem('newuser') == 1) {
                console.log('104', window.location.href);
                $.getJSON('http://live.bbwc.cn/pay/getUserInfo', {
                    eventid: eventid,
                    scope: "snsapi_userinfo",
                    code: code
                }, function (res) {
                    localStorage.setItem('newuser', 0);
                    uid = res.uid;
                    editStatus(res)
                })
            }
        } else {
            if (env.phoneApp) {
                $('#play').on('click', function () {
                    // weridge获取uid
                    webridge.jsToNative('queryLoginStatus', '', function (res) {
                        if (!res.loginStatus) {
                            webridge.jsToNative('login', '', function (res) {
                                uid = res.user.userId;
                                // 获取权限
                                getAuth(eventid, uid).then(function (res) {
                                    editStatus(res);
                                })
                            })
                        } else {
                            console.log(res.user.userId)
                            uid = res.user.userId;
                            // 获取权限
                            getAuth(eventid, uid).then(function (res) {
                                editStatus(res);
                            })
                        }
                    });
                }).removeAttr('disabled')
                $('.loading').hide();
                $('body').css({overflow: 'auto'});
            } else {
                uid = getQueryString('uid');
                if (!uid) uid = localStorage.getItem('szuid');
                if (!uid) {
                    // window.location.href = 'http://live.bbwc.cn/public/user/?redirect_uri=http://live.bbwc.cn/public/audiojs/demos/test5.html?eventid=' + eventid;
                    $('#play').on('click', function () {
                        window.location.href = 'http://live.bbwc.cn/public/course/users/login.html?redirect_uri=' + encodeURI(window.location.href);
                    }).removeAttr('disabled');
                    $('.loading').hide();
                    $('body').css({overflow: 'auto'});
                } else {
                    getAuth(eventid, uid).then(function (res) {
                        editStatus(res);
                    })
                }
            }
        }

        function editStatus(res) {
            console.log(res)
            if (price !== 0) {
                if (res.permission == 1) { //已支付
		    $(".live-status").hide();
                } else { //未支付
                    if (now < startTime) { //直播未开始（现在时间 < 开始时间）
                        if (price) $('#status').text('预约报名');
                        $('#price').text('￥' + fenToYuan(price))
                    } else if (now > endTime || (now > startTime && now < endTime)) { // 直播已结束（ 现在时间 > 结束时间 ）
                        if (price) $('#status').text('付费观看');
                        $('#price').text('￥' + fenToYuan(price))
                    }
                    if (uid) {
                        $('#play').off('click').on('click', function () {
                            if (env.weiXin) {
                                window.location.href = payPath + '?uid=' + uid + '&eventid=' + eventid;
                            } else if (env.phoneApp) {
                                webridge.jsToNative('queryAppInfo','',function(res){
                                    console.log(res.appVersion);
                                    // return;
                                    var currAppVersion=toNum(res.appVersion),lastVersion=toNum('4.1.2');
                                    if(currAppVersion >= lastVersion){
                                        var params = {
                                            goodId: 'event_' + eventid,
                                            goodName: liveName,
                                            price: price,
                                            needTel: '0'
                                        };
                                        webridge.jsToNative('slatePay', params, function (res) {
                                            var bill_no = res.data.tradeNum;
                                            console.log('订单号',bill_no);
                                            console.log('eventid',eventid);
                                            console.log('uid',uid);

                                            getAuth(eventid, uid, bill_no).then(function (res) {

                                                console.log('支付完成后回调',res)
                                                editStatus(res);
                                            });
                                        })
                                    }else{
                                        console.log('版本太低，请更新版本')
                                        window.location.href = 'slate://web/http://app.bbwc.cn'
                                    }
                                })
                            } else if (!env.weiXin && env.mobile) { //移动网页
                                window.location.href = 'http://live.bbwc.cn/pay/wappay?uid=' + uid + '&eventid=' + eventid;
                            } else if (!env.weiXin && !env.mobile) { //pc网页
                                window.location.href = 'http://live.bbwc.cn/pay/webpay?uid=' + uid + '&eventid=' + eventid;
                            }
                        })
                    }else{
                        $('#play').off('click').on('click', function () {
                            console.log('未授权')
                        })
                    }
                }
            } else {
		$(".live-status").hide();
            }
            $('.loading').hide();
            $('body').css({overflow: 'auto'});
        }
    });
});
