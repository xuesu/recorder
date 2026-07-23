/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){!function(){var t,n;function i(n){e._get_section_view()&&n&&(t=e.getEvent(n)[e._get_section_property()])}e.config.collision_limit=1,e.attachEvent("onBeforeDrag",function(e){return i(e),!0}),e.attachEvent("onBeforeLightbox",function(t){var o=e.getEvent(t);return n=[o.start_date,o.end_date],i(t),!0}),e.attachEvent("onEventChanged",function(t){if(!t||!e.getEvent(t))return!0;var i=e.getEvent(t);if(!e.checkCollision(i)){if(!n)return!1;i.start_date=n[0],i.end_date=n[1],i._timed=this.isOneDayEvent(i)}return!0}),e.attachEvent("onBeforeEventChanged",function(t,n,i){return e.checkCollision(t)}),e.attachEvent("onEventAdded",function(t,n){e.checkCollision(n)||e.deleteEvent(t)}),e.attachEvent("onEventSave",function(t,n,i){if((n=e._lame_clone(n)).id=t,!n.start_date||!n.end_date){var o=e.getEvent(t);n.start_date=new Date(o.start_date),n.end_date=new Date(o.end_date)}return n.rec_type&&e._roll_back_dates(n),e.checkCollision(n)}),e._check_sections_collision=function(t,n){var i=e._get_section_property();return t[i]==n[i]&&t.id!=n.id},e.checkCollision=function(n){var i=[],o=e.config.collision_limit;if(n.rec_type)for(var a=e.getRecDates(n),r=0;r<a.length;r++)for(var c=e.getEvents(a[r].start_date,a[r].end_date),_=0;_<c.length;_++)(c[_].event_pid||c[_].id)!=n.id&&i.push(c[_]);else{i=e.getEvents(n.start_date,n.end_date);for(var d=0;d<i.length;d++){var l=i[d];if(l.id==n.id||l.event_length&&[l.event_pid,l.event_length].join("#")==n.id){i.splice(d,1);break}}}var v=e._get_section_view(),s=e._get_section_property(),f=!0;if(v){var g=0;for(d=0;d<i.length;d++)i[d].id!=n.id&&this._check_sections_collision(i[d],n)&&g++;g>=o&&(f=!1)}else i.length>=o&&(f=!1);if(!f){var h=!e.callEvent("onEventCollision",[n,i]);return h||(n[s]=t||n[s]),h}return f}}()});
//# sourceMappingURL=sources/ext/dhtmlxscheduler_collision.js.map