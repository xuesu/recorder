function mystr2date(s) {
    if (s.length < 6 || s.length > 12) return undefined;
    for (var i = 0; i < s.length; i += 1) {
        if (s[i] > '9' || s[i] < '0') return undefined;
    }
    var res_date = new Date();
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

function is_todo_line(line_str) {
    x = line_str.replaceAll(' ', "").replaceAll('\t', "");
    if (x.startsWith("-[]")) return 0;
    if (x.startsWith("-[x]")) return 1;
    return -1;
}

function parse_todo_line(line_str, treenode_stk, treeinfos){
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
            treenode_stk[tree_level - 1].children.push(item);
        } else {
            treeinfos.push(item);
        }
        treenode_stk = treenode_stk.slice(0, tree_level);
    }
    ind = line_str.indexOf(']') + 1;
    var start_ind = ind;
    var txt_start_ind = ind;
    for (; ind < line_str.length; ind++) {
        if (line_str[ind] >= '0' && line_str[ind] <= '9') {
            if (start_ind == -1) {
                start_ind = ind;
            }
        }
        else {
            if (line_str[ind] == ' ') {
                continue;
            }
            else if (start_ind != -1) {
                if (line_str[ind] == ',' && item.score == -1) {
                    item.score = parseInt(line_str.substring(start_ind, ind));
                    txt_start_ind = ind + 1;
                }
                else if (line_str[ind] == '-' && ind + 1 < line_str.length && line_str[ind + 1] == '>') {
                    item.date_start = mystr2date(line_str.substring(start_ind, ind));
                    txt_start_ind = ind + 2;
                    ind += 1;
                }
                else if (line_str[ind] == ':') {
                    item.date_end = mystr2date(line_str.substring(start_ind, ind));
                    if(item.date_end == undefined){
                        item.score = parseInt(line_str.substring(start_ind, ind));
                    }
                    txt_start_ind = ind + 1;
                    break;
                }
            }
            else {
                if (line_str[ind] == ':') {
                    ind += 1;
                }
                break;
            }
            start_ind = -1;
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
    for (var i = todo_line_start_ind; i < todo_line_end_ind; i += 1) {
        var line = lines[i];
        var todo_fl = is_todo_line(line);
        var is_top = false;
        if (todo_fl != -1) {
            var item = parse_todo_line(line, treenode_stk, treeinfos);
            treenode_stk.push(item);
            if(treeinfos.length > 0 && item == treeinfos[treeinfos.length - 1]){
                is_top = true;
            }
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

if(typeof module != 'undefined'){
    module.exports = {
        is_todo_line, parse_todo_line, parse_todo_tree, mystr2date, mydate2str
    };
}