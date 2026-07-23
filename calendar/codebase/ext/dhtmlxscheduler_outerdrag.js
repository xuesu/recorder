/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(t){t.attachEvent("onTemplatesReady",function(){var e,a=new dhtmlDragAndDropObject,n=a.stopDrag;function r(a,n,r,o){if(!t.checkEvent("onBeforeExternalDragIn")||t.callEvent("onBeforeExternalDragIn",[a,n,r,o,e])){var d=t.attachEvent("onEventCreated",function(n){t.callEvent("onExternalDragIn",[n,a,e])||(this._drag_mode=this._drag_id=null,this.deleteEvent(n))}),_=t.getActionData(e),l={start_date:new Date(_.date)};if(t.matrix&&t.matrix[t._mode]){var i=t.matrix[t._mode];l[i.y_property]=_.section;var c=t._locate_cell_timeline(e);l.start_date=i._trace_x[c.x],l.end_date=t.date.add(l.start_date,i.x_step,i.x_unit)}t._props&&t._props[t._mode]&&(l[t._props[t._mode].map_to]=_.section),t.addEventNow(l),t.detachEvent(d)}}a.stopDrag=function(t){return e=t||event,n.apply(this,arguments)},a.addDragLanding(t._els.dhx_cal_data[0],{_drag:function(t,e,a,n){r(t,e,a,n)},_dragIn:function(t,e){return t},_dragOut:function(t){return this}}),dhtmlx.DragControl&&dhtmlx.DragControl.addDrop(t._els.dhx_cal_data[0],{onDrop:function(t,a,n,o){var d=dhtmlx.DragControl.getMaster(t);e=o,r(t,d,a,o.target||o.srcElement)},onDragIn:function(t,e,a){return e}},!0)})});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_outerdrag.js.map