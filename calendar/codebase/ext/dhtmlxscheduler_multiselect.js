/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){e.form_blocks.multiselect={render:function(e){var t="dhx_multi_select_control dhx_multi_select_"+e.name;e.vertical&&(t+=" dhx_multi_select_control_vertical");for(var i="<div class='"+t+"' style='overflow: auto; height: "+e.height+"px; position: relative;' >",l=0;l<e.options.length;l++)i+="<label><input type='checkbox' value='"+e.options[l].key+"'/>"+e.options[l].label+"</label>",e.vertical&&(i+="<br/>");return i+="</div>"},set_value:function(t,i,l,n){for(var r=t.getElementsByTagName("input"),o=0;o<r.length;o++)r[o].checked=!1;function a(e){for(var i=t.getElementsByTagName("input"),l=0;l<i.length;l++)i[l].checked=!!e[i[l].value]}var c={};if(l[n.map_to]){var u=(l[n.map_to]+"").split(n.delimiter||e.config.section_delimiter||",");for(o=0;o<u.length;o++)c[u[o]]=!0;a(c)}else{if(e._new_event||!n.script_url)return;var s=document.createElement("div");s.className="dhx_loading",s.style.cssText="position: absolute; top: 40%; left: 40%;",t.appendChild(s);var v=[n.script_url,-1==n.script_url.indexOf("?")?"?":"&","dhx_crosslink_"+n.map_to+"="+l.id+"&uid="+e.uid()].join("");e.$ajax.get(v,function(i){var l=function(e){try{for(var t=JSON.parse(e.xmlDoc.responseText),i={},l=0;l<t.length;l++){var n=t[l];i[n.value||n.key||n.id]=!0}return i}catch(e){return null}}(i);l||(l=function(t,i){for(var l=e.$ajax.xpath("//data/item",t.xmlDoc),n={},r=0;r<l.length;r++)n[l[r].getAttribute(i.map_to)]=!0;return n}(i,n)),a(l),t.removeChild(s)})}},get_value:function(t,i,l){for(var n=[],r=t.getElementsByTagName("input"),o=0;o<r.length;o++)r[o].checked&&n.push(r[o].value);return n.join(l.delimiter||e.config.section_delimiter||",")},focus:function(e){}}});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_multiselect.js.map