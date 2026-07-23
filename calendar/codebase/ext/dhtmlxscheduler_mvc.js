/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){!function(){var n,t={use_id:!1};function i(e){var n={};for(var i in e)0!==i.indexOf("_")&&(n[i]=e[i]);return t.use_id||delete n.id,n}function o(e){e._not_render=!1,e._render_wait&&e.render_view_data(),e._loading=!1,e.callEvent("onXLE",[])}function r(e){return t.use_id?e.id:e.cid}e.backbone=function(a,d){d&&(t=d),a.bind("change",function(t,i){var o=r(t),a=e._events[o]=t.toJSON();a.id=o,e._init_event(a),clearTimeout(n),n=setTimeout(function(){e.updateView()},1)}),a.bind("remove",function(n,t){var i=r(n);e._events[i]&&e.deleteEvent(i)});var c=[];function v(){c.length&&(e.parse(c,"json"),c=[])}a.bind("add",function(n,t){var i=r(n);if(!e._events[i]){var o=n.toJSON();o.id=i,e._init_event(o),c.push(o),1==c.length&&setTimeout(v,1)}}),a.bind("request",function(n){var t;n instanceof Backbone.Collection&&((t=e)._loading=!0,t._not_render=!0,t.callEvent("onXLS",[]))}),a.bind("sync",function(n){n instanceof Backbone.Collection&&o(e)}),a.bind("error",function(n){n instanceof Backbone.Collection&&o(e)}),e.attachEvent("onEventCreated",function(n){var t=new a.model(e.getEvent(n));return e._events[n]=t.toJSON(),e._events[n].id=n,!0}),e.attachEvent("onEventAdded",function(n){if(!a.get(n)){var t=i(e.getEvent(n)),o=new a.model(t),d=r(o);d!=n&&this.changeEventId(n,d),a.add(o),a.trigger("scheduler:add",o)}return!0}),e.attachEvent("onEventChanged",function(n){var t=a.get(n),o=i(e.getEvent(n));return t.set(o),a.trigger("scheduler:change",t),!0}),e.attachEvent("onEventDeleted",function(e){var n=a.get(e);return n&&(a.trigger("scheduler:remove",n),a.remove(e)),!0})}}()});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_mvc.js.map