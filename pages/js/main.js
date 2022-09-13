var displayDailyCheckUID = 0;
var idSelected = -1;
var noteExtMode = "";

async function mySimpleReq(url, method, callback, data = {}) {
    var payload = {
        method: method,
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'error'
    };
    if (method == "POST" || method == "PUT") {
        payload.body = JSON.stringify(data);
    }
    await fetch(url, payload)
        .then(resp => resp.json())
        .then(x => callback(x))
        .catch((error) => {
            err_msg = error;
            if (typeof error != "string") {
                err_msg = String(error);
            }
            alert(JSON.stringify(err_msg));
            console.error(error)
        });
}

async function myCORSReq(url, method, callback, data = {}) {
    var payload = {
        method: method,
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "http://127.0.0.1:9200/",
            "Access-Control-Allow-Methods": ["GET", "POST"],
        },
        redirect: 'error'
    };
    if (method == "POST" || method == "PUT") {
        payload.body = JSON.stringify(data);
    }
    await fetch(url, payload)
        .then(resp => resp.json())
        .then(x => callback(x))
        .catch((error) => {
            err_msg = error;
            if (typeof error != "string") {
                err_msg = String(error);
            }
            alert(JSON.stringify(err_msg));
            console.error(error)
        });
}

function removeElementFromParentByDisplayID(pele, displayID) {
    for (var cid = 0; cid < pele.children.length; cid += 1) {
        var cele = pele.children[cid];
        removeElementFromParentByDisplayID(cele, displayID);
        if (cele.getAttribute("displayID") == displayID) {
            pele.removeChild(cele);
            break;
        }
    }
}

function displayDailyCheckInTable(text, dtableid, date_txt_provided, just_append=false, edit_disable=false) {
    var dtable = document.getElementById(dtableid);
    var tcaption = dtable.getElementsByTagName("caption")[0];
    tcaption.innerText = date_txt_provided;
    var tbody = dtable.getElementsByTagName("tbody")[0];
    if (just_append != true) {
        for (var i = tbody.getElementsByTagName("tr").length - 1; i >= 0; i--) {
            tbody.deleteRow(i);
        }
    }
    let root = parse_todo_tree(text);
    let items = root.children==undefined?[]:root.children;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var newtr = tbody.insertRow();
        newtr.setAttribute("displayID", displayDailyCheckUID);
        var cell1 = newtr.insertCell(0);
        var cell2 = newtr.insertCell(1);
        var cell3 = newtr.insertCell(2);
        cell1.innerText = item.text.trim();
        cell2.innerText = item.score;
        var innerttd3 = document.createElement("input");
        innerttd3.type = "checkbox";
        if (item.status == "done") innerttd3.checked = true;
        else innerttd3.checked = false;
        cell3.appendChild(innerttd3);
        if(!edit_disable){
            var cell4 = newtr.insertCell(3);
            cell4.innerText = "X";
            cell4.setAttribute("onclick", "removeElementFromParentByDisplayID(document.getElementById('" + dtableid + "')," + displayDailyCheckUID + ")");
        }else{
            innerttd3.setAttribute("disabled", "true");
        }
        displayDailyCheckUID += 1;
    }
}

function changeDailyCheckBtnStatus(mode) {
    if (mode == "view") {
        document.getElementById("dailyCheckCreate").setAttribute("style", "display: none;");
        document.getElementById("dailyCheckDelete").setAttribute("style", "");
    } else if (mode == "create") {
        document.getElementById("dailyCheckCreate").setAttribute("style", "");
        document.getElementById("dailyCheckDelete").setAttribute("style", "display: none;");
        displayDailyCheckInTable("", "dailyCheckContent", document.getElementById("dailyCheckDate").value, just_append = false);
    }
}

function myNoteTextAreaKeydown(event) {
    var notes_textarea = event.currentTarget;
    if (event.keyCode == 9) { //tab was pressed
        event.preventDefault();
        var newCaretPosition = notes_textarea.selectionStart;
        if (notes_textarea.selectionStart == notes_textarea.selectionEnd) {
            newCaretPosition += 4;
            notes_textarea.value = notes_textarea.value.substring(0, notes_textarea.selectionStart) + "    " + notes_textarea.value.substring(notes_textarea.selectionStart, notes_textarea.value.length);
        }
        else if (notes_textarea.value.substring(notes_textarea.selectionStart, notes_textarea.selectionEnd).indexOf('\n') == -1) {
            var l_s = notes_textarea.value.substring(0, notes_textarea.selectionStart);
            var r_s = notes_textarea.value.substring(notes_textarea.selectionEnd);
            notes_textarea.value = l_s + "    " + r_s;
            newCaretPosition += 4;
        }
        else {
            var l_ind = notes_textarea.value.lastIndexOf("\n", notes_textarea.selectionStart);
            if (l_ind == -1) {
                l_ind = 0;
            }
            var r_ind = notes_textarea.value.indexOf("\n", notes_textarea.selectionEnd);
            if (r_ind == -1) {
                r_ind = notes_textarea.value.length;
            }
            var l_s = notes_textarea.value.substring(0, l_ind);
            var c_s = notes_textarea.value.substring(l_ind, r_ind);
            if (event.shiftKey) {
                c_s = c_s.replaceAll("\n    ", "\n");
            } else {
                c_s = c_s.replaceAll("\n", "\n    ");
            }
            var r_s = notes_textarea.value.substring(r_ind, notes_textarea.value.length);
            notes_textarea.value = l_s + c_s + r_s;
            newCaretPosition = l_s.length + c_s.length;
        }
        notes_textarea.selectionStart = notes_textarea.selectionEnd = newCaretPosition;
    }
    else if (event.ctrlKey || event.metaKey) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
            case 's':
                event.preventDefault();
                saveNoteEx();
                break;
            case 'f':
                event.preventDefault();
                alert('ctrl-f');
                break;
            case 'g':
                event.preventDefault();
                alert('ctrl-g');
                break;
        }
    }
}

function getOrCreateDailyCheck(date_txt_provided){
    return new Promise((resolve, reject) => {
        mySimpleReq("/scheduler/backend/dailycheck/" + date_txt_provided, "GET", 
            (resp) => {
                if (resp == undefined || resp.error != undefined || resp.action == "error") {
                    reject(resp);
                } else if(resp.data == undefined || resp.data.id == undefined){
                    resolve(undefined);
                }else{
                    resolve(resp.data);
                }
            });
    }).then((resp_data)=>{
        if(resp_data == undefined){
            return new Promise((resolve, reject) => 
                mySimpleReq("/scheduler/backend/dailycheck/" + date_txt_provided, "POST", 
                (resp) => {
                    if (resp == undefined || resp.error != undefined || resp.action == "error") {
                        reject(resp);
                    } else {
                        scheduler._loading = true;
                        scheduler.addEvent(resp.item);
                        scheduler._loading = false;
                        resolve(resp.data);
                    }
            })).then((resp_data1) => {return resp_data1;});
        }else{
            return resp_data;
        }
    });
}

function queryDailyCheck() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/dailycheck/" + date_txt_provided, "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } else if (resp.data == undefined) {
            changeDailyCheckBtnStatus("create");
        } else {
            changeDailyCheckBtnStatus("view");
            displayDailyCheckInTable(resp.data.content, "dailyCheckContent", date_txt_provided, just_append=false, edit_disable=true);
        }
    });
}

function createDailyCheck() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/dailycheck/" + date_txt_provided, "POST", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
            changeDailyCheckBtnStatus("create");
        } else {
            changeDailyCheckBtnStatus("view");
            displayDailyCheckInTable(resp.data.content, "dailyCheckContent", date_txt_provided, just_append=false, edit_disable=true);
            if(noteExtMode == "dailycheck"){
                showNoteEx();
            }
        }
    });
}

function deleteDailyCheck() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    } else {
        mySimpleReq("/scheduler/backend/dailycheck/" + date_txt_provided, "DELETE", (respText) => {
            alert(respText);
            changeDailyCheckBtnStatus("create");
            if(noteExtMode == "dailycheck"){
                clearNote();
            }
        });
    }
}

function simpleCreateCheck(date_txt_provided, mode_str){
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/" + mode_str + "/" + date_txt_provided, "POST", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        }
    });

}

function queryMonthPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/monthplan/" + date_txt_provided, "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } 
         else {

        }
    });
}

function createMonthPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/monthplan/" + date_txt_provided, "POST", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } 
        else if(noteExtMode == "monthplan"){
            showNoteEx();
        }
    });
}

function deleteMonthPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    } else {
        mySimpleReq("/scheduler/backend/monthplan/" + date_txt_provided, "DELETE", (respText) => {
            alert(respText);
            if(noteExtMode == "monthplan"){
                clearNote();
            }
        });
    }
}

function queryWeekPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/weekplan/" + date_txt_provided, "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } 
         else {

        }
    });
}

function createWeekPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    }
    mySimpleReq("/scheduler/backend/weekplan/" + date_txt_provided, "POST", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } 
        else if(noteExtMode == "weekplan"){
            showNoteEx();
        }
    });
}

function deleteWeekPlan() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    } else {
        mySimpleReq("/scheduler/backend/weekplan/" + date_txt_provided, "DELETE", (respText) => {
            alert(respText);
            if(noteExtMode == "weekplan"){
                clearNote();
            }
        });
    }
}

function openNoteTabInNormalMode(){
    setNoteID(idSelected, "");
    $("a[href='#notes_tab']").tab("show");
}

function openNoteExTab(mode_str){
    if(mode_str != "monthplan" && mode_str != "weekplan" && mode_str != "dailycheck"){
        alert("unknown noteex mode!" + mode_str);
    }
    setNoteID(-1, mode_str);
    $("a[href='#notes_tab']").tab("show");
    showNoteEx();
}

function openOrCloseNav(navid) {
    if(document.getElementById(navid).offsetWidth >= 1){
        document.getElementById(navid).style.width = "0";
        if(navid == "mySidenav"){
            document.getElementById("myTabContent").style.paddingLeft = "0";
        }
        if(navid == "myNoticenav"){
            document.getElementById("myTabContent").style.paddingRight = "0";
        }
    }else{
        document.getElementById(navid).style.width = "200px";
        if(navid == "mySidenav"){
            document.getElementById("myTabContent").style.paddingLeft = "200px";
        }
        if(navid == "myNoticenav"){
            document.getElementById("myTabContent").style.paddingRight = "200px";
        }
    }
}

function changeNoteBtnStatus(op) {
    if (op == "EditMode") {
        document.getElementById("newNoteBtn").setAttribute("style", "display: none;");
        document.getElementById("saveNoteBtn").setAttribute("style", "");
        document.getElementById("editNoteBtn").setAttribute("style", "");
        document.getElementById("deleteNoteBtn").setAttribute("style", "display: none;");
        document.getElementById("editNoteBtn").innerText = "EndEdit";
        document.getElementById("notes_content").removeAttribute("readonly");
        document.getElementById("notes_title").removeAttribute("readonly");
    } else if (op == "ReadMode") {
        document.getElementById("newNoteBtn").setAttribute("style", "");
        document.getElementById("saveNoteBtn").setAttribute("style", "display: none;");
        document.getElementById("editNoteBtn").setAttribute("style", "");
        document.getElementById("deleteNoteBtn").setAttribute("style", "");
        document.getElementById("editNoteBtn").innerText = "Edit";
        document.getElementById("notes_content").setAttribute("readonly", "true");
        document.getElementById("notes_title").setAttribute("readonly", "true");
    } else if (op == "CreateMode") {
        setNoteID(-1, noteExtMode);
        document.getElementById("newNoteBtn").setAttribute("style", "");
        document.getElementById("saveNoteBtn").setAttribute("style", "");
        document.getElementById("editNoteBtn").setAttribute("style", "display: none;");
        document.getElementById("deleteNoteBtn").setAttribute("style", "display: none;");
        document.getElementById("editNoteBtn").innerText = "Edit";
        document.getElementById("notes_content").removeAttribute("readonly");
        document.getElementById("notes_title").removeAttribute("readonly");
    } else {
        alert("Unknown OP in changeNoteBtnStatus");
    }
    if(noteExtMode != ""){
        document.getElementById("notes_ispinned_label").setAttribute("style", "display: none;");
        document.getElementById("notes_ispinned").setAttribute("style", "display: none;");
    }
    else{    
        document.getElementById("notes_ispinned_label").setAttribute("style", "");
        document.getElementById("notes_ispinned").setAttribute("style", "");
    }
}

function clearNote(){
    document.getElementById("notes_content").value = "";
    document.getElementById("notes_title").value = "";
    changeNoteBtnStatus("CreateMode");
}

function getIdentity4NoteEx(){
    if(noteExtMode == ""){
        if(idSelected != -1){
            return idSelected;
        }
        return undefined;
    }else{
        if(document.getElementById("dailyCheckDate").value.length > 0){
            return document.getElementById("dailyCheckDate").value;
        }
        return undefined;
    }
}

function newNoteEx(){
    clearNote();
    if(getIdentity4NoteEx() != undefined){
        if(noteExtMode == "monthplan"){
            createMonthPlan();
        }else if(noteExtMode == "weekplan"){
            createWeekPlan();
        }else if(noteExtMode == "dailycheck"){
            createDailyCheck();
        }
    }
}

function saveNote() {
    var is_pinned = document.getElementById("notes_ispinned").checked;
    var is_proj_note = document.getElementById("notes_title").value.startsWith("Proj: ");
    var data_content = document.getElementById("notes_content").value;
    if(is_proj_note){
        data_content = refix_todo_format(data_content);
        document.getElementById("notes_content").value = data_content;
    }
    var data = {
        "title": document.getElementById("notes_title").value,
        "content": data_content,
        "is_pinned": is_pinned,
        "is_proj_note": is_proj_note
    };
    var callbackfn = function (resp) {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } else {
            if (idSelected == -1) {
                idSelected = resp.tid;
                if (document.getElementById("notes_ispinned").checked) {
                    var tmpa = document.createElement("a");
                    tmpa.innerText = document.getElementById("notes_title").value;
                    tmpa.setAttribute("href", "javascript:void(0)");
                    tmpa.setAttribute("onclick", "showNote(" + resp.tid + ")");
                    document.getElementById("myNotesToggleGroup").appendChild(tmpa);
                }
            }
            alert(JSON.stringify(resp));
            if (is_proj_note) {
                document.getElementById("projNoteTreeContainer").setAttribute("style", "");
                visProjTODO(data_content);
            } else {
                document.getElementById("projNoteTreeContainer").setAttribute("style", "display:none;");
            }
        }
    }
    if (idSelected == -1) {
        mySimpleReq("/scheduler/backend/notes/", "POST", (resp) => callbackfn(resp), data = data);
    } else {
        mySimpleReq("/scheduler/backend/notes/" + idSelected, "PUT", (resp) => callbackfn(resp), data = data);
    }
}

function getDateTxtProvidedFromNotesTitle(){
    let title = document.getElementById("notes_title").value;
    if(!title.startsWith(noteExtMode + "_")){
        alert("unexcepted note title for mode" + noteExtMode);
        return;
    }
    date_txt_provided = title.substr(noteExtMode.length + 1);
    return date_txt_provided;
}

function saveNoteEx(){
    if(noteExtMode == ""){
        return saveNote();
    }
    else if(noteExtMode == "dailycheck" || noteExtMode == "weekplan" || noteExtMode == "monthplan"){
        let date_txt_provided = getDateTxtProvidedFromNotesTitle();
        if(date_txt_provided != undefined){
            var data_content = document.getElementById("notes_content").value;
            mySimpleReq("/scheduler/backend/" + noteExtMode + "/" + date_txt_provided, "POST", (resp) => {
                alert(JSON.stringify(resp));
                if(noteExtMode == 'dailycheck'){
                    if (resp.data == undefined) {
                        changeDailyCheckBtnStatus("create");
                    } else {
                        changeDailyCheckBtnStatus("view");
                        displayDailyCheckInTable(resp.data.content, "dailyCheckContent", date_txt_provided, just_append=false, edit_disable=true);
                    }
                }
            }, data = {"text": data_content});
        }
    }
    else{
        alert("unknown mode!");
    }
}

function deleteNoteEx(){
    if(noteExtMode == ""){
        return deleteNote();
    }
    else if(noteExtMode == "dailycheck"){
        return deleteDailyCheck();
    }
    else if(noteExtMode == "weekplan"){
        return deleteWeekPlan();
    }
    else if(noteExtMode == "monthplan"){
        return deleteMonthPlan();
    }
}

function setNoteID(idSelected_, noteExtMode_){
    if(noteExtMode != noteExtMode_){
        if(noteExtMode_ != "" && noteExtMode_ != "monthplan"  && noteExtMode_ != "weekplan" && noteExtMode_ != "dailycheck"){
            alert("unknown noteExtMode " + noteExtMode_);
            noteExtMode_ = "";
        }
        noteExtMode = noteExtMode_;
        clearNote();
        $("#noteExtModeInput").val(noteExtMode);
    }
    if(idSelected != idSelected_){
        idSelected = idSelected_;
        $("#idSelectedInput").val(idSelected);
        if(idSelected == -1){
            clearNote();
        }
    }
}

function showNoteTitles() {
    mySimpleReq("/scheduler/backend/notes_titles/", "GET", (resp) => {
        var rows = resp.data;
        var myNotesToggleGroupEle = document.getElementById("myNotesToggleGroup");
        myNotesToggleGroupEle.innerHTML = "";
        for (var i = 0; i < rows.length; i++) {
            var tmpa = document.createElement("a");
            tmpa.setAttribute("href", "javascript:void(0)");
            tmpa.innerText = rows[i].title;
            tmpa.setAttribute("onclick", "showNote(" + rows[i].id + ")");
            myNotesToggleGroupEle.appendChild(tmpa);
        }
    });
}

function calProcess4visProjTODO(item, fa_item) {
    if (fa_item != undefined){
        if (item.date_start == undefined) {
            item.date_start = fa_item.date_start;
        }
        if (item.date_end == undefined) {
            item.date_end = fa_item.date_end;
        }
    }
    if (item.date_end != undefined && item.status == "doing" && item.date_end < new Date()) {
        item.status = "failed";
    }
    if (item.date_start != undefined && item.status == "doing" && item.date_start > new Date()) {
        item.status = "waiting";
    }
    if (item.children.length > 0) {
        var lastscore = 100.0;
        var process_now = 0.0;
        var score_undefined_children = [];
        var all_failed = true;
        for (var i = 0; i < item.children.length; i += 1) {
            var child = item.children[i];
            calProcess4visProjTODO(child, item);
            if (child.score < -0.09 || child.score > 100.0) {
                score_undefined_children.push(child);
            } else {
                lastscore -= child.score;
                process_now += child.score * child.process / 100.0;
            }
            if (child.status != "failed") {
                all_failed = false;
            }
        }
        if (score_undefined_children.length > 0) {
            var avg_score = lastscore / score_undefined_children.length;
            for (var j = 0; j < score_undefined_children.length; j += 1) {
                var child = score_undefined_children[j];
                child.score = avg_score;
                process_now += child.score * child.process / 100.0;
            }
        }
        if (all_failed && item.status == "doing") item.status = "failed";
        item.process = process_now;
    }
    if (item.status == "done") {
        item.process = 100.0;
    } else if (item.status == "failed") {
        item.process = 0.0;
    }
    if (item.process > 99.0) {
        item.status = "done";
    }

}

function visProjTODO(txt) {
    var root = parse_todo_tree(txt);
    var canvas_element = document.getElementById("projNoteTreeCanvas");
    if(root == undefined || root.children == undefined || root.children.length == 0){
        canvas_element.innerHTML = "";
    }else{
        calProcess4visProjTODO(root, root);
        displaySimpleTrees([root], canvas_element);
    }
}

function showNote(id) {
    if (id == -1) {
        alert("Please select a ok id!");
        return;
    }
    setNoteID(id, "");
    $("a[href='#notes_tab']").tab("show");
    mySimpleReq("/scheduler/backend/notes/" + id, "GET", (resp) => {
        var data = resp.data;
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } else {
            document.getElementById("notes_title").value = data.title;
            document.getElementById("notes_content").value = data.content;
            document.getElementById("notes_ispinned").checked = data.is_pinned == "true";
            if (data.is_proj_note == "true") {
                document.getElementById("projNoteTreeContainer").setAttribute("style", "");
                visProjTODO(data.content);
            } else {
                document.getElementById("projNoteTreeContainer").setAttribute("style", "display:none;");
                visProjTODO("");
            }
            changeNoteBtnStatus("ReadMode");
        }
    });
}

function showNoteEx(){
    if(noteExtMode == ""){
        if(idSelected != -1){
            showNote(idSelected);
        }else{
            clearNote();
        }
    }
    else if(noteExtMode == "dailycheck" || noteExtMode == "weekplan" || noteExtMode == "monthplan"){
        if(getIdentity4NoteEx() != undefined){
            var date_txt_provided = getIdentity4NoteEx();
            mySimpleReq("/scheduler/backend/" + noteExtMode + "/" + date_txt_provided, "GET", (resp) => {
                var data = resp.data;
                if (resp == undefined || resp.error != undefined || resp.action == "error") {
                    alert(JSON.stringify(resp));
                } 
                else if(data == undefined){
                    alert(noteExtMode + "_" + date_txt_provided + " does not exist!");
                }
                else {
                    document.getElementById("notes_title").value = data.title;
                    document.getElementById("notes_content").value = data.content;
                    changeNoteBtnStatus("ReadMode");
                    if(noteExtMode == "dailycheck"){
                        displayDailyCheckInTable(data.content, "dailyCheckContent", document.getElementById("dailyCheckDate").value, just_append=false, edit_disable=true);
                    }
                }
            });
        }else{
            clearNote();
        }
    }

}

function dailyCheckDateChange(event){
    if(noteExtMode != ""){
        showNoteEx();
    }
}

function editNoteEx() {
    if (document.getElementById("notes_content").getAttribute("readonly") == "true") {
        if (getIdentity4NoteEx() == undefined) changeNoteBtnStatus("CreateMode");
        else changeNoteBtnStatus("EditMode");
    } else {
        changeNoteBtnStatus("ReadMode");
    }
}

function deleteNote() {
    if (idSelected == -1) {
        alert("Please select a ok id!");
    } else {
        mySimpleReq("/scheduler/backend/notes/" + idSelected, "DELETE", (resp) => { alert(JSON.stringify(resp)); });
    }
}

function loadExpenses() {
    var date_txt_provided = document.getElementById("dailyCheckDate").value;
    if (date_txt_provided.length == 0) {
        alert("Please select a date!");
        return;
    } else {
        mySimpleReq("/scheduler/backend/expenses/" + date_txt_provided, "GET", (data) => {
            if (data.error != undefined || data.action == "error") {
                alert("Something wrong!", JSON.stringify(data));
            } else {            
                scheduler.load("/scheduler/backend/events", function(){alert("OK.");});
            }
        });
    }
}

function displayNotice(data) {
    var myNoticeListEle = document.getElementById("myNoticeList");
    var tmpli = document.createElement("li");
    tmpli.className = 'list-group-item';
    if (data.info_level == "info") {
        tmpli.className = 'list-group-item list-group-item-info';
    } else if (data.info_level == "success") {
        tmpli.className = 'list-group-item list-group-item-success';
    } else if (data.info_level == "warn") {
        tmpli.className = 'list-group-item list-group-item-warning';
    } else if (data.info_level == "danger") {
        tmpli.className = 'list-group-item list-group-item-danger';
    }
    tmpli.innerText = data.text;
    myNoticeListEle.insertBefore(tmpli, myNoticeListEle.firstChild);
}

function createNotice() {
    var notice_txt_provided = document.getElementById("noticeCreateTextArea").value.trim();
    var notice_level = "info";
    var notice_date_show = new Date();
    var notice_date_hide = new Date(notice_date_show.valueOf() + 7 * 24 * 3600 * 1000);
    var colon_pos = notice_txt_provided.indexOf(":");
    
    if(colon_pos != -1){
        var pres = my_parse_line_prefix(line_str.substring(0, colon_pos).trim(), "[level:namestr]-[date_show:mydate|mytimedur]->[date_hide:mydate|mytimedur]", true);
        if(pres != undefined){
            notice_date_show = pres.date_show;
            notice_date_hide = pres.date_hide;
            notice_level = pres.level;
            notice_txt_provided = notice_txt_provided.substr(colon_pos).trim();
        }
    }
    if (notice_txt_provided.length == 0) {
        alert("Please input sth4notice!");
        return;
    }
    var data = {
        "date_show": mydate2str(notice_date_show),
        "date_hide": mydate2str(notice_date_hide),
        "info_level": notice_level,
        "text": notice_txt_provided,
    };
    var callbackfn = function (resp) {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } else {
            data.id = resp.tid;
            document.getElementById("noticeCreateTextArea").value = "";
            displayNotice(data);
        }
    }
    mySimpleReq("/scheduler/backend/notices/", "POST", (resp) => callbackfn(resp), data = data);
}

function loadNotices() {
    mySimpleReq("/scheduler/backend/notices/?date_show=beforenow&&date_hide=afternow", "GET", (resp) => {
        var rows = resp.data;
        var myNoticeListEle = document.getElementById("myNoticeList");
        myNoticeListEle.innerHTML = "";
        for (var i = 0; i < rows.length; i++) {
            displayNotice(rows[i]);
        }
    });
}

function isLegalEventID(id){
    return id > 0 && String(id).indexOf("#") == -1;
}

function getCurrentTaskSlides(evs, tnow, only_plan=false){
    var stack = [];
    var dummy_stack = [];
    var non_dummy_dt = {};
    if(!tnow)tnow = Date.now();
	for (var id in evs){
        var ev = evs[id];
        if(ev.start_date <= tnow && ev.end_date >= tnow){
            if(only_plan && ev.etype != "PLAN")continue;
            if(isLegalEventID(id)){
                stack.push(ev);
                if(ev.event_pid){
                    non_dummy_dt[ev.event_pid + "#" + ev.event_length] = 1;
                }
            }
            else dummy_stack.push(ev);
        }
    }
    for(var i in dummy_stack){
        var ev = dummy_stack[i];
        if(non_dummy_dt[ev.id] == undefined)stack.push(ev);
    }
	return stack;
}

function getAccordingEventInSchedulerCache(eid){
    if(!eid || eid < 0 || String(eid).indexOf("#") != -1){
        return null;
    }
    eid = parseInt(eid);
    if(scheduler._events[eid] != undefined)return scheduler._events[eid];
    return null;
}

function writeDetailsInBothSchedulerCacheAndDB(eid, details, callback){
    var cache = getAccordingEventInSchedulerCache(eid);
    if(cache != null){
        cache.details = details;
    }
    mySimpleReq("/scheduler/backend/events_details/", "POST", function (resp) {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert(JSON.stringify(resp));
        } else if(resp.data != undefined && resp.data.id != undefined) {
            if(callback != undefined){
                callback();
            }
        }
    }, data={id:eid, details:details});
}
