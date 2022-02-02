

/*

@license
dhtmlxScheduler v.5.3.9 Standard

To use dhtmlxScheduler in non-GPL projects (and get Pro version of the product), please obtain Commercial/Enterprise or Ultimate license on our site https://dhtmlx.com/docs/products/dhtmlxScheduler/#licensing or contact us at sales@dhtmlx.com

(c) XB Software Ltd.

Altered by: xuesu, only for personal use

*/
var scheduler = {form_blocks: new Object()};
scheduler._get_private_properties = function(event){
	var fields = {};
	for(var i in event){
		if(i.indexOf("_") === 0){
			fields[i] = true;
		}
	}
	return fields;
};
scheduler._clear_temporary_properties = function(clean, flagged_event){
	var initial = this._get_private_properties(clean);
	var current_state = this._get_private_properties(flagged_event);
	for(var i in current_state){
		if(!initial[i]){
			delete flagged_event[i];
		}
	}
};
scheduler._currentDate = function(){
	if(scheduler.config.now_date){
		return new Date(scheduler.config.now_date);
	}
	return new Date();
};

scheduler._reset_ignores = function(){
	this._ignores={};
	this._ignores_detected = 0;
};

scheduler._process_ignores = function(sd, n, mode, step, preserve){
	this._reset_ignores();
	var ignore = scheduler["ignore_"+this._mode];
	if (ignore){
		var ign_date = new Date(sd);
		for (var i=0; i<n; i++){
			if (ignore(ign_date)){
				this._ignores_detected += 1;
				this._ignores[i] = true;
				if (preserve)
					n++;
			}
			ign_date = scheduler.date.add(ign_date, step, mode);
			if(scheduler.date[mode + '_start'])
				ign_date = scheduler.date[mode + '_start'](ign_date);
		}
	}
};

scheduler.getLabel = function(property, key) {
	var sections = this.config.lightbox.sections;
	for (var i=0; i<sections.length; i++) {
		if(sections[i].map_to == property) {
			var options = sections[i].options;
			for (var j=0; j<options.length; j++) {
				if(options[j].key == key) {
					return options[j].label;
				}
			}
		}
	}
	return "";
};
scheduler._lame_clone = function(object, cache) {
	var i, t, result; // iterator, types array, result

	cache = cache || [];

	for (i=0; i<cache.length; i+=2)
		if(object === cache[i])
			return cache[i+1];

	if (object && typeof object == "object") {
		result = Object.create(object); // preserve prototype methods
		t = [Array,Date,Number,String,Boolean];
		for (i=0; i<t.length; i++) {
			if (object instanceof t[i])
				result = i ? new t[i](object) : new t[i](); // first one is array
		}
		cache.push(object, result);
		for (i in object) {
			if (Object.prototype.hasOwnProperty.apply(object, [i]))
				result[i] = scheduler._lame_clone(object[i], cache);
		}
	}
	return result || object;
};
scheduler._lame_copy = function(target, source) {
	for (var key in source) {
		if (source.hasOwnProperty(key)) {
			target[key] = source[key];
		}
	}
	return target;
};
scheduler._get_date_from_pos = function(pos) {
	var start=this._min_date.valueOf()+(pos.y*this.config.time_step+(this._table_view?0:pos.x)*24*60)*60000;
	//if (this.config.rtl) start=scheduler.date.add(this._max_date, -1, "day").valueOf()+(pos.y*this.config.time_step-(this._table_view?0:pos.x)*24*60)*60000;
	return new Date(this._correct_shift(start));
};
// n_ev - native event
scheduler.getActionData = function(n_ev) {
	var pos = this._mouse_coords(n_ev);
	return {
		date:this._get_date_from_pos(pos),
		section:pos.section
	};
};

//non-linear scales
scheduler._get_real_event_length=function(sd, fd, obj){
	var ev_length = fd -sd;
	var hours = (obj._start_correction + obj._end_correction)||0;
	var ignore = this["ignore_"+this._mode];

	var start_slot = 0,
		end_slot;
	if (obj.render){
		start_slot = this._get_date_index(obj, sd);
		end_slot = this._get_date_index(obj, fd);
	} else{
		end_slot = Math.round(ev_length/60/60/1000/24);
	}

	var last_column = true;
	while (start_slot < end_slot){
		var check = scheduler.date.add(fd, -obj.x_step, obj.x_unit);
		if (ignore && ignore(fd) && (!last_column || (last_column && ignore(check) ))){
			ev_length -= (fd-check);

		}else{
			last_column = false;
			ev_length -= hours;
		}


		fd = check;
		end_slot--;
	}
	return ev_length;
};
scheduler._get_fictional_event_length=function(end_date, ev_length, obj, back){
	var sd = new Date(end_date);
	var dir = back ? -1 : 1;

	//get difference caused by first|last hour
	if (obj._start_correction || obj._end_correction){
		var today;
		if (back)
			today = (sd.getHours()*60+sd.getMinutes()) - (obj.first_hour||0)*60;
		else
			today = (obj.last_hour||0)*60 - (sd.getHours()*60+sd.getMinutes());
		var per_day = (obj.last_hour - obj.first_hour)*60;
		var days = Math.ceil( (ev_length / (60*1000) - today ) / per_day);
		if(days < 0) days = 0;
		ev_length += days * (24*60 - per_day) * 60 * 1000;
	}

	var fd = new Date(end_date*1+ev_length*dir);
	var ignore = this["ignore_"+this._mode];

	var start_slot = 0,
		end_slot;
	if (obj.render){
		start_slot = this._get_date_index(obj, sd);
		end_slot = this._get_date_index(obj, fd);
	} else{
		end_slot = Math.round(ev_length/60/60/1000/24);
	}

	while (start_slot*dir <= end_slot*dir){
		var check = scheduler.date.add(sd, obj.x_step*dir, obj.x_unit);
		if (ignore && ignore(sd)){
			ev_length += (check-sd)*dir;
			end_slot += dir;
		}

		sd = check;
		start_slot+=dir;
	}

	return ev_length;
};
scheduler._is_initialized = function(){
	var state = this.getState();
	return (this._obj && state.date && state.mode);
};

scheduler._getClassName = function(node){
	if(!node) return "";

	var className = node.className || "";
	if(className.baseVal)//'className' exist but not a string - IE svg element in DOM
		className = className.baseVal;

	if(!className.indexOf)
		className = '';

	return className || "";
};
(function(){
	function isVisible(node){
		var display = false,
			visibility = false;

		var hiddenSection = false;
		var recurringSection = scheduler._locate_css({target:node}, "dhx_form_repeat", false);
		if(recurringSection){
			hiddenSection = !!(recurringSection.style.height == "0px");
		}
		hiddenSection = hiddenSection || !(node.offsetHeight);

		return (display != "none" && visibility != "hidden" && !hiddenSection);
	}

	function hasNonNegativeTabIndex(node){
		return !isNaN(node.getAttribute("tabindex")) && (node.getAttribute("tabindex")*1 >= 0);
	}

	function hasHref(node){
		var canHaveHref = {"a": true, "area": true};
		if(canHaveHref[node.nodeName.loLowerCase()]){
			return !!node.getAttribute("href");
		}
		return true;
	}

	function isEnabled(node){
		var canDisable = {"input":true, "select":true, "textarea":true, "button":true, "object":true};
		if(canDisable[node.nodeName.toLowerCase()]){
			return !node.hasAttribute("disabled");
		}

		return true;
	}


	scheduler._getFocusableNodes = function getFocusableNodes(root){
		var nodes = root.querySelectorAll([
			"a[href]",
			"area[href]",
			"input",
			"select",
			"textarea",
			"button",
			"iframe",
			"object",
			"embed",
			"[tabindex]",
			"[contenteditable]"
		].join(", "));

		var nodesArray = Array.prototype.slice.call(nodes, 0);
		for(var i = 0; i < nodesArray.length; i++){
			var node = nodesArray[i];
			var isValid = (hasNonNegativeTabIndex(node)  || isEnabled(node) || hasHref(node)) && isVisible(node);
			if(!isValid){
				nodesArray.splice(i, 1);
				i--;
			}
		}
		return nodesArray;
	};
})();

scheduler._trim = function(str){
	var func = String.prototype.trim || function(){ return this.replace(/^\s+|\s+$/g, ""); };
	return func.apply(str);
};

scheduler._isDate = function(obj){
	if (obj && typeof obj == "object") {
		return !!(obj.getFullYear && obj.getMonth && obj.getDate);
	} else {
		return false;
	}
};

scheduler._isObject = function(obj){
	return (obj && typeof obj == "object");
};
(function(){

	var htmlTags = new RegExp("<(?:.|\n)*?>", "gm");
	var extraSpaces = new RegExp(" +", "gm");

	function stripHTMLLite(htmlText){
		return (htmlText + "")
			.replace(htmlTags, " ").
			replace(extraSpaces, " ");
	}

	var singleQuotes = new RegExp("'", "gm");
	function escapeQuotes(text){
		return (text + "").replace(singleQuotes, "&#39;");
	}

	scheduler._waiAria = {
		getAttributeString: function(attr){
			var attributes = [" "];
			for(var i in attr){
				if(typeof attr[i] != "function" && typeof attr[i] != "object") {
					var text = escapeQuotes(stripHTMLLite(attr[i]));
					attributes.push(i + "='" + text + "'");
				}
			}
			attributes.push(" ");
			return attributes.join(" ");
		},
		setAttributes: function(div, values){
			for(var i in values){
				div.setAttribute(i, stripHTMLLite(values[i]));
			}
			return div;
		},

		labelAttr: function(div, content){
			return this.setAttributes(div, {"aria-label": content});
		},
		label: function(label){
			return scheduler._waiAria.getAttributeString({"aria-label": label});
		},

		// day/week/units

		hourScaleAttr: function(div, content){
			this.labelAttr(div, content);

		},
		monthCellAttr: function(div, date){
			this.labelAttr(div, scheduler.templates.day_date(date));
		},

		navBarDateAttr: function(div, content){
			this.labelAttr(div, content);
		},
		dayHeaderAttr: function(div, content){
			this.labelAttr(div, content);
		},

		dayColumnAttr: function(div, date){
			this.dayHeaderAttr(div, scheduler.templates.day_date(date));
		},

		headerButtonsAttributes: function(div, label){
			return this.setAttributes(div, {"role":"button", "aria-label":label});
		},

		headerToggleState: function(div, isActive){
			return this.setAttributes(div, {"aria-pressed": isActive ? "true" : "false"});
		},


		getHeaderCellAttr:function(dateString){

			return scheduler._waiAria.getAttributeString({"aria-label": dateString});
		},


		eventAttr: function(event, div){
			this._eventCommonAttr(event, div);
		},


		_eventCommonAttr: function(event, div){
			div.setAttribute("aria-label", stripHTMLLite(scheduler.templates.event_text(event.start_date, event.end_date, event)));

			if(scheduler.config.readonly){
				div.setAttribute("aria-readonly", true);

			}

			if(event.$dataprocessor_class){
				div.setAttribute("aria-busy", true);
			}


			div.setAttribute("aria-selected",
				(scheduler.getState().select_id == event.id) ? "true" : "false");
		},

		setEventBarAttr: function(event, div){
			this._eventCommonAttr(event, div);
		},

		_getAttributes: function(attributeSetter, arg){
			var result = {
				setAttribute:function(name, value){
					this[name] = value;
				}
			};

			attributeSetter.apply(this, [arg, result]);
			return result;

		},

		eventBarAttrString: function(event){
			return this.getAttributeString(this._getAttributes(this.setEventBarAttr, event));
		},



		agendaHeadAttrString :function(){
			return this.getAttributeString({role: "row"});
		},
		agendaHeadDateString :function(label){
			return this.getAttributeString({role: "columnheader", "aria-label": label});
		},
		agendaHeadDescriptionString :function(label){
			return this.agendaHeadDateString(label);
		},
		agendaDataAttrString: function(){
			return this.getAttributeString({role: "grid"});
		},
		agendaEventAttrString: function(event){
			var attrs = this._getAttributes(this._eventCommonAttr, event);

			attrs["role"] = "row";

			return this.getAttributeString(attrs);

		},
		agendaDetailsBtnString: function(){
			return this.getAttributeString({"role":"button", "aria-label":scheduler.locale.labels.icon_details});
		},


		gridAttrString: function(){
			return this.getAttributeString({role: "grid"});
		},

		gridRowAttrString: function(event){
			return this.agendaEventAttrString(event);
		},

		gridCellAttrString: function(event, column, value){
			return this.getAttributeString({"role":"gridcell", "aria-label": [
				(column.label === undefined ? column.id : column.label),
				": ",
				value
			]});
		},

		mapAttrString: function(){
			return this.gridAttrString();
		},
		mapRowAttrString: function(event){
			return this.gridRowAttrString(event);
		},
		mapDetailsBtnString: function(){
			return this.agendaDetailsBtnString();
		},

		minicalHeader: function(div, headerId){
			this.setAttributes(div, {
				"id":headerId+"",
				"aria-live":"assertice",
				"aria-atomic":"true"

			});
		},
		minicalGrid: function(div, headerId){
			this.setAttributes(div, {
				"aria-labelledby":headerId+"",
				"role":"grid"
			});
		},
		minicalRow: function(div){
			this.setAttributes(div, {
				"role":"row"
			});
		},
		minicalDayCell: function(div, date){
			var selected = (date.valueOf() < scheduler._max_date.valueOf() && date.valueOf() >= scheduler._min_date.valueOf());
			this.setAttributes(div, {
				"role":"gridcell",
				"aria-label": scheduler.templates.day_date(date),
				"aria-selected": selected ? "true" : "false"
			});
		},
		minicalHeadCell: function(div){
			this.setAttributes(div, {
				"role":"columnheader"
			});
		},


		weekAgendaDayCell: function(div, date){
			var header = div.querySelector(".dhx_wa_scale_bar");
			var content = div.querySelector(".dhx_wa_day_data");
			var headerId = scheduler.uid() + "";
			this.setAttributes(header, { "id": headerId});
			this.setAttributes(content, { "aria-labelledby": headerId});

		},
		weekAgendaEvent: function(div, event){
			this.eventAttr(event, div);
		},

		lightboxHiddenAttr: function(div){
			div.setAttribute("aria-hidden", "true");
		},

		lightboxVisibleAttr: function(div){
			div.setAttribute("aria-hidden", "false");
		},

		lightboxSectionButtonAttrString: function(label){
			return this.getAttributeString({"role":"button", "aria-label":label, "tabindex":"0"});
		},

		yearHeader: function(div, headerId){
			this.setAttributes(div, {
				"id":headerId+""
			});
		},
		yearGrid: function(div, headerId){
			this.minicalGrid(div, headerId);
		},
		yearHeadCell: function(div){
			return this.minicalHeadCell(div);
		},
		yearRow: function(div){
			return this.minicalRow(div);
		},
		yearDayCell: function(div){
			this.setAttributes(div, {
				"role":"gridcell"
			});
		},

		lightboxAttr: function(div){
			div.setAttribute("role", "dialog");
			div.setAttribute("aria-hidden", "true");
			div.firstChild.setAttribute("role", "heading");
		},

		lightboxButtonAttrString:function(buttonName){
			return this.getAttributeString({"role":"button", "aria-label":scheduler.locale.labels[buttonName], "tabindex":"0"});
		},
		eventMenuAttrString: function(iconName){
			return this.getAttributeString({"role":"button", "aria-label":scheduler.locale.labels[iconName]});
		},
		lightboxHeader: function(div, headerText){
			div.setAttribute("aria-label", headerText);
		},

		lightboxSelectAttrString: function(time_option){
			var label = "";

			switch (time_option) {
				case "%Y":
					label = scheduler.locale.labels.year;
					break;
				case "%m":
					label = scheduler.locale.labels.month;
					break;
				case "%d":
					label = scheduler.locale.labels.day;
					break;
				case "%H:%i":
					label = scheduler.locale.labels.hour + " " + scheduler.locale.labels.minute;
					break;
				default:
					break;
			}

			return scheduler._waiAria.getAttributeString({"aria-label": label});
		},


		messageButtonAttrString: function(buttonLabel){
			return "tabindex='0' role='button' aria-label='"+buttonLabel+"'";
		},

		messageInfoAttr: function(div){
			div.setAttribute("role", "alert");
			//div.setAttribute("tabindex", "-1");
		},

		messageModalAttr: function(div, uid){
			div.setAttribute("role", "dialog");
			if(uid){
				div.setAttribute("aria-labelledby", uid);
			}

			//	div.setAttribute("tabindex", "-1");
		},

		quickInfoAttr: function(div){
			div.setAttribute("role", "dialog");
		},

		quickInfoHeaderAttrString: function(){
			return " role='heading' ";
		},

		quickInfoHeader: function(div, header){
			div.setAttribute("aria-label", header);
		},

		quickInfoButtonAttrString: function(label){
			return scheduler._waiAria.getAttributeString({"role":"button", "aria-label":label, "tabindex":"0"});
		},

		tooltipAttr: function(div){
			div.setAttribute("role", "tooltip");
		},

		tooltipVisibleAttr: function(div){
			div.setAttribute("aria-hidden", "false");
		},

		tooltipHiddenAttr: function(div){
			div.setAttribute("aria-hidden", "true");
		}
	};

	function isDisabled(){
		return !scheduler.config.wai_aria_attributes;
	}

	for(var i in scheduler._waiAria){
		scheduler._waiAria[i] = (function(payload){
			return function(){
				if(isDisabled()){
					return " ";
				}
				return payload.apply(this, arguments);
			};
		})(scheduler._waiAria[i]);
	}


})();
// iframe-safe array type check instead of using instanceof
function isArray(obj){
	if(Array.isArray){
		return Array.isArray(obj);
	}else{
		// close enough
		return (obj && obj.length !== undefined && obj.pop && obj.push);
	}
}

// non-primitive string object, e.g. new String("abc")
function isStringObject(obj){
	return obj && typeof obj === "object" && 
		Function.prototype.toString.call(obj.constructor) === "function String() { [native code] }";
}

// non-primitive number object, e.g. new Number(5)
function isNumberObject(obj){
	return obj && typeof obj === "object" && 
		Function.prototype.toString.call(obj.constructor) === "function Number() { [native code] }";
}

// non-primitive number object, e.g. new Boolean(true)
function isBooleanObject(obj){
	return obj && typeof obj === "object" &&
		Function.prototype.toString.call(obj.constructor) === "function Boolean() { [native code] }";
}

function isDate(obj) {
	if (obj && typeof obj === "object") {
		return !!(obj.getFullYear && obj.getMonth && obj.getDate);
	} else {
		return false;
	}
}

scheduler.utils = {
	mixin: function mixin (target, source, force){
		for (var f in source)
			if (((target[f] === undefined) || force)) target[f]=source[f];
		return target;
	},
	copy: function copy(object) {
		var i, result; // iterator, types array, result
	
		if (object && typeof object == "object") {
	
			switch (true){
				case (isDate(object)):
					result = new Date(object);
					break;
				case (isArray(object)):
					result = new Array(object.length);
					for(i = 0; i < object.length; i++){
						result[i] = copy(object[i]);
					}
					break;
				case (isStringObject(object)):
					result = new String(object);// jshint ignore:line
					break;
				case (isNumberObject(object)):
					result = new Number(object);// jshint ignore:line
					break;
				case (isBooleanObject(object)):
					result = new Boolean(object);// jshint ignore:line
					break;
				default:
					result = {};
					for (i in object) {
						if (Object.prototype.hasOwnProperty.apply(object, [i]))
							result[i] = copy(object[i]);
					}
				break;
			}
		}
		return result || object;
	}
};
var generateStringToDate = function (format, utc) {
	var splt = "var temp=date.match(/[a-zA-Z]+|[0-9]+/g);";
	var mask = format.match(/%[a-zA-Z]/g);
	for (var i = 0; i < mask.length; i++) {
		switch (mask[i]) {
			case "%j":
			case "%d": splt += "set[2]=temp[" + i + "]||1;";
				break;
			case "%n":
			case "%m": splt += "set[1]=(temp[" + i + "]||1)-1;";
				break;
			case "%y": splt += "set[0]=temp[" + i + "]*1+(temp[" + i + "]>50?1900:2000);";
				break;
			case "%g":
			case "%G":
			case "%h":
			case "%H":
				splt += "set[3]=temp[" + i + "]||0;";
				break;
			case "%i":
				splt += "set[4]=temp[" + i + "]||0;";
				break;
			case "%Y": splt += "set[0]=temp[" + i + "]||0;";
				break;
			case "%a":
			case "%A": splt += "set[3]=set[3]%12+((temp[" + i + "]||'').toLowerCase()=='am'?0:12);";
				break;
			case "%s": splt += "set[5]=temp[" + i + "]||0;";
				break;
			case "%M": splt += "set[1]=this.locale.date.month_short_hash[temp[" + i + "]]||0;";
				break;
			case "%F": splt += "set[1]=this.locale.date.month_full_hash[temp[" + i + "]]||0;";
				break;
			default:
				break;
		}
	}
	var code = "set[0],set[1],set[2],set[3],set[4],set[5]";
	if (utc) code = " Date.UTC(" + code + ")";
	return new Function("date", "var set=[0,0,1,0,0,0]; " + splt + " return new Date(" + code + ");");
};

scheduler.date = {
	init:function(){
		var s = scheduler.locale.date.month_short;
		var t = scheduler.locale.date.month_short_hash = {};
		for (var i = 0; i < s.length; i++)
			t[s[i]]=i;

		var s = scheduler.locale.date.month_full;
		var t = scheduler.locale.date.month_full_hash = {};
		for (var i = 0; i < s.length; i++)
			t[s[i]]=i;
	},
	_bind_host_object : function(method){
		if(method.bind){
			return method.bind(scheduler);
		}else{
			return function(){ return method.apply(scheduler, arguments); };
		}
	},
	date_part:function(date){
		var old = new Date(date);
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		if (date.getHours() && //shift to yesterday on dst
			(date.getDate() < old.getDate() || date.getMonth() < old.getMonth() || date.getFullYear() < old.getFullYear()) )
			date.setTime(date.getTime() + 60 * 60 * 1000 * (24 - date.getHours()));
		return date;
	},
	time_part:function(date){
		return (date.valueOf()/1000 - date.getTimezoneOffset()*60)%86400;
	},
	week_start:function(date){
		var shift=date.getDay();
		if (scheduler.config.start_on_monday){
			if (shift===0) shift=6;
			else shift--;
		}
		return this.date_part(this.add(date,-1*shift,"day"));
	},
	month_start:function(date){
		date.setDate(1);
		return this.date_part(date);
	},
	year_start:function(date){
		date.setMonth(0);
		return this.month_start(date);
	},
	day_start:function(date){
		return this.date_part(date);
	},
	_add_days:function(date, inc){
		var ndate = new Date(date.valueOf());

		ndate.setDate(ndate.getDate() + inc);

		// Workaround for Safari/iOS timezone bug, ref:OKZ-149693
		if(inc == Math.round(inc) && inc > 0){
			var datesDiff = +ndate - +date,
				rest = datesDiff % (24*60*60*1000);
			if(rest && date.getTimezoneOffset() == ndate.getTimezoneOffset()){
				var hours = rest / (60* 60 * 1000);
				ndate.setTime(ndate.getTime() + (24 - hours) * 60 * 60 * 1000);
			}
		}

		if (inc >= 0 && (!date.getHours() && ndate.getHours()) &&//shift to yesterday on dst
			(ndate.getDate() < date.getDate() || ndate.getMonth() < date.getMonth() || ndate.getFullYear() < date.getFullYear()) )
			ndate.setTime(ndate.getTime() + 60 * 60 * 1000 * (24 - ndate.getHours()));
		return ndate;
	},
	add:function(date,inc,mode){
		var ndate=new Date(date.valueOf());
		switch(mode){
			case "day":
				ndate = scheduler.date._add_days(ndate, inc);
				break;
			case "week":
				ndate = scheduler.date._add_days(ndate, inc * 7);
				break;
			case "month": ndate.setMonth(ndate.getMonth()+inc); break;
			case "year": ndate.setYear(ndate.getFullYear()+inc); break;
			case "hour":
				/*
				 setHour(getHour() + inc) and setMinutes gives weird result when is applied on a Daylight Saving time switch
				 setTime seems working as expected
				*/
				ndate.setTime(ndate.getTime() + inc * 60 * 60 * 1000);
				break;
			case "minute":
				ndate.setTime(ndate.getTime() + inc * 60 * 1000);
				break;
			default:
				return scheduler.date["add_"+mode](date,inc,mode);
		}
		return ndate;
	},
	to_fixed:function(num){
		if (num<10)	return "0"+num;
		return num;
	},
	copy:function(date){
		return new Date(date.valueOf());
	},
	date_to_str:function(format,utc){
		format=format.replace(/%[a-zA-Z]/g,function(a){
			switch(a){
				case "%d": return "\"+this.date.to_fixed(date.getDate())+\"";
				case "%m": return "\"+this.date.to_fixed((date.getMonth()+1))+\"";
				case "%j": return "\"+date.getDate()+\"";
				case "%n": return "\"+(date.getMonth()+1)+\"";
				case "%y": return "\"+this.date.to_fixed(date.getFullYear()%100)+\"";
				case "%Y": return "\"+date.getFullYear()+\"";
				case "%D": return "\"+this.locale.date.day_short[date.getDay()]+\"";
				case "%l": return "\"+this.locale.date.day_full[date.getDay()]+\"";
				case "%M": return "\"+this.locale.date.month_short[date.getMonth()]+\"";
				case "%F": return "\"+this.locale.date.month_full[date.getMonth()]+\"";
				case "%h": return "\"+this.date.to_fixed((date.getHours()+11)%12+1)+\"";
				case "%g": return "\"+((date.getHours()+11)%12+1)+\"";
				case "%G": return "\"+date.getHours()+\"";
				case "%H": return "\"+this.date.to_fixed(date.getHours())+\"";
				case "%i": return "\"+this.date.to_fixed(date.getMinutes())+\"";
				case "%a": return "\"+(date.getHours()>11?\"pm\":\"am\")+\"";
				case "%A": return "\"+(date.getHours()>11?\"PM\":\"AM\")+\"";
				case "%s": return "\"+this.date.to_fixed(date.getSeconds())+\"";
				case "%W": return "\"+this.date.to_fixed(this.date.getISOWeek(date))+\"";
				default: return a;
			}
		});
		if (utc) format=format.replace(/date\.get/g,"date.getUTC");
		var func = new Function("date","return \""+format+"\";");

		return scheduler.date._bind_host_object(func);
	},
	str_to_date:function(format, utc, exactFormat){
		var parseExactFormat = generateStringToDate(format, utc);
		//return scheduler.date._bind_host_object(func);

		var yyyyMMddhhIIss = /^[0-9]{4}(\-|\/)[0-9]{2}(\-|\/)[0-9]{2} ?(([0-9]{1,2}:[0-9]{1,2})(:[0-9]{1,2})?)?$/;

		// MM/dd/yyyy - default old format for xml-date
		var MMddyyyyhhIIss = /^[0-9]{2}\/[0-9]{2}\/[0-9]{4} ?(([0-9]{1,2}:[0-9]{2})(:[0-9]{1,2})?)?$/;
		// dd-MM-yyyy - default old format for api-date
		var ddMMyyyyhhIIss = /^[0-9]{2}\-[0-9]{2}\-[0-9]{4} ?(([0-9]{1,2}:[0-9]{1,2})(:[0-9]{1,2})?)?$/;
		var ISO8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;

		var isYMDDate = function (datestr) {
			return yyyyMMddhhIIss.test(String(datestr));
		};

		var isMDYDate = function (datestr) {
			return MMddyyyyhhIIss.test(String(datestr));
		};
		var isDMYDate = function (datestr) {
			return ddMMyyyyhhIIss.test(String(datestr));
		};
		var isISO8601 = function (datestr) {
			return ISO8601.test(datestr);
		};

		var parseYMD = generateStringToDate("%Y-%m-%d %H:%i:%s", utc);
		var parseMDY = generateStringToDate("%m/%d/%Y %H:%i:%s", utc);
		var parseDMY = generateStringToDate("%d-%m-%Y %H:%i:%s", utc);

		return function (dateString) {

			if (!exactFormat && !scheduler.config.parse_exact_format) {
				if (dateString && dateString.getISOWeek) {
					return new Date(dateString);
				} else if (typeof dateString === "number") {
					return new Date(dateString);
				} else if (isYMDDate(dateString)) {
					return parseYMD(dateString);
				} else if (isMDYDate(dateString)) {
					return parseMDY(dateString);
				} else if (isDMYDate(dateString)) {
					return parseDMY(dateString);
				} else if (isISO8601(dateString)) {
					return new Date(dateString);
				}
			}

			return parseExactFormat.call(scheduler, dateString);
		};
	},
	getISOWeek: function(ndate) {
		if(!ndate) return false;
		ndate = this.date_part(new Date(ndate));
		var nday = ndate.getDay();
		if (nday === 0) {
			nday = 7;
		}
		var first_thursday = new Date(ndate.valueOf());
		first_thursday.setDate(ndate.getDate() + (4 - nday));
		var year_number = first_thursday.getFullYear(); // year of the first Thursday
		var ordinal_date = Math.round( (first_thursday.getTime() - new Date(year_number, 0, 1).getTime()) / 86400000); //ordinal date of the first Thursday - 1 (so not really ordinal date)
		var week_number = 1 + Math.floor( ordinal_date / 7);
		return week_number;
	},
	getUTCISOWeek: function(ndate){
		return this.getISOWeek(this.convert_to_utc(ndate));
	},
	convert_to_utc: function(date) {
		return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
	}
};
scheduler.locale = {
	date:{
		month_full:["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		month_short:["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		day_full:["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		day_short:["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	},
	labels:{
		dhx_cal_today_button:"Today",
		day_tab:"Day",
		week_tab:"Week",
		month_tab:"Month",
		new_event:"New event",
		icon_save:"Save",
		icon_cancel:"Cancel",
		icon_details:"Details",
		icon_edit:"Edit",
		icon_delete:"Delete",
		confirm_closing:"",//Your changes will be lost, are your sure ?
		confirm_deleting:"Event will be deleted permanently, are you sure?",
		section_description:"Description",
		section_time:"Time period",
		full_day:"Full day",

		/*recurring events*/
		confirm_recurring:"Do you want to edit the whole set of repeated events?",
		section_recurring:"Repeat event",
		button_recurring:"Disabled",
		button_recurring_open:"Enabled",
		button_edit_series: "Edit series",
		button_edit_occurrence: "Edit occurrence",

		/*agenda view extension*/
		agenda_tab:"Agenda",
		date:"Date",
		description:"Description",

		/*year view extension*/
		year_tab:"Year",

		/* week agenda extension */
		week_agenda_tab: "Agenda",

		/*grid view extension*/
		grid_tab: "Grid",

		/* touch tooltip*/
		drag_to_create:"Drag to create",
		drag_to_move:"Drag to move",

		/* dhtmlx message default buttons */
		message_ok:"OK",
		message_cancel:"Cancel",

		/* wai aria labels for non-text controls */
		next: "Next",
		prev: "Previous",
		year: "Year",
		month: "Month",
		day: "Day",
		hour:"Hour",
		minute: "Minute",

		/* recurring event components */
		repeat_radio_day: "Daily",//name="repeat" value="day"
		repeat_radio_week: "Weekly",//name="repeat" value="week
		repeat_radio_month: "Monthly",
		repeat_radio_year: "Yearly",
		repeat_radio_day_type: "Every",
		repeat_text_day_count: "day",
		repeat_radio_day_type2: "Every workday",
		repeat_week: " Repeat every",
		repeat_text_week_count: "week next days:",
		repeat_radio_month_type: "Repeat",
		repeat_radio_month_start: "On",
		repeat_text_month_day: "day every",
		repeat_text_month_count: "month",
		repeat_text_month_count2_before: "every",
		repeat_text_month_count2_after: "month",
		repeat_year_label: "On",
		select_year_day2: "of",
		repeat_text_year_day: "day",
		select_year_month: "month",
		repeat_radio_end: "No end date",
		repeat_text_occurences_count: "occurrences",
		repeat_radio_end2: "After",
		repeat_radio_end3: "End by",
		month_for_recurring: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		day_for_recurring: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]//
	}
};


/*
%e	Day of the month without leading zeros (01..31)
%d	Day of the month, 2 digits with leading zeros (01..31)
%j	Day of the year, 3 digits with leading zeros (001..366)
%a	A textual representation of a day, two letters
%W	A full textual representation of the day of the week

%c	Numeric representation of a month, without leading zeros (0..12)
%m	Numeric representation of a month, with leading zeros (00..12)
%b	A short textual representation of a month, three letters (Jan..Dec)
%M	A full textual representation of a month, such as January or March (January..December)

%y	A two digit representation of a year (93..03)
%Y	A full numeric representation of a year, 4 digits (1993..03)
*/

scheduler.config={
	default_date: "%j %M %Y",
	month_date: "%F %Y",
	load_date: "%Y-%m-%d",
	week_date: "%l",
	day_date: "%D, %F %j",
	hour_date: "%H:%i",
	month_day: "%d",
	//xml_date: "%m/%d/%Y %H:%i",
	date_format: "%Y-%m-%d %H:%i",
	api_date: "%d-%m-%Y %H:%i",
	parse_exact_format: false,
	preserve_length:true,
	time_step: 5,

	start_on_monday: true,
	first_hour: 0,
	last_hour: 24,
	readonly: false,
	drag_resize: true,
	drag_move: true,
	drag_create: true,
	drag_event_body: true,
	dblclick_create: true,
	edit_on_create: true,
	details_on_create: false,
	header: null,
	resize_month_events:false,
	resize_month_timed:false,
	
	responsive_lightbox: false,

	rtl:false,

	cascade_event_display: false,
	cascade_event_count: 4,
	cascade_event_margin: 30,

	multi_day:true,
	multi_day_height_limit: 0,

	drag_lightbox: true,
	preserve_scroll: true,
	select: true,

	server_utc: false,
	touch:true,
	touch_tip:true,
	touch_drag:500,
	touch_swipe_dates: false,
	quick_info_detached:true,

	positive_closing: false,

	drag_highlight: true,
	limit_drag_out: false,
	icons_edit: ["icon_save", "icon_cancel"],
	icons_select: ["icon_details", "icon_edit", "icon_delete"],
	buttons_left: ["dhx_save_btn", "dhx_cancel_btn"],
	buttons_right: ["dhx_delete_btn"],
	lightbox: {
		sections: [
			{name: "description", map_to: "text", type: "textarea", focus: true},
			{name: "time", height: 72, type: "time", map_to: "auto"}
		]
	},
	highlight_displayed_event: true,
	left_border: false,

	ajax_error: "alert",//"ignore"|"console"
	delay_render: 0,
	timeline_swap_resize: true,
	wai_aria_attributes: true,
	wai_aria_application_role: true
};

scheduler.config.buttons_left.$inital = scheduler.config.buttons_left.join();
scheduler.config.buttons_right.$inital = scheduler.config.buttons_right.join();

scheduler._helpers = {
	parseDate: function parseDate(date) {
		var parse = scheduler.templates.xml_date || scheduler.templates.parse_date;
		return parse(date);
	},
	formatDate: function formatDate(date) {
		var format = scheduler.templates.xml_format || scheduler.templates.format_date;
		return format(date);
	}
};

scheduler.templates={};
scheduler.init_templates=function(){
	var labels = scheduler.locale.labels;
	labels.dhx_save_btn 	= labels.icon_save;
	labels.dhx_cancel_btn 	= labels.icon_cancel;
	labels.dhx_delete_btn 	= labels.icon_delete;


	var d=scheduler.date.date_to_str;
	var c=scheduler.config;
	var f = function(a,b){
		for (var c in b)
			if (!a[c]) a[c]=b[c];
	};
	f(scheduler.templates,{
		day_date:d(c.default_date),
		month_date:d(c.month_date),
		week_date:function(d1,d2){
			if(c.rtl) {
				return scheduler.templates.day_date(scheduler.date.add(d2,-1,"day"))+" &ndash; "+scheduler.templates.day_date(d1);
			} 
			return scheduler.templates.day_date(d1)+" &ndash; "+scheduler.templates.day_date(scheduler.date.add(d2,-1,"day"));
		},
		day_scale_date:d(c.default_date),
		month_scale_date:d(c.week_date),
		week_scale_date:d(c.day_date),
		hour_scale:d(c.hour_date),
		time_picker:d(c.hour_date),
		event_date:d(c.hour_date),
		month_day:d(c.month_day),

		load_format: d(c.load_date),
	//	xml_date:scheduler.date.str_to_date(c.xml_date,c.server_utc),
	//	xml_format:d(c.date_format,c.server_utc),
		format_date: d(c.date_format, c.server_utc),
		parse_date:scheduler.date.str_to_date(c.date_format,c.server_utc),
		api_date:scheduler.date.str_to_date(c.api_date, false, false),
		event_header:function(start,end,ev){
			// if (scheduler.config.rtl) {
			// 	return scheduler.templates.event_date(end)+" - "+scheduler.templates.event_date(start);
			// }
			return scheduler.templates.event_date(start)+" - "+scheduler.templates.event_date(end);
						
		},
		event_text:function(start,end,ev){
			return ev.text;
		},
		event_class:function(start,end,ev){
			return "";
		},
		month_date_class:function(d){
			return "";
		},
		week_date_class:function(d){
			return "";
		},
		event_bar_date:function(start,end,ev){
			return scheduler.templates.event_date(start)+" ";
		},
		event_bar_text:function(start,end,ev){
			return ev.text;
		},
		month_events_link : function(date, count){
			return "<a>View more("+count+" events)</a>";
		},
		drag_marker_class : function(start, end, event){
			return "";
		},
		drag_marker_content : function(start, end, event){
			return "";
		},
		/* Could be redifined */
		tooltip_date_format: scheduler.date.date_to_str("%Y-%m-%d %H:%i"),
		tooltip_text: function(start, end, event) {
			return "<b>Event:</b> " + event.text + "<br/><b>Start date:</b> " + scheduler.templates.tooltip_date_format(start) + "<br/><b>End date:</b> " + scheduler.templates.tooltip_date_format(end);
		}

	});
	this.callEvent("onTemplatesReady",[]);
};

scheduler.uid = function() {
	if (!this._seed) this._seed = (new Date()).valueOf();
	return this._seed++;
};
scheduler._events = {};
scheduler.clearAll = function() {
	this._events = {};
	this._loaded = {};

	this._edit_id = null;
	this._select_id = null;
	this._drag_id = null;
	this._drag_mode = null;
	this._drag_pos = null;
	this._new_event = null;

	this.clear_view();
	this.callEvent("onClearAll", []);
};
scheduler.addEvent = function(start_date, end_date, text, id, extra_data) {
	if (!arguments.length)
		return this.addEventNow();
	var ev = start_date;
	if (arguments.length != 1) {
		ev = extra_data || {};
		ev.start_date = start_date;
		ev.end_date = end_date;
		ev.text = text;
		ev.id = id;
	}
	ev.id = ev.id || scheduler.uid();
	ev.text = ev.text || "";

	if (typeof ev.start_date == "string")  ev.start_date = this.templates.api_date(ev.start_date);
	if (typeof ev.end_date == "string")  ev.end_date = this.templates.api_date(ev.end_date);
	var d = (this.config.event_duration || this.config.time_step) * 60000;
	if (ev.start_date.valueOf() == ev.end_date.valueOf())
		ev.end_date.setTime(ev.end_date.valueOf() + d);

	ev._timed = this.isOneDayEvent(ev);

	var is_new = !this._events[ev.id];
	this._events[ev.id] = ev;
	this.event_updated(ev);
	if (!this._loading)
		this.callEvent(is_new ? "onEventAdded" : "onEventChanged", [ev.id, ev]);
	return ev.id;
};
scheduler.deleteEvent = function(id, silent) {
	var ev = this._events[id];
	if (!silent && (!this.callEvent("onBeforeEventDelete", [id, ev]) || !this.callEvent("onConfirmedBeforeEventDelete", [id, ev])))
		return;
	if (ev) {
		this._select_id = null;
		delete this._events[id];
		this.event_updated(ev);

		if(this._drag_id == ev.id){
			this._drag_id = null;
			this._drag_mode=null;
			this._drag_pos=null;
		}
	}

	this.callEvent("onEventDeleted", [id, ev]);
};
scheduler.getEvent = function(id) {
	return this._events[id];
};
scheduler.setEvent = function(id, hash) {
	if(!hash.id)
		hash.id = id;

	this._events[id] = hash;
};

(function() {
	var attrs = ["text", "Text", "start_date", "StartDate", "end_date", "EndDate"];
	var create_getter = function(name) {
		return function(id) { return (scheduler.getEvent(id))[name]; };
	};
	var create_setter = function(name) {
		return function(id, value) {
			var ev = scheduler.getEvent(id);
			ev[name] = value;
			ev._changed = true;
			ev._timed = this.isOneDayEvent(ev);
			scheduler.event_updated(ev, true);
		};
	};
	for (var i = 0; i < attrs.length; i += 2) {
		scheduler["getEvent" + attrs[i + 1]] = create_getter(attrs[i]);
		scheduler["setEvent" + attrs[i + 1]] = create_setter(attrs[i]);
	}
})();
scheduler.is_visible_events = function(ev) {
	//if in displayed dates
	var in_visible_range = (ev.start_date.valueOf() < this._max_date.valueOf() && this._min_date.valueOf() < ev.end_date.valueOf());
	if(in_visible_range){
	
		//end dates are not between last/first hours
		var evFirstHour = ev.start_date.getHours(),
			evLastHour = ev.end_date.getHours() + (ev.end_date.getMinutes()/60),
			lastHour = this.config.last_hour,
			firstHour = this.config.first_hour;

		var end_dates_visible = (this._table_view || !((evLastHour > lastHour || evLastHour < firstHour) && (evFirstHour >= lastHour || evFirstHour < firstHour)));

		if(end_dates_visible){
			return true;
		}else{

			//event is bigger than area hidden between last/first hours
			var event_duration = (ev.end_date.valueOf() - ev.start_date.valueOf()) / (1000*60*60),//hours
				hidden_duration = 24 - (this.config.last_hour - this.config.first_hour);

			return !!((event_duration > hidden_duration) || (evFirstHour < lastHour && evLastHour >= firstHour));

		}
	}else{
		return false;
	}
};
scheduler.isOneDayEvent = function(ev) {
	// decrease by one ms so events that ends on midnight on the next day were still considered one day events 
	// e.g. (09-02-2018 19:00 - 10-02-2018 00:00)
	// events >= 24h long are considered multiday
	var checkEndDate = new Date(ev.end_date.valueOf() - 1);
	return (
		ev.start_date.getFullYear() === checkEndDate.getFullYear() &&
		ev.start_date.getMonth() === checkEndDate.getMonth() &&
		ev.start_date.getDate() === checkEndDate.getDate()
	) && ((ev.end_date.valueOf() - ev.start_date.valueOf()) < (1000 * 60 * 60 * 24));
};

scheduler.get_visible_events = function(only_timed) {
	//not the best strategy for sure
	var stack = [];

	for (var id in this._events)
		if (this.is_visible_events(this._events[id]))
			if (!only_timed || this._events[id]._timed)
				if (this.filter_event(id, this._events[id])){
					stack.push(this._events[id]);
				}

	return stack;
};
scheduler.filter_event = function(id, ev) {
	var filter = this["filter_" + this._mode];
	return (filter) ? filter(id, ev) : true;
};
scheduler._is_main_area_event = function(ev){
	return !!ev._timed;
};


scheduler._view_month_day = function(e){
	var date = scheduler.getActionData(e).date;
	if(!scheduler.callEvent("onViewMoreClick", [date]))
		return;
	scheduler.setCurrentView(date, "day");
};
scheduler._recalculate_timed = function(id){
	if(!id) return;
	var ev;
	if(typeof(id) != "object")
		ev = this._events[id];
	else
		ev = id;
	if(!ev) return;
	ev._timed = scheduler.isOneDayEvent(ev);
};


scheduler._get_first_visible_cell = function(cells) {
	for (var i = 0; i < cells.length; i++) {
		if ((cells[i].className || "").indexOf("dhx_scale_ignore") == -1) {
			return cells[i];
		}
	}
	// if no visible cell found, return cells[0] to be more tolerant, since it's the original logic
	return cells[0];
};

scheduler._pre_render_events = function(evs, hold) {
	var hb = this.xy.bar_height;
	var h_old = this._colsS.heights;
	var h = this._colsS.heights = [0, 0, 0, 0, 0, 0, 0];
	var data = this._els["dhx_cal_data"][0];

	if (!this._table_view) {
		evs = this._pre_render_events_line(evs, hold); //ignore long events for now
	}
	else {
		evs = this._pre_render_events_table(evs, hold);
	}
	if (this._table_view) {
		if (hold)
			this._colsS.heights = h_old;
		else {
			var evl = data.firstChild;
			if (evl.rows) {
				for (var i = 0; i < evl.rows.length; i++) {
					h[i]++;
					var cells = evl.rows[i].cells;
					var cellHeight = this._colsS.height - this.xy.month_head_height;
					if ((h[i]) * hb > cellHeight) { // 22 - height of cell's header
						//we have overflow, update heights

						var cHeight = cellHeight;
						if(this.config.max_month_events*1 !== this.config.max_month_events || h[i] <= this.config.max_month_events){
							cHeight = h[i] * hb;
						}else if( (this.config.max_month_events + 1) * hb > cellHeight){
							cHeight = (this.config.max_month_events + 1) * hb;
						}

						for (var j = 0; j < cells.length; j++) {
							cells[j].childNodes[1].style.height = cHeight + "px";
						}
					//	h[i] = (h[i - 1] || 0) + cells[0].offsetHeight;
					}

					h[i] = (h[i - 1] || 0) + scheduler._get_first_visible_cell(cells).offsetHeight;
				}
				h.unshift(0);
				if (evl.parentNode.offsetHeight < evl.parentNode.scrollHeight && !scheduler._colsS.scroll_fix && scheduler.xy.scroll_width) {

					var scale_settings = scheduler._colsS,
						sum_width = scale_settings[scale_settings.col_length],
						row_heights = scale_settings.heights.slice();

					sum_width -= (scheduler.xy.scroll_width || 0);
					this._calc_scale_sizes(sum_width, this._min_date, this._max_date);
					scheduler._colsS.heights = row_heights;

					this.set_xy(this._els["dhx_cal_header"][0], sum_width, this.xy.scale_height);
					scheduler._render_scales(this._els["dhx_cal_header"][0]);
					scheduler._render_month_scale(this._els["dhx_cal_data"][0], this._get_timeunit_start(), this._min_date);

					scale_settings.scroll_fix = true;
				}
			} else {
				if (!evs.length && this._els["dhx_multi_day"][0].style.visibility == "visible")
					h[0] = -1;
				if (evs.length || h[0] == -1) {
					//shift days to have space for multiday events
					var childs = evl.parentNode.childNodes;

					// +1 so multiday events would have 2px from top and 2px from bottom by default
					var full_multi_day_height = (h[0] + 1) * hb + 1;

					var used_multi_day_height = full_multi_day_height;
					var used_multi_day_height_css = full_multi_day_height + "px";
					if (this.config.multi_day_height_limit) {
						used_multi_day_height = Math.min(full_multi_day_height, this.config.multi_day_height_limit) ;
						used_multi_day_height_css = used_multi_day_height + "px";
					}

					data.style.top = (this._els["dhx_cal_navline"][0].offsetHeight + this._els["dhx_cal_header"][0].offsetHeight + used_multi_day_height ) + 'px';
					data.style.height = (this._obj.offsetHeight - parseInt(data.style.top, 10) - (this.xy.margin_top || 0)) + 'px';

					var multi_day_section = this._els["dhx_multi_day"][0];
					multi_day_section.style.height = used_multi_day_height_css;
					multi_day_section.style.visibility = (h[0] == -1 ? "hidden" : "visible");

					// icon
					var multi_day_icon = this._els["dhx_multi_day"][1];
					multi_day_icon.style.height = used_multi_day_height_css;
					multi_day_icon.style.visibility = (h[0] == -1 ? "hidden" : "visible");
					multi_day_icon.className = h[0] ? "dhx_multi_day_icon" : "dhx_multi_day_icon_small";
					this._dy_shift = (h[0] + 1) * hb;
					if(this.config.multi_day_height_limit){
						this._dy_shift = Math.min(this.config.multi_day_height_limit, this._dy_shift);
					}
					h[0] = 0;

					if (used_multi_day_height != full_multi_day_height) {
						data.style.top = (parseInt(data.style.top) + 2) + "px";

						multi_day_section.style.overflowY = "auto";
					//	multi_day_section.style.width = (parseInt(this._els["dhx_cal_navline"][0].style.width)) + "px";

						multi_day_icon.style.position = "fixed";
						multi_day_icon.style.top = "";
						multi_day_icon.style.left = "";
					}
				}
			}
		}
	}
	return evs;
};
scheduler._get_event_sday = function(ev) {
	// get day in current view
	// use rounding for 23 or 25 hour days on DST
	var datePart = this.date.day_start(new Date(ev.start_date));
	return Math.round((datePart.valueOf() - this._min_date.valueOf()) / (24 * 60 * 60 * 1000));
};
scheduler._get_event_mapped_end_date = function(ev) {
	var end_date = ev.end_date;
	if (this.config.separate_short_events) {
		var ev_duration = (ev.end_date - ev.start_date) / 60000; // minutes
		if (ev_duration < this._min_mapped_duration) {
			end_date = this.date.add(end_date, this._min_mapped_duration - ev_duration, "minute");
		}
	}
	return end_date;
};
scheduler._pre_render_events_line = function(evs, hold){
	evs.sort(function(a, b) {
		if (a.start_date.valueOf() == b.start_date.valueOf())
			return a.id > b.id ? 1 : -1;
		return a.start_date > b.start_date ? 1 : -1;
	});
	var days = []; //events by weeks
	var evs_originals = [];

	this._min_mapped_duration = Math.ceil(this.xy.min_event_height * 60 / this.config.hour_size_px);  // values could change along the way

	for (var i = 0; i < evs.length; i++) {
		var ev = evs[i];

		//check date overflow
		var sd = ev.start_date;
		var ed = ev.end_date;
		//check scale overflow
		var sh = sd.getHours();
		var eh = ed.getHours();
		ev._sday = this._get_event_sday(ev); // sday based on event start_date
		if (this._ignores[ev._sday]){
			//ignore event
			evs.splice(i,1);
			i--;
			continue;
		}

		if (!days[ev._sday]) days[ev._sday] = [];

		if (!hold) {
			ev._inner = false;

			var stack = days[ev._sday];

			while (stack.length) {
				var t_ev = stack[stack.length - 1];
				var t_end_date = this._get_event_mapped_end_date(t_ev);
				if (t_end_date.valueOf() <= ev.start_date.valueOf()) {
					stack.splice(stack.length - 1, 1);
				} else {
					break;
				}
			}
			var slot_index = stack.length;
			var sorderSet = false;
			for (var j = 0; j < stack.length; j++) {
				var t_ev = stack[j];
				var t_end_date = this._get_event_mapped_end_date(t_ev);
				if (t_end_date.valueOf() <= ev.start_date.valueOf()) {
					sorderSet = true;
					ev._sorder = t_ev._sorder;
					slot_index = j;
					ev._inner = true;
					break;
				}
			}

			if (stack.length)
				stack[stack.length - 1]._inner = true;

			if (!sorderSet) {
				if (stack.length) {
					if (stack.length <= stack[stack.length - 1]._sorder) {
						if (!stack[stack.length - 1]._sorder)
							ev._sorder = 0;
						else
							for (j = 0; j < stack.length; j++) {
								var _is_sorder = false;
								for (var k = 0; k < stack.length; k++) {
									if (stack[k]._sorder == j) {
										_is_sorder = true;
										break;
									}
								}
								if (!_is_sorder) {
									ev._sorder = j;
									break;
								}
							}
						ev._inner = true;
					} else {
						var _max_sorder = stack[0]._sorder;
						for (j = 1; j < stack.length; j++) {
							if (stack[j]._sorder > _max_sorder)
								_max_sorder = stack[j]._sorder;
						}
						ev._sorder = _max_sorder + 1;
						ev._inner = false;
					}

				} else
					ev._sorder = 0;
			}

			stack.splice(slot_index, slot_index == stack.length ? 0 : 1, ev);

			if (stack.length > (stack.max_count || 0)) {
				stack.max_count = stack.length;
				ev._count = stack.length;
			} else {
				ev._count = (ev._count) ? ev._count : 1;
			}
		}

		if (sh < this.config.first_hour || eh >= this.config.last_hour) {
			// Need to create copy of event as we will be changing it's start/end date
			// e.g. first_hour = 11 and event.start_date hours = 9. Need to preserve that info
			evs_originals.push(ev);
			evs[i] = ev = this._copy_event(ev);

			if (sh < this.config.first_hour) {
				ev.start_date.setHours(this.config.first_hour);
				ev.start_date.setMinutes(0);
			}
			if (eh >= this.config.last_hour) {
				ev.end_date.setMinutes(0);
				ev.end_date.setHours(this.config.last_hour);
			}

			if (ev.start_date > ev.end_date || sh == this.config.last_hour) {
				evs.splice(i, 1);
				i--;
				continue;
			}
		}
	}
	if (!hold) {
		for (var i = 0; i < evs.length; i++) {
			evs[i]._count = days[evs[i]._sday].max_count;
		}
		for (var i = 0; i < evs_originals.length; i++)
			evs_originals[i]._count = days[evs_originals[i]._sday].max_count;
	}

	return evs;
};
scheduler._time_order = function(evs) {
	evs.sort(function(a, b) {
		if (a.start_date.valueOf() == b.start_date.valueOf()) {
			if (a._timed && !b._timed) return 1;
			if (!a._timed && b._timed) return -1;
			return a.id > b.id ? 1 : -1;
		}
		return a.start_date > b.start_date ? 1 : -1;
	});
};

scheduler._is_any_multiday_cell_visible = function(from, to, event){
	var cols = this._cols.length;
	var isAnyCellVisible = false;
	var checkDate = from;
	var noCells = true;
	var lastDayEnd = new Date(to);
	if(scheduler.date.day_start(new Date(to)).valueOf() != to.valueOf()){
		lastDayEnd = scheduler.date.day_start(lastDayEnd);
		lastDayEnd = scheduler.date.add(lastDayEnd, 1, "day");
	}
	while(checkDate < lastDayEnd){
		noCells = false;
		var cellIndex = this.locate_holder_day(checkDate, false, event);
		var weekCellIndex = cellIndex % cols;
		if(!this._ignores[weekCellIndex]){
			isAnyCellVisible = true;
			break;
		}
		checkDate = scheduler.date.add(checkDate, 1, "day");
	}
	return noCells || isAnyCellVisible;
};

scheduler._pre_render_events_table = function(evs, hold) { // max - max height of week slot
	this._time_order(evs);
	var out = [];
	var weeks = [
		[],
		[],
		[],
		[],
		[],
		[],
		[]
	]; //events by weeks
	var max = this._colsS.heights;
	var start_date;
	var cols = this._cols.length;
	var chunks_info = {};

	for (var i = 0; i < evs.length; i++) {
		var ev = evs[i];
		var id = ev.id;
		if (!chunks_info[id]) {
			chunks_info[id] = {
				first_chunk: true,
				last_chunk: true
			};
		}
		var chunk_info = chunks_info[id];
		var sd = (start_date || ev.start_date);
		var ed = ev.end_date;
		//trim events which are crossing through current view
		if (sd < this._min_date) {
			chunk_info.first_chunk = false;
			sd = this._min_date;
		}
		if (ed > this._max_date) {
			chunk_info.last_chunk = false;
			ed = this._max_date;
		}

		var locate_s = this.locate_holder_day(sd, false, ev);
		ev._sday = locate_s % cols;
		//skip single day events for ignored dates
		if (this._ignores[ev._sday] && ev._timed) continue;

		var locate_e = this.locate_holder_day(ed, true, ev) || cols;
		ev._eday = (locate_e % cols) || cols; //cols used to fill full week, when event end on monday
		ev._length = locate_e - locate_s;
		//3600000 - compensate 1 hour during winter|summer time shift
		ev._sweek = Math.floor((this._correct_shift(sd.valueOf(), 1) - this._min_date.valueOf()) / (60 * 60 * 1000 * 24 * cols));

		var isAnyCellVisible = scheduler._is_any_multiday_cell_visible(sd, ed, ev);
		
		if(!isAnyCellVisible){
			continue;
		}

		//current slot
		var stack = weeks[ev._sweek];
		//check order position
		var stack_line;

		for (stack_line = 0; stack_line < stack.length; stack_line++)
			if (stack[stack_line]._eday <= ev._sday)
				break;

		if (!ev._sorder || !hold) {
			ev._sorder = stack_line;
		}

		if (ev._sday + ev._length <= cols) {
			start_date = null;
			out.push(ev);
			stack[stack_line] = ev;
			//get max height of slot
			max[ev._sweek] = stack.length - 1;
			ev._first_chunk = chunk_info.first_chunk;
			ev._last_chunk = chunk_info.last_chunk;
		} else { // split long event in chunks
			var copy = this._copy_event(ev);
			copy.id = ev.id;
			copy._length = cols - ev._sday;
			copy._eday = cols;
			copy._sday = ev._sday;
			copy._sweek = ev._sweek;
			copy._sorder = ev._sorder;
			copy.end_date = this.date.add(sd, copy._length, "day");
			copy._first_chunk = chunk_info.first_chunk;
			if (chunk_info.first_chunk) {
				chunk_info.first_chunk = false;
			}

			out.push(copy);
			stack[stack_line] = copy;
			start_date = copy.end_date;
			//get max height of slot
			max[ev._sweek] = stack.length - 1;
			i--;
			continue;  //repeat same step
		}
	}
	return out;
};
scheduler._copy_dummy = function() {
	var a = new Date(this.start_date);
	var b = new Date(this.end_date);
	this.start_date = a;
	this.end_date = b;
};
scheduler._copy_event = function(ev) {
	this._copy_dummy.prototype = ev;
	return new this._copy_dummy();
	//return {start_date:ev.start_date, end_date:ev.end_date, text:ev.text, id:ev.id}
};
scheduler._y_from_date = function(date){
	var sm = date.getHours() * 60 + date.getMinutes();
	return ((Math.round((sm * 60 * 1000 - this.config.first_hour * 60 * 60 * 1000) * this.config.hour_size_px / (60 * 60 * 1000))) % (this.config.hour_size_px * 24)); //42px/hour
};
scheduler._calc_event_y = function(ev, min_height){
	min_height = min_height || 0;
	var sm = ev.start_date.getHours() * 60 + ev.start_date.getMinutes();
	var em = (ev.end_date.getHours() * 60 + ev.end_date.getMinutes()) || (scheduler.config.last_hour * 60);
	var top = this._y_from_date(ev.start_date);

	var height = Math.max(min_height, (em - sm) * this.config.hour_size_px / 60); //42px/hour
	return {
		top: top,
		height: height
	};
};

scheduler.config.occurrence_timestamp_in_utc = false;
scheduler.config.recurring_workdays = [1,2,3,4,5];
scheduler.form_blocks["recurring"] = {
    _ds: {},
};


//problem may occur if we will have two repeating events in the same moment of time
scheduler._rec_markers = {};
scheduler._rec_markers_pull = {};
scheduler._add_rec_marker = function(ev, time) {
    ev._pid_time = time;
    this._rec_markers[ev.id] = ev;
    if (!this._rec_markers_pull[ev.event_pid]) this._rec_markers_pull[ev.event_pid] = {};
    this._rec_markers_pull[ev.event_pid][time] = ev;
};
scheduler._get_rec_marker = function(time, id) {
    var ch = this._rec_markers_pull[id];
    if (ch) return ch[time];
    return null;
};
scheduler._get_rec_markers = function(id) {
    return (this._rec_markers_pull[id] || []);
};
scheduler._rec_temp = [];
(function() {
    var old_add_event = scheduler.addEvent;
    scheduler.addEvent = function(start_date, end_date, text, id, extra_data) {
        var ev_id = old_add_event.apply(this, arguments);

        if (ev_id && scheduler.getEvent(ev_id)) {
            var ev = scheduler.getEvent(ev_id);
            if (this._is_modified_occurence(ev))
                scheduler._add_rec_marker(ev, ev.event_length * 1000);
            if (ev.rec_type)
                ev.rec_pattern = ev.rec_type.split("#")[0];
        }
        return ev_id;
    };
})();

scheduler._roll_back_dates = function(ev) {
    ev.event_length = (ev.end_date.valueOf() - ev.start_date.valueOf()) / 1000;
    ev.end_date = ev._end_date;
    if (ev._start_date) {
        ev.start_date.setMonth(0);
        ev.start_date.setDate(ev._start_date.getDate());
        ev.start_date.setMonth(ev._start_date.getMonth());
        ev.start_date.setFullYear(ev._start_date.getFullYear());

    }
};

scheduler._is_virtual_event = function(id){
    return id.toString().indexOf("#") != -1;
};
scheduler._is_modified_occurence = function(ev){
    return (ev.event_pid && ev.event_pid != "0");
};

scheduler._validId = function(id) {
    return !this._is_virtual_event(id);
};

scheduler.get_visible_events_rec = scheduler.get_visible_events;
scheduler.get_visible_events = function(only_timed) {
    for (var i = 0; i < this._rec_temp.length; i++)
        delete this._events[this._rec_temp[i].id];
    this._rec_temp = [];

    var stack = this.get_visible_events_rec(only_timed);
    var out = [];
    for (var i = 0; i < stack.length; i++) {
        if (stack[i].rec_type) {
            //deleted element of serie
            if (stack[i].rec_pattern != "none")
                this.repeat_date(stack[i], out);
        }
        else out.push(stack[i]);
    }
    return out;
};


(function() {
    var old = scheduler.isOneDayEvent;
    scheduler.isOneDayEvent = function(ev) {
        if (ev.rec_type) return true;
        return old.call(this, ev);
    };
    var old_update_event = scheduler.updateEvent;
    scheduler.updateEvent = function(id) {
        var ev = scheduler.getEvent(id);
        if(ev && ev.rec_type){
            //rec_type can be changed without the lightbox,
            // make sure rec_pattern updated as well
            ev.rec_pattern = (ev.rec_type || "").split("#")[0];
        }
        if (ev && ev.rec_type && !this._is_virtual_event(id)) {
            scheduler.update_view();
        } else {
            old_update_event.call(this, id);
        }
    };
})();

scheduler.transponse_size = {
    day:1, week:7, month:1, year:12
};
scheduler.date.day_week = function(sd, day, week) {
    sd.setDate(1);
    week = (week - 1) * 7;
    var cday = sd.getDay();
    var nday = day * 1 + week - cday + 1;
    sd.setDate(nday <= week ? (nday + 7) : nday);
};
scheduler.transpose_day_week = function(sd, list, cor, size, cor2) {
    var cday = (sd.getDay() || (scheduler.config.start_on_monday ? 7 : 0)) - cor;
    for (var i = 0; i < list.length; i++) {
        if (list[i] > cday)
            return sd.setDate(sd.getDate() + list[i] * 1 - cday - (size ? cor : cor2));
    }
    this.transpose_day_week(sd, list, cor + size, null, cor);
};
scheduler.transpose_type = function(type) {
    var f = "transpose_" + type;
    if (!this.date[f]) {
        var str = type.split("_");
        var day = 60 * 60 * 24 * 1000;
        var gf = "add_" + type;
        var step = this.transponse_size[str[0]] * str[1];

        if (str[0] == "day" || str[0] == "week") {
            var days = null;
            if (str[4]) {
                days = str[4].split(",");
                if (scheduler.config.start_on_monday) {
                    for (var i = 0; i < days.length; i++)
                        days[i] = (days[i] * 1) || 7;
                    days.sort();
                }
            }

            this.date[f] = function(nd, td) {
                var delta = Math.floor((td.valueOf() - nd.valueOf()) / (day * step));
                if (delta > 0)
                    nd.setDate(nd.getDate() + delta * step);
                if (days)
                    scheduler.transpose_day_week(nd, days, 1, step);
            };
            this.date[gf] = function(sd, inc) {
                var nd = new Date(sd.valueOf());
                if (days) {
                    for (var count = 0; count < inc; count++)
                        scheduler.transpose_day_week(nd, days, 0, step);
                } else
                    nd.setDate(nd.getDate() + inc * step);

                return nd;
            };
        }
        else if (str[0] == "month" || str[0] == "year") {
            this.date[f] = function(nd, td) {
                var delta = Math.ceil(((td.getFullYear() * 12 + td.getMonth() * 1 + 1) - (nd.getFullYear() * 12 + nd.getMonth() * 1 + 1)) / (step) - 1);
                if (delta >= 0)
                    nd.setMonth(nd.getMonth() + delta * step);
                if (str[3])
                    scheduler.date.day_week(nd, str[2], str[3]);
            };
            this.date[gf] = function(sd, inc) {
                var nd = new Date(sd.valueOf());
                nd.setMonth(nd.getMonth() + inc * step);
                if (str[3])
                    scheduler.date.day_week(nd, str[2], str[3]);
                return nd;
            };
        }
    }
};
scheduler.repeat_date = function(ev, stack, non_render, from, to, maxCount) {

    from = from || this._min_date;
    to = to || this._max_date;
    var max = maxCount || -1;
    var td = new Date(ev.start_date.valueOf());

    var startHour = td.getHours();

    var visibleCount = 0;

    if (!ev.rec_pattern && ev.rec_type)
        ev.rec_pattern = ev.rec_type.split("#")[0];

    this.transpose_type(ev.rec_pattern);
    scheduler.date["transpose_" + ev.rec_pattern](td, from);
    while (td < ev.start_date || scheduler._fix_daylight_saving_date(td,from,ev,td,new Date(td.valueOf() + ev.event_length * 1000)).valueOf() <= from.valueOf() || td.valueOf() + ev.event_length * 1000 <= from.valueOf())
        td = this.date.add(td, 1, ev.rec_pattern);
    while (td < to && td < ev.end_date && (max < 0 || visibleCount < max)) {
        td.setHours(startHour);

        var timestamp = (scheduler.config.occurrence_timestamp_in_utc) ? Date.UTC(td.getFullYear(), td.getMonth(), td.getDate(), td.getHours(), td.getMinutes(), td.getSeconds()) : td.valueOf();
        var ch = this._get_rec_marker(timestamp, ev.id);
        if (!ch) { // unmodified element of series
            var ted = new Date(td.valueOf() + ev.event_length * 1000);
            var copy = this._copy_event(ev);
            //copy._timed = ev._timed;
            copy.text = ev.text;
            copy.start_date = td;
            copy.event_pid = ev.id;
            copy.id = ev.id + "#" + Math.ceil(timestamp / 1000);
            copy.end_date = ted;

            copy.end_date = scheduler._fix_daylight_saving_date(copy.start_date, copy.end_date, ev, td, copy.end_date);

            copy._timed = this.isOneDayEvent(copy);

            if (!copy._timed && !this._table_view && !this.config.multi_day) return;
            stack.push(copy);

            if (!non_render) {
                this._events[copy.id] = copy;
                this._rec_temp.push(copy);
            }

            visibleCount++;

        } else
        if (non_render){
            if(ch.rec_type != "none"){
                visibleCount++;
            }
            stack.push(ch);
        }

        td = this.date.add(td, 1, ev.rec_pattern);
    }
};

scheduler.recover_ev_from_dummy_copy = function(ev_dummy_copy){
	var id = ev_dummy_copy.id.split("#");
	var tid = id[1];

	ev_dummy_copy.id = null;
	ev_dummy_copy.event_pid = ev_dummy_copy.event_pid || id[0];
	ev_dummy_copy.event_length = tid;
	ev_dummy_copy.name = ev_dummy_copy.text;
	return ev_dummy_copy;
}

scheduler.mtrue_copy_series_event = function(ev_series, date_provided, time_now){
	var stack = [];
	scheduler.repeat_date(ev_series, stack);
	var ev_dummy_copy = null;
	for(var i = 0;i < stack.length;i+=1){
		if(stack[i].end_date >= date_provided && (time_now == undefined || stack[i].end_date.valueOf() <= time_now.valueOf())){
			ev_dummy_copy = stack[i];
		}
	}
	if(ev_dummy_copy == null){
		return null;
	}
	var id = ev_dummy_copy.id.split("#");
	var tid = parseInt(id[1]) * 2 - new Date(ev_dummy_copy.start_date.toUTCString().substring(0, 25)).valueOf() / 1000;

	ev_dummy_copy.id = null;
	ev_dummy_copy.event_pid = ev_series.event_pid || id[0];
	ev_dummy_copy.event_length = tid;
	ev_dummy_copy.name = ev_dummy_copy.text;
	return ev_dummy_copy;
}
scheduler._fix_daylight_saving_date = function(start_date, end_date, ev, counter, default_date) {
    var shift = start_date.getTimezoneOffset() - end_date.getTimezoneOffset();
    if (shift) {
        if (shift > 0) {
            // e.g. 24h -> 23h
            return new Date(counter.valueOf() + ev.event_length * 1000 - shift * 60 * 1000);
        }
        else {
            // e.g. 24h -> 25h
            return new Date(end_date.valueOf() - shift * 60 * 1000);
        }
    }
    return new Date(default_date.valueOf());
};
scheduler.getRecDates = function(id, max) {
    var ev = typeof id == "object" ? id : scheduler.getEvent(id);
    var recurrings = [];
    max = max || 100;
    
    if (!ev.rec_type) {
        return [
            { start_date: ev.start_date, end_date: ev.end_date }
        ];
    }
    if (ev.rec_type == "none") {
        return [];
    }

    scheduler.repeat_date(ev, recurrings, true, ev.start_date, ev.end_date, max);

    var result = [];
    for(var i = 0; i < recurrings.length; i++){
        if(recurrings[i].rec_type != "none"){
            result.push({start_date: recurrings[i].start_date, end_date: recurrings[i].end_date});
        }
    }

    return result;
};
scheduler.getEvents = function(from, to) {
    var result = [];
    for (var a in this._events) {
        var ev = this._events[a];
        if (ev && ev.start_date < to && ev.end_date > from) {
            if (ev.rec_pattern) {
                if (ev.rec_pattern == "none") continue;
                var sev = [];
                this.repeat_date(ev, sev, true, from, to);
                for (var i = 0; i < sev.length; i++) {
                    // if event is in rec_markers then it will be checked by himself, here need to skip it
                    if (!sev[i].rec_pattern && sev[i].start_date < to && sev[i].end_date > from && !this._rec_markers[sev[i].id]) {
                        result.push(sev[i]);
                    }
                }
            } else if (!this._is_virtual_event(ev.id)) { // if it's virtual event we can skip it
                result.push(ev);
            }
        }
    }
    return result;
};

scheduler.config.repeat_date = "%m.%d.%Y";
scheduler.config.lightbox.sections = [
    {name:"description", map_to:"text", type:"textarea" , focus:true},
    {name:"recurring", type:"recurring", map_to:"rec_type", button:"recurring"},
    {name:"time", height:72, type:"time", map_to:"auto"}
];


//drop secondary attributes
scheduler._copy_dummy = function(ev) {
    var start_date = new Date(this.start_date);
    var end_date = new Date(this.end_date);
    this.start_date = start_date;
    this.end_date = end_date;
    this.event_length = this.event_pid = this.rec_pattern = this.rec_type = null;
};

scheduler.config.include_end_by = false;
scheduler.config.lightbox_recurring = 'ask'; // series, instance

module.exports = scheduler;