/**
 * Minimal dhtmlxScheduler - Recurring Events & Dummy Copy Logic Only
 * Keeps only: generate_virtual_occurence_event_from_series_and_date, recover_ev_from_dummy_copy, and dependencies
 */

const MyUtils = require("./utils");

var min_recur_scheduler = {
	_min_date: null,
	_max_date: null,
	start_on_monday: true
};

min_recur_scheduler.date = {
	_add_days: function(date, inc) {
		var ndate = new Date(date.valueOf());
		ndate.setDate(ndate.getDate() + inc);
		
		// Workaround for Safari/iOS timezone bug
		if (inc == Math.round(inc) && inc > 0) {
			var datesDiff = +ndate - +date,
				rest = datesDiff % (24 * 60 * 60 * 1000);
			if (rest && date.getTimezoneOffset() == ndate.getTimezoneOffset()) {
				var hours = rest / (60 * 60 * 1000);
				ndate.setTime(ndate.getTime() + (24 - hours) * 60 * 60 * 1000);
			}
		}
		
		if (inc >= 0 && (!date.getHours() && ndate.getHours()) &&
			(ndate.getDate() < date.getDate() || ndate.getMonth() < date.getMonth() || ndate.getFullYear() < date.getFullYear())) {
			ndate.setTime(ndate.getTime() + 60 * 60 * 1000 * (24 - ndate.getHours()));
		}
		return ndate;
	},

	add: function(date, inc, mode) {
		var ndate = new Date(date.valueOf());
		switch (mode) {
			case "day":
				ndate = min_recur_scheduler.date._add_days(ndate, inc);
				break;
			case "week":
				ndate = min_recur_scheduler.date._add_days(ndate, inc * 7);
				break;
			case "month":
				ndate.setMonth(ndate.getMonth() + inc);
				break;
			case "year":
				ndate.setYear(ndate.getFullYear() + inc);
				break;
			case "hour":
				ndate.setTime(ndate.getTime() + inc * 60 * 60 * 1000);
				break;
			case "minute":
				ndate.setTime(ndate.getTime() + inc * 60 * 1000);
				break;
			default:
				return min_recur_scheduler.date["add_" + mode](date, inc, mode);
		}
		return ndate;
	},

	day_week: function(sd, day, week) {
		sd.setDate(1);
		week = (week - 1) * 7;
		var cday = sd.getDay();
		var nday = day * 1 + week - cday + 1;
		sd.setDate(nday <= week ? (nday + 7) : nday);
	}
};

min_recur_scheduler.isOneDayEvent = function(ev) {
	var checkEndDate = new Date(ev.end_date_dateobj.valueOf() - 1);
	return (
		ev.start_date_dateobj.getFullYear() === checkEndDate.getFullYear() &&
		ev.start_date_dateobj.getMonth() === checkEndDate.getMonth() &&
		ev.start_date_dateobj.getDate() === checkEndDate.getDate()
	) && ((ev.end_date_dateobj.valueOf() - ev.start_date_dateobj.valueOf()) < (1000 * 60 * 60 * 24));
};

min_recur_scheduler._copy_dummy = function() {
	var a = new Date(this.start_date_dateobj);
	var b = new Date(this.end_date_dateobj);
	this.start_date_dateobj = a;
	this.end_date_dateobj = b;
	this.event_length = this.event_pid = this.rec_pattern = this.rec_type = null;
};

min_recur_scheduler._copy_event = function(ev) {
	this._copy_dummy.prototype = ev;
	return new this._copy_dummy();
};

// ==================== DAYLIGHT SAVING TIME FIX ====================

min_recur_scheduler._fix_daylight_saving_date = function(start_date, end_date, ev, counter, default_date) {
	var shift = start_date.getTimezoneOffset() - end_date.getTimezoneOffset();
	if (shift) {
		if (shift > 0) {
			// e.g. 24h -> 23h
			return new Date(counter.valueOf() + ev.event_length * 1000 - shift * 60 * 1000);
		} else {
			// e.g. 24h -> 25h
			return new Date(end_date.valueOf() - shift * 60 * 1000);
		}
	}
	return new Date(default_date.valueOf());
};

// ==================== TRANSPOSE/RECURRENCE LOGIC ====================

min_recur_scheduler.transponse_size = {
	day: 1,
	week: 7,
	month: 1,
	year: 12
};

min_recur_scheduler.transpose_day_week = function(sd, list, cor, size, cor2) {
	var cday = (sd.getDay() || (min_recur_scheduler.start_on_monday ? 7 : 0)) - cor;
	for (var i = 0; i < list.length; i++) {
		if (list[i] > cday)
			return sd.setDate(sd.getDate() + list[i] * 1 - cday - (size ? cor : cor2));
	}
	this.transpose_day_week(sd, list, cor + size, null, cor);
};

min_recur_scheduler.transpose_type = function(type) {
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
				if (min_recur_scheduler.start_on_monday) {
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
					min_recur_scheduler.transpose_day_week(nd, days, 1, step);
			};

			this.date[gf] = function(sd, inc) {
				var nd = new Date(sd.valueOf());
				if (days) {
					for (var count = 0; count < inc; count++)
						min_recur_scheduler.transpose_day_week(nd, days, 0, step);
				} else
					nd.setDate(nd.getDate() + inc * step);
				return nd;
			};
		} else if (str[0] == "month" || str[0] == "year") {
			this.date[f] = function(nd, td) {
				var delta = Math.ceil(((td.getFullYear() * 12 + td.getMonth() * 1 + 1) - (nd.getFullYear() * 12 + nd.getMonth() * 1 + 1)) / (step) - 1);
				if (delta >= 0)
					nd.setMonth(nd.getMonth() + delta * step);
				if (str[3])
					min_recur_scheduler.date.day_week(nd, str[2], str[3]);
			};

			this.date[gf] = function(sd, inc) {
				var nd = new Date(sd.valueOf());
				nd.setMonth(nd.getMonth() + inc * step);
				if (str[3])
					min_recur_scheduler.date.day_week(nd, str[2], str[3]);
				return nd;
			};
		}
	}
};

min_recur_scheduler.repeat_date = function(ev, stack, from, to, maxCount) {
	from = from || this._min_date;
	to = to || this._max_date;
	var max = maxCount || -1;
	var td = new Date(ev.start_date);
	var startHour = td.getHours();
	var visibleCount = 0;

	if (!ev.rec_pattern && ev.rec_type)
		ev.rec_pattern = ev.rec_type.split("#")[0];

	this.transpose_type(ev.rec_pattern);
	min_recur_scheduler.date["transpose_" + ev.rec_pattern](td, from);

	while (td < ev.start_date_dateobj || min_recur_scheduler._fix_daylight_saving_date(td, from, ev, td, new Date(td.valueOf() + ev.event_length * 1000)).valueOf() <= from.valueOf() || td.valueOf() + ev.event_length * 1000 <= from.valueOf())
		td = this.date.add(td, 1, ev.rec_pattern);

	while (td < to && td < ev.end_date_dateobj && (max < 0 || visibleCount < max)) {
		td.setHours(startHour);
		var timestamp = td.valueOf();
	 // unmodified element of series
		var ted = new Date(td.valueOf() + ev.event_length * 1000);
		var copy = this._copy_event(ev);
		copy.name = ev.name;
		copy.text = ev.text;
		copy.start_date = MyUtils.localDateToFloatingTimeStr(td);
		copy.start_date_dateobj = td;
		copy.event_pid = ev.id;
		copy.id = ev.id + "#" + Math.ceil(timestamp / 1000);
		copy.end_date = MyUtils.localDateToFloatingTimeStr(ted);
		copy.end_date_dateobj = ted;
		copy.end_date_dateobj = min_recur_scheduler._fix_daylight_saving_date(copy.start_date_dateobj, copy.end_date_dateobj, ev, td, copy.end_date_dateobj);
		copy._timed = this.isOneDayEvent(copy);
		stack.push(copy);
		visibleCount++;
		td = this.date.add(td, 1, ev.rec_pattern);
	}
};
// ==================== MAIN FUNCTIONS ====================

/**
 * Creates a dummy copy of a recurring series event at a specific date/time
 * @param {Object} ev_series - The recurring event series
 * @param {Date} date_provided - The date to find the occurrence for
 * @param {Date} time_now - Optional: upper bound for time check
 * @returns {Object|null} Dummy event copy or null if not found
 */
min_recur_scheduler.generate_virtual_occurence_event_from_series_and_date = function(ev_series, date_provided, time_now) {
	var stack = [];
	min_recur_scheduler.repeat_date(ev_series, stack);
	
	var ev_dummy_copy = null;
	for (var i = 0; i < stack.length; i += 1) {
		if (stack[i].end_date_dateobj >= date_provided && (time_now == undefined || stack[i].end_date_dateobj.valueOf() <= time_now.valueOf())) {
			ev_dummy_copy = stack[i];
			break;
		}
	}
	
	if (ev_dummy_copy == null) {
		return null;
	}
	
	var id = ev_dummy_copy.id.split("#");
	var tid = MyUtils.shiftlocalTimeStamp2utc0(parseInt(id[1]) * 1000) / 1000;

	ev_dummy_copy.id = null;
	ev_dummy_copy.event_pid = ev_series.event_pid || id[0];
	ev_dummy_copy.event_length = tid;
	ev_dummy_copy.name = ev_dummy_copy.text;
	ev_dummy_copy.rec_pattern = ev_dummy_copy.rec_type = undefined;
	
	return ev_dummy_copy;
};

/**
 * Recovers event series metadata from a dummy copy
 * @param {Object} ev_dummy_copy - The dummy event copy
 * @returns {Object} Recovered event with series metadata
 */
min_recur_scheduler.recover_ev_from_dummy_copy = function(ev_dummy_copy) {
	var id = ev_dummy_copy.id.split("#");
	var tid = id[1];

	ev_dummy_copy.id = null;
	ev_dummy_copy.event_pid = ev_dummy_copy.event_pid || id[0];
	ev_dummy_copy.event_length = tid;
	ev_dummy_copy.name = ev_dummy_copy.text;
	
	return ev_dummy_copy;
};

// ==================== EXPORT ====================
module.exports = min_recur_scheduler;