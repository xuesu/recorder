class MyUtils{
	static splitLine4CSV(line ,separator=",", closure_sym="\"") {
		let in_closure = false;
		let inds = [-1];
		for(var i = 0;i < line.length;i++){
			if(line[i] == closure_sym){
				in_closure = !in_closure;
			}else if(!in_closure && line[i] == separator){
				inds.push(i);
			}
		}
		inds.push(line.length);
		let ans = [];
		for(var i = 1;i < inds.length;i++){
			var start_ind = inds[i - 1] + 1;
			var end_ind = inds[i];
			var len = end_ind - start_ind;
			if(len < 0)continue;
			else if(len == 0)ans.push("");
			else ans.push(line.slice(start_ind, start_ind + len).trim());
		}
		return ans;
	};

	static isDict(v) {
		return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date);
	}

	static absDateToFloatingTime(abs_date, with_hour=true) {
		var date_str = abs_date.getUTCFullYear() + "-" + String(abs_date.getUTCMonth() + 1).padStart(2, '0') + "-" + String(abs_date.getUTCDate()).padStart(2, '0');
		if (with_hour) {
			date_str += " " + String(abs_date.getUTCHours()).padStart(2, '0') + ":" + String(abs_date.getUTCMinutes()).padStart(2, '0');
		}
		return date_str;
	}
	
	static absDateToISO8601WithOffset(abs_date, offset) {
		const sign = offset >= 0 ? "+" : "-";
		const pad = (n) => String(Math.abs(n)).padStart(2, "0");
		return abs_date.getUTCFullYear() + "-" +
			pad(abs_date.getUTCMonth() + 1) + "-" +
			pad(abs_date.getUTCDate()) + "T" +
			pad(abs_date.getUTCHours()) + ":" +
			pad(abs_date.getUTCMinutes()) + ":" +
			pad(abs_date.getUTCSeconds()) +
			sign + pad(Math.floor(offset / 60)) + ":" + pad(offset % 60);
	}

	static absDatefromISO8601WithOffset(dstr) {
		// date.getTime() - offset * 60000 == absolute_date.getTime()
		// here absolute_date is YYYY-MM-DDTHH:mm:SSZ, with offset=0
		const sign = dstr[19] === "+" ? 1 : -1;
		const offsetHours = parseInt(dstr.substring(20, 22));
		const offsetMinutes = parseInt(dstr.substring(23, 25));
		const offset = sign * (offsetHours * 60 + offsetMinutes);
		const absDate = new Date(dstr + "Z");
		return {
			date: absDate,
			timeshift: offset  // in minutes
		};
	}

	static absDateFromFloatingTime(dstr){
		return new Date(dstr + "Z");
	}

	static localDateToFloatingTime(local_date_or_dstr, with_hour=true) {
		if (local_date_or_dstr == undefined) local_date_or_dstr = new Date();
		if (typeof local_date_or_dstr === "string") local_date_or_dstr = new Date(local_date_or_dstr);
		var date_str = local_date_or_dstr.getFullYear() + "-" + String(local_date_or_dstr.getMonth() + 1).padStart(2, '0') + "-" + String(local_date_or_dstr.getDate()).padStart(2, '0');
		if (with_hour) {
			date_str += " " + String(local_date_or_dstr.getHours()).padStart(2, '0') + ":" + String(local_date_or_dstr.getMinutes()).padStart(2, '0');
		}
		return date_str;
	}
	
	static localDateToISO8601WithOffset(local_date_or_dstr, offset=null) {
		if(offset == null){
			offset = -local_date_or_dstr.getTimezoneOffset();
		}
		if (typeof local_date_or_dstr == "string") local_date_or_dstr = new Date(local_date_or_dstr);
		const sign = offset >= 0 ? "+" : "-";
		const pad = (n) => String(Math.abs(n)).padStart(2, "0");
		return local_date_or_dstr.getFullYear() + "-" +
			pad(local_date_or_dstr.getMonth() + 1) + "-" +
			pad(local_date_or_dstr.getDate()) + "T" +
			pad(local_date_or_dstr.getHours()) + ":" +
			pad(local_date_or_dstr.getMinutes()) + ":" +
			pad(local_date_or_dstr.getSeconds()) +
			sign + pad(Math.floor(offset / 60)) + ":" + pad(offset % 60);
	}

	static localDatefromISO8601WithOffset(dstr) {
		// date.getTime() - offset * 60000 == absolute_date.getTime()
		// here absolute_date is YYYY-MM-DDTHH:mm:SSZ, with offset=0
		const sign = dstr[19] === "+" ? 1 : -1;
		const offsetHours = parseInt(dstr.substring(20, 22));
		const offsetMinutes = parseInt(dstr.substring(23, 25));
		const offset = sign * (offsetHours * 60 + offsetMinutes);
		const localDate = new Date(dstr);
		return {
			date: localDate,
			floating_date_str: this.localDateToFloatingTime(localDate, true),
			abs_date_str: dstr,
			timeshift: offset  // in minutes
		};
	}

	static localDateFromFloatingTime(dstr){
		return {
			date: new Date(dstr),
			floating_date_str: dstr
		};
	}
}

module.exports = MyUtils;
