/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){e.expand=function(){if(e.callEvent("onBeforeExpand",[])){var o=e._obj;do{o._position=o.style.position||"",o.style.position="static"}while((o=o.parentNode)&&o.style);(o=e._obj).style.position="absolute",o._width=o.style.width,o._height=o.style.height,o.style.width=o.style.height="100%",o.style.top=o.style.left="0px";var t=document.body;t.scrollTop=0,(t=t.parentNode)&&(t.scrollTop=0),document.body._overflow=document.body.style.overflow||"",document.body.style.overflow="hidden",e._maximize(),e.callEvent("onExpand",[])}},e.collapse=function(){if(e.callEvent("onBeforeCollapse",[])){var o=e._obj;do{o.style.position=o._position}while((o=o.parentNode)&&o.style);(o=e._obj).style.width=o._width,o.style.height=o._height,document.body.style.overflow=document.body._overflow,e._maximize(),e.callEvent("onCollapse",[])}},e.attachEvent("onTemplatesReady",function(){var o=document.createElement("div");o.className="dhx_expand_icon",e.toggleIcon=o,e._obj.appendChild(o),o.onclick=function(){e.expanded?e.collapse():e.expand()}}),e._maximize=function(){this.expanded=!this.expanded,this.toggleIcon.style.backgroundPosition="0 "+(this.expanded?"0":"18")+"px";for(var o=["left","top"],t=0;t<o.length;t++){e.xy["margin_"+o[t]];var n=e["_prev_margin_"+o[t]];e.xy["margin_"+o[t]]?(e["_prev_margin_"+o[t]]=e.xy["margin_"+o[t]],e.xy["margin_"+o[t]]=0):n&&(e.xy["margin_"+o[t]]=e["_prev_margin_"+o[t]],delete e["_prev_margin_"+o[t]])}e.setCurrentView()}});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_expand.js.map