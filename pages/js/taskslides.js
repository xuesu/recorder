function getDetailsInBothSchedulerCacheAndDB(eid, log_lines){
    var tmp_details = getAccordingEventInSchedulerCache(eid);
    var detailsLines = tmp_details.details != undefined && tmp_details.details.length > 0 ?tmp_details.details.split("\n"):[];
    var detailsTitleLineID = -1;
    var insertedTitleLineID = detailsLines.length;
    for(var i in detailsLines){
        if(detailsTitleLineID == -1){
            if(detailsLines[i] == "## TaskLog"){
                detailsTitleLineID = i;
            }
        }else{
            if(detailsLines[i].startsWith("## ") || detailsLines[i].startsWith("# ")){
                insertedTitleLineID = i;
                break;
            }
        }
    }
    if(detailsTitleLineID == -1){
        detailsLines.push("## TaskLog");
        detailsLines = detailsLines.concat(log_lines);
    }else{
        detailsLines = detailsLines.slice(0, insertedTitleLineID).concat(log_lines).concat(detailsLines.slice(insertedTitleLineID));
    }
    return detailsLines.join('\n');
}

var taskSlidesModel = {
    isCountDown: false,
    aimTimeCountDown: ko.observable(Date.now()),
    showedTimeCountDown: ko.observable(Date.now()),
    selectedTaskID: ko.observable(-1),
    lastAssuredTaskID: -1,
    isSelectingAssured: false,
    EMPTY: -1,
    WHITE_NOISE: -2,
    COUNTDOWN_DURATION: 60000,
    countDownInterval: null,
    taskSlides: ko.observableArray([]),
    taskSlidesRefreshInterval: null,
    isWarning: ko.observable(false),
    isSelecting: ko.observable(0),
    EMPTY_TASK: {
        "id": -1,
        "is_finished": false,
        "start_date": new Date(0),
        "end_date": new Date(1621846800000),
        "etype": "FACT",
        "event_length": "",
        "event_pid": "",
        "rec_pattern": "",
        "rec_type": "",
        "text": "EMPTY",
        "_timed": true
    },
    WHITE_NOISE_TASK: {
        "id": -2,
        "is_finished": false,
        "start_date": new Date(0),
        "end_date": new Date(1621846800000),
        "etype": "SPENT",
        "event_length": "",
        "event_pid": "",
        "rec_pattern": "",
        "rec_type": "",
        "text": "WHITE_NOISE",
        "_timed": true
    },
    taskLogLines: [],
    taskLogAutoSaveDuration: 3600 * 1000,
    taskLogSwitchReason: ko.observable(""),
    addLog: function(emitTaskID, text){
        this.taskLogLines.push({"emitTime": Date.now(), "emitTaskID": emitTaskID, "text": text});
        if(this.taskLogLines.length > 0 && (Date.now() - this.taskLogLines[0].emitTime) >= this.taskLogAutoSaveDuration){
            this.trySaveLog();
        }
    },
    trySaveLog: function(forced){
        if(!forced && this.taskLogLines.length == 0)return;
        var changed_eid2append_lines = {};
        var changed_date2append_lines = {};
        changed_date2append_lines[getCurrentDateStr()] = [];
        var currentTaskID = this.selectedTaskID();
        var currentLineNum = this.taskLogLines.length;
        for(var i = 0;i < currentLineNum;i+=1){
            var line = this.taskLogLines[i];
            var linecontent = getCurrentDateStr(new Date(line.emitTime), true) + " " + line.text;
            if(line.emitTaskID >= 0 && getAccordingEventInSchedulerCache(line.emitTaskID).details != undefined){
                if(changed_eid2append_lines[line.emitTaskID] != undefined){
                    changed_eid2append_lines[line.emitTaskID].push(linecontent);
                }else{
                    changed_eid2append_lines[line.emitTaskID] = [linecontent];
                }
            }
            var date_str = getCurrentDateStr(new Date(line.emitTime), false);
            if(changed_date2append_lines[date_str] != undefined){
                changed_date2append_lines[date_str].push(linecontent);
            }else{
                changed_date2append_lines[date_str] = [linecontent];
            }
        }
        var tmppromises = [];
        for(var changed_date in changed_date2append_lines){
            tmppromises.push(getOrCreateDailyCheck(changed_date));
        }
        this.taskLogLines = this.taskLogLines.slice(currentLineNum);
        Promise.all(tmppromises).then((resp_data_arr) => {
            for(var i in resp_data_arr){
                var eid = resp_data_arr[i].id;
                if(!resp_data_arr[i].title.startsWith("dailycheck_")){
                    throw "Get task from getOrCreateDailyCheck with !task.title.startswith(dailycheck_)";
                }
                var date_str = resp_data_arr[i].title.substr("dailycheck_".length);
                var lines = changed_date2append_lines[date_str];
                if(changed_eid2append_lines[eid] != undefined){
                    changed_eid2append_lines[eid] = changed_eid2append_lines[eid].concat(lines);
                }else{
                    changed_eid2append_lines[eid] = lines;
                }
            }
            var changed_eid2details = {};
            for(var eid in changed_eid2append_lines){
                changed_eid2details[eid] = getDetailsInBothSchedulerCacheAndDB(eid, changed_eid2append_lines[eid]);
            }
            if(currentTaskID >= 0 && getAccordingEventInSchedulerCache(currentTaskID).details != undefined && changed_eid2append_lines[currentTaskID] == undefined){
                changed_eid2details[currentTaskID] = getAccordingEventInSchedulerCache(currentTaskID).details;
            }
            for(var eid in changed_eid2details){
                writeDetailsInBothSchedulerCacheAndDB(eid, changed_eid2details[eid]);
            }
        });
    },
    assureCurrentSelected: function(taskID){
        this.stopCountDown();
        this.isWarning(false);
        this.isSelectingAssured = true;
        var oldTaskID = this.lastAssuredTaskID;
        if(taskID == undefined){
            taskID = this.selectedTaskID();
        }        
        if(taskID != oldTaskID){
            var stringbuilder = [];
            var emitTaskID = taskID;
            if(!isLegalEventID(taskID) && isLegalEventID(oldTaskID)){
                emitTaskID = oldTaskID;
            }
            stringbuilder.push("Switch from ");
            stringbuilder.push("T");
            stringbuilder.push(oldTaskID);
            if(isLegalEventID(oldTaskID)){
                stringbuilder.push("(");
                stringbuilder.push(getAccordingEventInSchedulerCache(oldTaskID).text);
                stringbuilder.push(")");
            }
            stringbuilder.push(" to ");
            stringbuilder.push("T");
            stringbuilder.push(taskID);
            if(isLegalEventID(taskID)){
                stringbuilder.push("(");
                stringbuilder.push(getAccordingEventInSchedulerCache(taskID).text);
                stringbuilder.push(")");
            }
            if(this.taskLogSwitchReason().length > 0){
                stringbuilder.push(" since ");
                stringbuilder.push(this.taskLogSwitchReason());
                this.taskLogSwitchReason("");
            }
            stringbuilder.push(".");
            this.addLog(emitTaskID, stringbuilder.join(""));
            this.trySaveLog(true);
        }
        this.lastAssuredTaskID = taskID;
        this.selectedTaskID(taskID);
    },
    refreshTaskSlidesRefresh: function(){
        var oldTaskID = this.selectedTaskID();
        var currentTaskSlides = getCurrentTaskSlides(scheduler.get_visible_events(), null, true);
        currentTaskSlides.push(this.WHITE_NOISE_TASK);
        var id2newTask = {};
        for(var i = 0;i < currentTaskSlides.length;i+=1){
            var taskNow = currentTaskSlides[i];
            if(taskNow.is_finished){
                if(taskNow.id == oldTaskID){
                    var stringbuilder = ["Finished "];
                    stringbuilder.push("T");
                    stringbuilder.push(oldTaskID);
                    if(isLegalEventID(oldTaskID)){
                        stringbuilder.push("(");
                        stringbuilder.push(getAccordingEventInSchedulerCache(oldTaskID).text);
                        stringbuilder.push(")");
                    }
                    stringbuilder.push(".");
                    this.addLog(oldTaskID, stringbuilder.join(""));
                }
                continue;
            }
            id2newTask[taskNow.id] = taskNow;
        }
        var found = false;
        var taskSlidesCp =  [...this.taskSlides()];
        for(var i = 0;i < taskSlidesCp.length;i+=1){
            var taskNow = taskSlidesCp[i];
            if(id2newTask[taskNow.id] == undefined){
                this.taskSlides.remove((x)=>x.id == taskNow.id);
            }else{
                this.taskSlides.replace(taskNow, id2newTask[taskNow.id]);
                if(taskNow.id == oldTaskID)found = true;
                id2newTask[taskNow.id] = undefined;
            }
        }
        for(var i = 0;i < currentTaskSlides.length;i+=1){
            var taskNow = currentTaskSlides[i];
            if(id2newTask[taskNow.id] != undefined){
                this.taskSlides().push(taskNow);
            }
        }
        this.taskSlides().sort(function (left, right) {
            var lscore = left.score == undefined?0: left.score;
            var rscore = right.score == undefined?0: right.score;
            if(lscore != rscore) return lscore < rscore ? 1 : -1;
            var lid = left._timed?left.event_pid:left.id;
            var rid = right._timed?right.event_pid:right.id;
            return lid===rid?0:(lid < rid ? 1 : -1);
        });
        if(this.taskSlides().length > 0){
            if(!found || this.selectedTaskID() == -1)this.assureCurrentSelected(this.taskSlides()[0].id);
        }
        else if(!found){
            this.assureCurrentSelected(-1);
        }
    },
    startTaskSlidesRefresh: function(){
        if(this.taskSlidesRefreshInterval != null){
            this.stopTaskSlidesRefresh();
        }
        this.refreshTaskSlidesRefresh();
        this.taskSlidesRefreshInterval = setInterval(() => {
            this.refreshTaskSlidesRefresh();
        }, 300000);
    },
    stopTaskSlidesRefresh: function(){
        if(this.taskSlidesRefreshInterval != null){
            clearInterval(this.taskSlidesRefreshInterval);
            this.taskSlidesRefreshInterval = null;
        }
    },
    startCountDown: function(){
        this.showedTimeCountDown(Date.now());
        this.aimTimeCountDown(new Date(Date.now() + this.COUNTDOWN_DURATION));
        if(!this.isCountDown){
            if(this.countDownInterval == null){
                this.countDownInterval = setInterval(() => {
                    this.showedTimeCountDown(Date.now());
                    if(this.showedTimeCountDown() >= this.aimTimeCountDown()){
                        if(!this.isSelectingAssured)this.assureCurrentSelected();
                        this.stopCountDown();
                    }
                }, 1000);
            }
            this.isCountDown = true;
        }
    },
    stopCountDown: function(){
        if(this.isCountDown){
            if(this.countDownInterval != null){
                clearInterval(this.countDownInterval);
                this.countDownInterval = null;
            }
            this.isCountDown = false;
        }
    },
    changeCurrentTaskSelectedInSlides: function(v){
        if(this.taskSlides().length == 0)return;
        var currentID = -1;
        for(var i = 0;i < this.taskSlides().length;i+=1){
            if(this.selectedTaskID() == this.taskSlides()[i].id){
                currentID = i;
                break;
            }
        }
        var finalID = 0;
        var taskSlidesCp = [...this.taskSlides()];
        if(currentID != -1){
            finalID = (v + currentID + taskSlidesCp.length) % taskSlidesCp.length;

        }else{
            finalID = (v + taskSlidesCp.length) % taskSlidesCp.length;
        }
        this.startCountDown();
        if(this.taskLogSwitchReason().length == 0){
            this.isWarning(true);
        }
        this.isSelectingAssured = false;
        this.selectedTaskID(taskSlidesCp[finalID].id);
    }
};

taskSlidesModel.countDownV = ko.pureComputed(function(){
    if(this.showedTimeCountDown() >= this.aimTimeCountDown())return "00:00";
    let difT = this.aimTimeCountDown() - this.showedTimeCountDown();
    return String(Math.floor(difT % 3600000 / 60000)).padStart(2, '0') + ":" + String(Math.floor(difT % 60000 / 1000)).padStart(2, '0');
}, taskSlidesModel);

taskSlidesModel.selectedTask = ko.computed(function(){
    if(this.selectedTaskID() == -1){
        return this.EMPTY_TASK;
    }else if(this.selectedTaskID() == -2){
        return this.WHITE_NOISE_TASK;
    }
    var currentTaskSlides = getCurrentTaskSlides(scheduler.get_visible_events(), null, true);
    var sTask = undefined;
    for(var i = 0;i < currentTaskSlides.length;i+=1){
        if(currentTaskSlides[i].id == this.selectedTaskID()){
            sTask = currentTaskSlides[i];
            break;
        }
    }
    if(String(this.selectedTaskID()).indexOf("#") != -1){
        mySimpleReq("/scheduler/backend/events/", "POST", function(resp){
            if (resp == undefined || resp.error != undefined || resp.action == "error") {
                alert(JSON.stringify(resp));
            }else{
                scheduler._loading = true;
                var oldid = taskSlidesModel.selectedTaskID();
                scheduler.addEvent(resp.item);
                if(oldid == resp.item.event_pid + "#" + resp.item.event_length){
                    scheduler.deleteEvent(oldid);
                }
                scheduler._loading = false;
                taskSlidesModel.refreshTaskSlidesRefresh();
                taskSlidesModel.assureCurrentSelected(resp.tid);
            }
        }, data = {
            end_date: getCurrentDateStr(sTask.end_date, true),
            start_date: getCurrentDateStr(sTask.start_date, true),
            etype: "PLAN",
            id: sTask.id,
            text: sTask.text,
            event_pid: sTask.event_pid});
    }
    if(sTask != undefined)return sTask;
    return this.EMPTY_TASK;
}, taskSlidesModel).extend({ deferred: true });

taskSlidesModel.selectedTaskName = ko.pureComputed(function(){return this.selectedTask().text;}, taskSlidesModel);

taskSlidesModel.selectedTaskDetails = ko.pureComputed(function(){
    if(this.selectedTask().details != undefined)return this.selectedTask().details; 
    return "";
}, taskSlidesModel);

function myTaskSlideKeydown(event){
    if (event.keyCode == 37 && event.ctrlKey) { //tab was pressed
        taskSlidesModel.changeCurrentTaskSelectedInSlides(-1);
    }else if (event.keyCode == 38 && event.ctrlKey){
        taskSlidesModel.refreshTaskSlidesRefresh();
    }else if (event.keyCode == 39 && event.ctrlKey){
        taskSlidesModel.changeCurrentTaskSelectedInSlides(1);
    }else if (event.keyCode == 40 && event.ctrlKey){
        taskSlidesModel.assureCurrentSelected();
    }
}

function myTaskSlideKeydown4selectedDetailsTextArea(event){
    if (String.fromCharCode(event.which).toLowerCase() == 's' && event.ctrlKey && event.shiftKey) {
        taskSlidesModel.trySaveLog(true);
    }
}