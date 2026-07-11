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
		for(var i = 1;i < line.length;i++){
			var start_ind = inds[i - 1] + 1;
			var end_ind = inds[i];
			var len = end_ind - start_ind;
			if(len < 0)continue;
			else if(len == 0)ans.push("");
			else ans.push(line.substr(start_ind, len).trim());
		}
		return ans;
	};

	static isDict(v) {
		return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date);
	}

	static toISO8601WithOffset(d) {
		const offset = -d.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const pad = (n) => String(Math.abs(n)).padStart(2, "0");
		return d.getFullYear() + "-" +
			pad(d.getMonth() + 1) + "-" +
			pad(d.getDate()) + "T" +
			pad(d.getHours()) + ":" +
			pad(d.getMinutes()) + ":" +
			pad(d.getSeconds()) +
			sign + pad(Math.floor(offset / 60)) + ":" + pad(offset % 60);
}
// "
}

module.exports = MyUtils;
