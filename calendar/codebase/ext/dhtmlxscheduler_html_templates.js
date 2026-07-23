/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){e.attachEvent("onTemplatesReady",function(){for(var n=document.body.getElementsByTagName("DIV"),t=0;t<n.length;t++){var a=n[t].className||"";if(2==(a=a.split(":")).length&&"template"==a[0]){var l='return "'+(n[t].innerHTML||"").replace(/\"/g,'\\"').replace(/[\n\r]+/g,"")+'";';l=unescape(l).replace(/\{event\.([a-z]+)\}/g,function(e,n){return'"+ev.'+n+'+"'}),e.templates[a[1]]=Function("start","end","ev",l),n[t].style.display="none"}}})});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_html_templates.js.map