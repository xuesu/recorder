function getStartDateToday(){
    var date0 = new Date();
    date0.setHours(0);
    date0.setMinutes(0);
    date0.setSeconds(0);
    date0.setMilliseconds(1);
    return date0;
}

function setToZeroForDate(dt){
    return new Date(dt.toDateString());
}

function mystr2date(s) {
    //YYYYMMDD
    if (s.length < 6 || s.length > 12) return undefined;
    for (var i = 0; i < s.length; i += 1) {
        if (s[i] > '9' || s[i] < '0') return undefined;
    }
    var res_date = setToZeroForDate(new Date());
    var ind = 0;
    if (s.length == 6) {
        res_date.setFullYear(2000 + parseInt(s.substr(ind, 2)));
        ind += 2;
    } else {
        res_date.setFullYear(parseInt(s.substr(ind, 4)));
        ind += 4;
    }
    res_date.setMonth(parseInt(s.substr(ind, 2)) - 1);
    ind += 2;
    res_date.setDate(parseInt(s.substr(ind, 2)));
    ind += 2;
    if (ind < s.length) {
        res_date.setHours(parseInt(s.substr(ind, 2)));
        ind += 2;
    }
    if (ind < s.length) {
        res_date.setMinutes(parseInt(s.substr(ind, 2)));
        ind += 2;
    }
    return res_date;
}

function mydate2str(dt) {
    return dt.toISOString().substr(0, 10) + " " + dt.toISOString().substr(11, 5);
}

function addTimeTo(start_time, add_year=0, add_month=0, add_day=0, add_hour=0, add_minute=0){
    var time0 = new Date(start_time);
    time0.setTime(start_time.getTime() + add_minute * 60 * 1000 + add_hour * 60 * 60 * 1000 + add_day * 24 * 60 * 60 * 1000);
    if(add_month != 0){
        var new_v = start_time.getMonth() + add_month;
        var new_v_t = 0;
        if(new_v < 0 || new_v > 11){
            new_v_t =  Math.floor(new_v / 12);
            console.log(new_v_t);
            new_v -= new_v_t * 12;
            add_year += new_v_t;
        }
        time0.setMonth(new_v);
    }
    if(add_year != 0){
        time0.setFullYear(start_time.getFullYear() + add_year);
    }
    return time0;
}


function mystr2time_dur(s){
    var res = {};
    if(s.startsWith("B")){
        res.begin_from_base = true;
        s = s.substr(1);
    }
    var time_ele_strs = ["Y", "Month", "D", "H", "Min"];
    for(var i = 0;i < time_ele_strs.length;i += 1){
        var time_ele_str = time_ele_strs[i];
        if(s.length > time_ele_str.length + 1 && (s.startsWith(time_ele_str + "+") || s.startsWith(time_ele_str + "-"))){
            var ok = true;
            for(var j = time_ele_str.length + 1;j < s.length; j += 1){
                if(s[j] > '9' || s[j] < '0'){
                    ok = false;
                    break;
                }
            }
            if(ok){
                res.ele = time_ele_str;
                res.value = parseInt(s.substr(time_ele_str.length));
                return res;
            }
        }
    }
    return undefined;
}

function add_time_to_my_time_dur(start_time, time_dur){
    if(time_dur.ele == "Y"){
        return addTimeTo(start_time, time_dur.value);
    }
    else if(time_dur.ele == "Month"){
        return addTimeTo(start_time, 0, time_dur.value);
    }
    else if(time_dur.ele == "D"){
        return addTimeTo(start_time, 0, 0, time_dur.value);
    }
    else if(time_dur.ele == "H"){
        return addTimeTo(start_time, 0, 0, 0, time_dur.value);
    }
    else if(time_dur.ele == "Min"){
        return addTimeTo(start_time, 0, 0, 0, 0, time_dur.value);
    }
    alert("unexpected time_dur.ele", time_dur.ele);
}

function try_fit_in_types_in_prefix(s, start_ind, ok_types){
    for(var i = 0;i < ok_types.length;i+=1){
        var end_ind = start_ind;
        var ok_type = ok_types[i];
        if(ok_type == "namestr"){
            for(var j = start_ind;j < s.length;j+=1){
                if((s[j] <= 'z' && s[j] >= 'a') || (s[j] <= 'Z' && s[j] >= 'A')){
                    end_ind = j + 1;
                }else{
                    break;
                }
            }
            if(end_ind != start_ind)return {
                "end_ind": end_ind,
                "value": s.substring(start_ind, end_ind)
            }
        }
        else if(ok_type == "number"){
            if(start_ind < s.length && (s[start_ind] == '+' || s[start_ind] == '-')){
                end_ind = start_ind + 1;
            }
            var show_dot = false;
            var show_num = false;
            for(var j = end_ind;j < s.length;j+=1){
                if(s[j] <= '9' && s[j] >= '0'){
                    show_num = true;
                    end_ind = j + 1;
                }else if(show_num && !show_dot && s[j] == '.' && j + 1 < s.length && (s[j + 1] <= '9' && s[j + 1] >= '0')){
                    show_dot = true;
                    end_ind = j + 1;
                }else{
                    break;
                }
            }
            if(show_num && end_ind != start_ind)return {
                "end_ind": end_ind,
                "value": parseFloat(s.substring(start_ind, end_ind))
            }
        }else if(ok_type == "mydate"){
            for(var j = start_ind;j < s.length;j+=1){
                if(s[j] <= '9' && s[j] >= '0'){
                    end_ind = j + 1;
                }else{
                    break;
                }
            }
            if(end_ind - start_ind >= 6 && end_ind - start_ind <= 12)return {
                "end_ind": end_ind,
                "value": mystr2date(s.substring(start_ind, end_ind))
            }
        }else if(ok_type == "mytimedur"){
            var show_plus = false;
            for(var j = start_ind;j < s.length;j+=1){
                if(!show_plus && ((s[j] <= 'z' && s[j] >= 'a') || (s[j] <= 'Z' && s[j] >= 'A'))){
                    end_ind = j + 1;
                }
                else if(!show_plus && (s[j] == '+' || s[j] == '-')){
                    end_ind = j + 1;
                    show_plus = true;
                }
                else if(show_plus && (s[j] <= '9' && s[j] >= '0')){
                    end_ind = j + 1;
                }
                else{
                    break;
                }
            }
            if(show_plus && (s[end_ind - 1] <= '9' && s[end_ind - 1] >= '0') && mystr2time_dur(s.substring(start_ind, end_ind)) != undefined)return {
                "end_ind": end_ind,
                "value": mystr2time_dur(s.substring(start_ind, end_ind))
            }
        }
    }
    return undefined;
}

function my_parse_line_prefix(line_prefix_str, format_str="[level:namestr]-[date_show:mydate|mytimedur]->[date_end:mydate|mytimedur], [score:number]", full_match=true) {
    if(format_str.length == 0)alert("my_parse_line_prefix:format_str.length == 0!")
    var format_arr = [];
    var s_ind = 0;
    for(var i = 0;i < format_str.length;i += 1){
        if(format_str[i] == '['){
            if(s_ind < i)format_arr.push(format_str.substring(s_ind, i));
            s_ind = i;
        }else if(format_str[i] == ']' && format_str[s_ind] == '['){
            format_ele_str = format_str.substring(s_ind + 1, i);
            if(format_ele_str.indexOf(":") != -1){
                format_arr.push({
                    "name": format_ele_str.substring(0, format_ele_str.indexOf(":")),
                    "ok_types": format_ele_str.substring(format_ele_str.indexOf(":") + 1).split("|"),
                })
            }else{
                format_arr.push(format_str.substring(s_ind + 1, i));
            }
            s_ind = i + 1;
        }else if(i == format_str.length && s_ind < i){
            format_arr.push(format_str.substring(s_ind, i));
        }
    }
    s_ind = 0;
    var fit_in_eles = [];
    var res = {};
    var gap_filled = true;
    for(var i = 0;i < format_arr.length;i += 1){
        var current_format_ele = format_arr[i];
        if(typeof current_format_ele === "string" || current_format_ele instanceof String){
            if(line_prefix_str.startsWith(current_format_ele, s_ind)){
                s_ind += current_format_ele.length;
                gap_filled = true;
            }else{
                gap_filled = false;
            }
        }else{
            if(gap_filled || fit_in_eles.length == 0){
                var try_fit_res = try_fit_in_types_in_prefix(line_prefix_str, s_ind, current_format_ele.ok_types);
                if(try_fit_res != undefined){
                    s_ind = try_fit_res.end_ind;
                    res[current_format_ele.name] = try_fit_res.value;
                    fit_in_eles.push(current_format_ele);
                }
            }
        }
    }
    if(s_ind != line_prefix_str.length && full_match){
        return undefined;
    }
    if(fit_in_eles.length == 0){
        return undefined;
    }
    return res;
}

function is_todo_line(line_str) {
    x = line_str.replaceAll(' ', "").replaceAll('\t', "");
    if (x.startsWith("-[]")) return 0;
    if (x.startsWith("-[x]")) return 1;
    return -1;
}

function parse_todo_line(line_str, treenode_stk, treeinfos, baseday=null){
    var todo_fl = is_todo_line(line_str);
    var item = {
        "process": 0,
        "status": "doing",
        "date_start": undefined,
        "date_end": undefined,
        "score": -1,
        "text": "",
        "children": [],
        "following_text": "",
    }
    if (todo_fl == 1) {
        item.status = "done";
    }
    var ind = line_str.indexOf('-');
    if(treenode_stk != undefined && treeinfos != undefined) {
        var tree_level = parseInt(ind / 4);
        if (tree_level > 0) {
            if(treenode_stk.length < tree_level){
                console.warn("not aligned correct!", line_str, treenode_stk, tree_level, item);//TO add it into note?
                item["warn"] = ["not aligned correct!"]
                tree_level = treenode_stk.length;
            }
            treenode_stk[tree_level - 1].children.push(item);
        } else {
            treeinfos.push(item);
        }
        while(treenode_stk.length > tree_level)treenode_stk.pop();
    }
    ind = line_str.indexOf(']') + 1;
    var txt_start_ind = ind;
    if(line_str.indexOf(':') != -1){
        var pres = my_parse_line_prefix(line_str.substring(ind, line_str.indexOf(":")).trim(), "[score:number], [date_start:mydate|mytimedur]->[date_end:mydate|mytimedur], Pr[priority:number]", true);
        if(pres != undefined){
            item.date_start = pres.date_start;
            item.date_end = pres.date_end;
            if((item.date_start == undefined || item.date_start.ele != undefined) && (item.date_end == undefined || item.date_end.ele != undefined)){
                if(baseday == null){
                    baseday = setToZeroForDate(new Date());
                }
                if(item.date_start != undefined && item.date_start.ele != undefined){
                    item.date_start = add_time_to_my_time_dur(baseday, item.date_start);
                }
                if(item.date_end != undefined && item.date_end.ele != undefined){
                    item.date_end = add_time_to_my_time_dur(baseday, item.date_end);
                }
            }
            else if((item.date_start != undefined && item.date_start.ele != undefined) || (item.date_end != undefined && item.date_end.ele != undefined)){
                if((item.date_start != undefined && item.date_start.ele != undefined && item.date_start.begin_from_base) || 
                (item.date_end != undefined && item.date_end.ele != undefined && item.date_end.begin_from_base)){
                    if(baseday == null){
                        baseday = setToZeroForDate(new Date());
                    }
                }
                if(item.date_start.ele != undefined){
                    if(item.date_start.begin_from_base){
                        item.date_start = add_time_to_my_time_dur(baseday, item.date_start)
                    }else{
                        item.date_start = add_time_to_my_time_dur(item.date_end, item.date_start);
                    }
                }
                else if(item.date_end.ele != undefined){
                    if(item.date_end.begin_from_base){
                        item.date_end = add_time_to_my_time_dur(baseday, item.date_end)
                    }else{
                        item.date_end = add_time_to_my_time_dur(item.date_start, item.date_end);
                    }
                }
            }
            item.score = pres.score;
            txt_start_ind = line_str.indexOf(":") + 1;
        }
    }
    item.text = line_str.substr(txt_start_ind).trim();
    return item;
}

function parse_todo_tree(txt, collect_non_top_line=false){
    var lines = txt.split("\n");
    var todo_line_start_ind = -1;
    var todo_line_end_ind = lines.length;
    for (var i = 0; i < lines.length; i += 1) {
        if (lines[i] == "## TODO") {
            todo_line_start_ind = i;
        } else if (todo_line_start_ind != -1 && lines[i].startsWith("## ")) {
            todo_line_end_ind = i;
        }
    }
    if (todo_line_start_ind == -1) {
        return undefined;
    }
    var treeinfos = [];
    var treenode_stk = [];
    var baseday = null;
    for (var i = todo_line_start_ind; i < todo_line_end_ind; i += 1) {
        var line = lines[i];
        var todo_fl = is_todo_line(line);
        var is_top = false;
        if (todo_fl != -1) {
            var item = parse_todo_line(line, treenode_stk, treeinfos, baseday);
            treenode_stk.push(item);
            if(treeinfos.length > 0 && item == treeinfos[treeinfos.length - 1]){
                is_top = true;
            }
        }else if(line.startsWith("BaseDay: ") && try_fit_in_types_in_prefix(line, "BaseDay: ".length, ["mydate"]) != undefined){
            baseday = try_fit_in_types_in_prefix(line, "BaseDay: ".length, ["mydate"]).value;
        }
        if(collect_non_top_line && !is_top && treeinfos.length > 0){
            treeinfos[treeinfos.length - 1].following_text += line + "\n";
        }
    }
    var root = {
        "process": 0,
        "status": "doing",
        "date_start": undefined,
        "date_end": undefined,
        "score": 100.0,
        "text": "root",
        "children": treeinfos
    }
    return root;
}

function refix_todo_format(txt){
    var lines = txt.split("\n");
    var todo_line_start_ind = -1;
    var todo_line_end_ind = lines.length;
    for (var i = 0; i < lines.length; i += 1) {
        if (lines[i] == "## TODO") {
            todo_line_start_ind = i;
        } else if (todo_line_start_ind != -1 && lines[i].startsWith("## ")) {
            todo_line_end_ind = i;
        }
    }
    if (todo_line_start_ind == -1) {
        return txt;
    }
    var treeinfos = [];
    var treenode_stk = [];
    for (var i = todo_line_start_ind; i < todo_line_end_ind; i += 1) {
        var line = lines[i];
        var todo_fl = is_todo_line(line);
        if (todo_fl != -1) {
            var item = parse_todo_line(line, treenode_stk, treeinfos, null);
            treenode_stk.push(item);
            if(item.warn != undefined && item.warn.includes("not aligned correct!")){
                var tree_level = parseInt(line.indexOf('-') / 4);
                if (tree_level > 0) {
                    if(treenode_stk.length - 1 < tree_level){
                        tree_level = treenode_stk.length;
                    }
                }
                lines[i] = "    ".repeat(tree_level) + line.substr(line.indexOf("-"))
            }
        }
    }
    return lines.join("\n");
}

if(typeof module != 'undefined'){
    module.exports = {
        is_todo_line, parse_todo_line, parse_todo_tree, mystr2date, mydate2str, refix_todo_format
    };
}