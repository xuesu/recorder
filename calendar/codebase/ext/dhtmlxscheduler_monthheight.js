/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){e.attachEvent("onTemplatesReady",function(){e.xy.scroll_width=0;var t=e.render_view_data;e.render_view_data=function(){var i=this._els.dhx_cal_data[0];i.firstChild._h_fix=!0,t.apply(e,arguments);var h=parseInt(i.style.height);i.style.height="1px",i.style.height=i.scrollHeight+"px",this._obj.style.height=this._obj.clientHeight+i.scrollHeight-h+"px"};var i=e._reset_month_scale;e._reset_month_scale=function(t,h,l,n){var a={clientHeight:100};i.apply(e,[a,h,l,n]),t.innerHTML=a.innerHTML}})});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_monthheight.js.map