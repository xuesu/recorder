/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){!function(){var t=!0;e.attachEvent("onBeforeViewChange",function(n,i,o,a){if(t&&e._get_url_nav){var r=e._get_url_nav();(r.date||r.mode||r.event)&&(t=!1)}var u=(e._obj.id||"scheduler")+"_settings";if(t){t=!1;var s=function(e){var t=e+"=";if(document.cookie.length>0){var n=document.cookie.indexOf(t);if(-1!=n){n+=t.length;var i=document.cookie.indexOf(";",n);return-1==i&&(i=document.cookie.length),document.cookie.substring(n,i)}}return""}(u);if(s){e._min_date||(e._min_date=a),(s=unescape(s).split("@"))[0]=this._helpers.parseDate(s[0]);var c=this.isViewExists(s[1])?s[1]:o,d=isNaN(+s[0])?a:s[0];return window.setTimeout(function(){e.setCurrentView(d,c)},1),!1}}var f,_,l=escape(this._helpers.formatDate(a||i)+"@"+(o||n));return _=u+"="+l+((f="expires=Sun, 31 Jan 9999 22:00:00 GMT")?"; "+f:""),document.cookie=_,!0});var n=e._load;e._load=function(){var t=arguments;if(e._date)n.apply(this,t);else{var i=this;window.setTimeout(function(){n.apply(i,t)},1)}}}()});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_cookie.js.map