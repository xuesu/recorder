/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(t){t._get_url_nav=function(){for(var t={},e=(document.location.hash||"").replace("#","").split(","),n=0;n<e.length;n++){var a=e[n].split("=");2==a.length&&(t[a[0]]=a[1])}return t},t.attachEvent("onTemplatesReady",function(){var e=!0,n=t.date.str_to_date("%Y-%m-%d"),a=t.date.date_to_str("%Y-%m-%d"),r=t._get_url_nav().event||null;function u(e){r=e,t.getEvent(e)&&t.showEvent(e)}t.attachEvent("onAfterEventDisplay",function(t){return r=null,!0}),t.attachEvent("onBeforeViewChange",function(o,i,v,c){if(e){e=!1;var l=t._get_url_nav();if(l.event)try{if(t.getEvent(l.event))return setTimeout(function(){u(l.event)}),!1;var d=t.attachEvent("onXLE",function(){setTimeout(function(){u(l.event)}),t.detachEvent(d)})}catch(t){}if(l.date||l.mode){try{this.setCurrentView(l.date?n(l.date):null,l.mode||null)}catch(t){this.setCurrentView(l.date?n(l.date):null,v)}return!1}}var h=["date="+a(c||i),"mode="+(v||o)];r&&h.push("event="+r);var f="#"+h.join(",");return document.location.hash=f,!0})})});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_url.js.map