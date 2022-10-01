const tts_port = 9201;
const audible_group_name2model_lang = {
    "Deutsch_Audible": {"lang": "de", "model": "irissapi"},
    "Chinese_Audible": {"lang": "zh", "model": "irissapi"},
    "English_Audible": {"lang": "en", "model": "irissapi"},
    "Japanese_Audible": {"lang": "jp", "model": "irissapi"},
};

const memtest_name2id = {
    "self_judgment": 1,
    "main_name2text": 2,
    "main_text2name": 3,
    "main_audible2text": 4,
    "main_audible2name": 5,
    "main_audible_name2text": 6,
};

const memtest_id2name = {};
for(var memtest_name in memtest_name2id){
    memtest_id2name[memtest_name2id[memtest_name]] = memtest_name;
}

const group_name2enabled_memtest = {
    "Deutsch_Audible": new Set(["main_audible_name2text", "main_text2name"]),
    "English_Audible": new Set(["main_audible_name2text", "main_audible2text"]),
    "Japanese_Audible": new Set(["main_audible_name2text", "main_text2name"]),
};

const favorite_group_id = 5;
var memEntryViewModeSelected = "";
var id2membook = new Map();
var id2memlecture = new Map();
var id2mementry = new Map();
var id2memgroup = new Map();
var mementry_ids_fav = new Set();
var mementry_ids_current_lecture = new Set();
var mementry_ids_under_review = new Set();
var mementry_ids_under_test_list = [];
var mementry_ids_source = {"tp": "lecture", "id": -1};
var membook_id2lecture_ids = {};
var membookIDSelected = -1;
var memlectureIDSelected = -1;
var mementryIDSelected = -1;
var audio_src_mementry = null;
var audio_end_handler = null;
var memquiz_inited = false;
var audible_group_id2model_lang = {};
var is_playing_all_mementries = false;
var is_playing_all_mementries_data_list = [];
var is_playing_all_mementries_ind = 0;
var mementry_test_list = [];
var mementry_test_ind = 0;
var mementry_id2subhistogram = new Map();
var is_under_review = false;


function openMemQuizTab(){
    enableMemQuiz();
    $("a[href='#memquiz_tab']").tab("show");
}

function switchMemEntryViewMode(new_mode){
    if(new_mode == memEntryViewModeSelected)return;
    if(new_mode != "list" && new_mode != "card" && new_mode != "test"){
        alert("Unknown mementry View model" + new_mode);
    }
    if(new_mode != "test"){
        mementry_id2subhistogram.clear();
    }
    hideOtherChildAndVisThisChild("memquiz_view", "memquiz_view_" + new_mode);
    if(mementry_ids_under_test_list.length > 0){
        if(new_mode == "card")displayMemEntry(mementry_ids_under_test_list[0]);
    }
    memEntryViewModeSelected = new_mode;
}

function enableMemQuiz(){
    if(memquiz_inited)return;
    document.getElementById("memquiz_tab").innerHTML = `
    			<div>
					<label>Book</label>
					<select class="form-select" name="membooks_select" id="membooks_select" onchange="displayBooksAndLecturesAndMemEntries(false)"></select>
					<label>Lecture</label>
					<select class="form-select" name="memlectures_select" id="memlectures_select" onchange="displayLecturesAndMemEntries(false)"></select>
					<button onclick="refreshBooksAndLectures()">Refresh</button>
					<label>Mode</label>
					<button onclick="startNewReview()">Review</button>
					<div class="btn-group" id="memquiz_view_mode_btn_group">
						<button onclick="switchMemEntryViewMode('list')">List</button>
						<button onclick="switchMemEntryViewMode('card')">Card</button>
						<button onclick="startNewTest()">Test</button>
					</div>
					<div class="btn-group" id="memquiz_order_mode_btn_group">
						<button onclick="disorderMemEntriesList()">Shuffle</button>
						<button onclick="reorderMemEntriesList()">Reorder</button>
					</div>
                    <input id="memquiz_csv_input" type="file" accept=".csv" oninput="importMemEntriesByCSV()">Import from CSV</input>
					<audio id="memquiz_audio" controls></audio>
				</div>
				<div id="memquiz_view">
					<div id="memquiz_view_list">
                        <div>
                            <button id="memquiz_view_list_play_all" onclick="playAllMemEntriesList()">🔊All</button> 
                        </div>
						<table id="memquiz_view_list_entries" class="table center"></table>
					</div>
					<div id="memquiz_view_card" class="card">
                        <div class="card-header center">
                            <div class="card-title">
                                <button class="d-inline-table" onclick="shift_next_mementry(-1)">&lt;</button>
                                <button class="d-inline-table" id="memquiz_view_card_play">🔊</button>
                                <h3 class="d-inline-table" id="memquiz_view_card_title">Card title</h3>
                                <button class="d-inline-table" onclick="shift_next_mementry(1)">&gt;</button>
                            </div>
                        </div>
						<div class="card-body center" id="memquiz_view_card_body">
							<div class="card-text" id="memquiz_view_card_body_name" onclick="hideOtherChildAndVisThisChild('memquiz_view_card_body', 'memquiz_view_card_body_text')">
                            name
                            </div>
							<div class="card-text" id="memquiz_view_card_body_text" onclick="hideOtherChildAndVisThisChild('memquiz_view_card_body', 'memquiz_view_card_body_name')" style="display:none;">
                            text
                            </div>
							<div class="card-text" id="memquiz_view_card_body_other" style="display:none;">
                            other
                            </div>
						</div>
					</div>
					<div id="memquiz_view_test">
                        <div class="card-header center">
                            <div class="card-title">
                                <label>Question:</label>
                                <button id="memquiz_view_test_play">🔊</button>
                                <h3 id="memquiz_view_test_question">Question</h3>
                            </div>
                        </div>
						<div class="card-body center" id="memquiz_view_test_body">	
                            <div id="memquiz_view_test_body_answer">
                                <input id="memquiz_view_test_body_input" onkeydown="if(event.keyCode==13){judgeSubTest()}" />
                                <button onclick="judgeSubTest()">Submit</button>
                            </div>
                            <div id="memquiz_view_test_body_result" style="">
                                <h3 id="memquiz_view_test_body_result_text">F</h3>
                                <button id="memquiz_view_test_body_btn_next" onclick="discardSubTest()">Discard</button>
                                <button id="memquiz_view_test_body_btn_next" onclick="finishSubTest(-1)">Next</button>
                                <button id="memquiz_view_test_body_btn_incorrect" onclick="finishSubTest(0)">My answer is incorrect!</button>
                                <button id="memquiz_view_test_body_btn_correct" onclick="finishSubTest(1)">My answer is correct!</button>
                            </div>
                            <div id="memquiz_view_test_body_overall">
                                <h3 id="memquiz_view_test_body_overall_text">F</h3>
                                <button id="memquiz_view_test_body_btn_discard" onclick="discardOldTest()">Discard</button>
                                <button id="memquiz_view_test_body_btn_save" onclick="saveOldTest()">Save</button>
                                <table id="memquiz_view_test_review_entries" class="table center"></table>
                            </div>
						</div>
					</div>
				</div>
    `;
    refreshBooksAndLectures();
    switchMemEntryViewMode("list");
    document.getElementById("memquiz_view_card").onkeydown = myMemquizCardKeydown;
    memquiz_inited = true;
}

function recvMemBooks(data_recv){
    id2membook = items_with_id2map(data_recv);
}

function recvMemLectures(data_recv){
    id2memlecture = items_with_id2map(data_recv);
    id2memlecture.forEach((lecture)=>{
        var book = id2membook.get(lecture.book_id);
        if(!(book.id in membook_id2lecture_ids)){
            membook_id2lecture_ids[book.id] = new Set();
        }
        membook_id2lecture_ids[book.id].add(lecture.id);
    });
}

function recvMemGroups(data_recv){
    id2memgroup = items_with_id2map(data_recv);
    id2memgroup.forEach((memgroup)=>{
        if(memgroup.name == 'Favorite'){
            if(memgroup.id != favorite_group_id)alert("Please check kb.db, The group id of Favorite is not " + favorite_group_id);
        }else if(memgroup.name in audible_group_name2model_lang){
            audible_group_name2model_lang[memgroup.name].id = memgroup.id;
            audible_group_id2model_lang[memgroup.id] = audible_group_name2model_lang[memgroup.name];
        }
    });
}

function recvMenEntries(data_recv){
    data_recv.sort((a, b) => a.id - b.id);
    for(var i = 0; i < data_recv.length;i+=1){
        id2mementry.set(data_recv[i].id, data_recv[i]);
    }
}

function clear_obselete_mementries(){
    var ids2rm = [];
    for(var id of id2mementry.keys()){
        if(!(mementry_ids_current_lecture.has(id) || mementry_ids_fav.has(id))){
            ids2rm.push(id);
        }
    }
    for(var id of ids2rm){
       id2mementry.delete(id);
    }
}

function clean_and_reinsert_select_box_and_return_selected_id(select_id_str, inserted_options_org, selected_id){
    var inserted_options = SetMapArr2Arr(inserted_options_org);
    var select_ele = document.getElementById(select_id_str);
    select_ele.options.length = 0;
    var found_id = false;
    for(var i = 0;i < inserted_options.length;i+=1){
        var option = new Option(inserted_options[i].name, inserted_options[i].id);
        if(inserted_options[i].id == selected_id){
            option.selected = true;
            found_id = true;
        }
        select_ele.appendChild(option);
    }
    if(!found_id && inserted_options.length > 0){
        selected_id = inserted_options[0].id;
        select_ele.selectedIndex = 0;
    }else if(inserted_options.length == 0){
        selected_id = -1;
    }
    return selected_id;
}

function clear_displayMemBook(){
    membookIDSelected = -1;
    var select_ele = document.getElementById("memlectures_select");
    select_ele.options.length = 0;
    clear_displayMemLecture();
}

function clear_displayMemLecture(){
    memlectureIDSelected = -1;
    clear_displayMemEntires();
}

function clear_displayMemEntires(){
    mementry_ids_under_test_list = [];
    if(mementry_ids_source.tp == "lecture"){
        mementry_ids_current_lecture.clear();
    }else{
        mementry_ids_fav.clear();
    }
    clear_all_info_tr(document.getElementById("memquiz_view_list_entries"));
    clear_displayMemEntry();
}

function displayLecturesAndMemEntries(is_list_changed){
    var oldlectureIDSelected = memlectureIDSelected;
    memlectureIDSelected = parseInt(document.getElementById("memlectures_select").value);
    if(is_list_changed){
        memlectureIDSelected = clean_and_reinsert_select_box_and_return_selected_id("memlectures_select", getSortedElesFromArrays(membook_id2lecture_ids[membookIDSelected], id2memlecture), memlectureIDSelected);
    }
    if(is_list_changed || oldlectureIDSelected != memlectureIDSelected){
        if(memlectureIDSelected < 0){
            clear_displayMemLecture();
        }else{
            refreshMemEntriesByCurrentLecture(memlectureIDSelected);
        }
        switchMemEntryViewMode("list");
    }
}

function displayBooksAndLecturesAndMemEntries(is_list_changed){//0: list change, 1: selected change
    var oldBookIDSelected = membookIDSelected;
    membookIDSelected = parseInt(document.getElementById("membooks_select").value);
    if(is_list_changed){
        membookIDSelected = clean_and_reinsert_select_box_and_return_selected_id("membooks_select", id2membook, membookIDSelected);
    }
    if(is_list_changed || oldBookIDSelected != membookIDSelected){
        if(membookIDSelected < 0){
            clear_displayMemBook();
        }else{
            memlectures_current_book = [];
            id2memlecture.forEach((lecture)=>{
                if(lecture.book_id == membookIDSelected){
                    memlectures_current_book.push(lecture.id);
                }
            });
            displayLecturesAndMemEntries(true);
        }
    }
}

function refreshBooksAndLectures(){
    mySimpleReq("/scheduler/backend/membooks/", "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert("refreshBooksAndLectures-membooks" + JSON.stringify(resp));
        } else {
            recvMemBooks(resp.data);
            mySimpleReq("/scheduler/backend/memlectures/", "GET", (resp) => {
                if (resp == undefined || resp.error != undefined || resp.action == "error") {
                    alert("refreshBooksAndLectures-lectures" + JSON.stringify(resp));
                } else {
                    recvMemLectures(resp.data); 
                    displayBooksAndLecturesAndMemEntries(true);
                }
            });
        }
    });
    mySimpleReq("/scheduler/backend/memgroups/", "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert("refreshBooksAndLectures-memgroups" + JSON.stringify(resp));
        } else {
            recvMemGroups(resp.data); 
        }
    });
}

function clear_displayMemEntry(){
    document.getElementById("memquiz_view_card_title").innerText = "Card Title";
    document.getElementById("memquiz_view_card_body_name").innerText = "name";
    document.getElementById("memquiz_view_card_body_text").innerText = "text";
    mementryIDSelected = -1;
}

function displayMemEntry(mem_entry_id){
    if(mementryIDSelected != mem_entry_id){
        if(mem_entry_id < 0){
            clear_displayMemEntry();
        }else{
            var mem_entry = id2mementry.get(mem_entry_id);
            document.getElementById("memquiz_view_card_title").innerText = " Book:" + membookIDSelected + " " + mementry_ids_source["tp"] + ":" + mementry_ids_source["id"] + " Entry:" + mem_entry_id;
            document.getElementById("memquiz_view_card_body_name").innerText = mem_entry.name;
            document.getElementById("memquiz_view_card_body_text").innerText = mem_entry.text;
            mementryIDSelected = mem_entry_id;
            ttsAndPlay_by_mementry_id(mementryIDSelected);
            document.getElementById("memquiz_view_card_play").onclick = ()=>(ttsAndPlay_by_mementry_id(mementryIDSelected));
        }
    }
}

function displayMemEntryTest(mem_entry_id){
    if(mementryIDSelected != mem_entry_id){
        if(mem_entry_id < 0){
            clear_displayMemEntry();
        }else{
            var mem_entry = id2mementry.get(mem_entry_id);
            document.getElementById("memquiz_view_card_title").innerText = " Book:" + membookIDSelected + " " + mementry_ids_source["tp"] + ":" + mementry_ids_source["id"] + " Entry:" + mem_entry_id;
            document.getElementById("memquiz_view_card_body_name").innerText = mem_entry.name;
            document.getElementById("memquiz_view_card_body_text").innerText = mem_entry.text;
            mementryIDSelected = mem_entry_id;
            ttsAndPlay_by_mementry_id(mementryIDSelected);
            document.getElementById("memquiz_view_card_play").onclick = ()=>(ttsAndPlay_by_mementry_id(mementryIDSelected));
        }
    }
}

function displayMemEntriesInTable(table_ele, mem_entries){
    clear_all_info_tr(table_ele);
	for(var i = 0;i < mem_entries.length;i+=1) {
		add_info_tr_ex_with_html(
            "r" + mem_entries[i].id,
            mem_entries[i]['name'], 
            ["<button onclick='ttsAndPlay_by_mementry_id(" + mem_entries[i].id + ")'>🔊</button>" + normalStringToElementP(mem_entries[i]['text'])],
            table_ele
        );
	}
}

function displayMemEntries(mem_entries){
	var table_ele = document.getElementById("memquiz_view_list_entries");
	displayMemEntriesInTable(table_ele, mem_entries);

    if(memEntryViewModeSelected == "card" || memEntryViewModeSelected == "test"){
        let mementry_id = -1;
        if(mem_entries.length > 0){
            mementry_id = mem_entries[0].id;
        }
        displayMemEntry(mementry_id);
    }
}

function concerntrate_on_mementries(mementry_ids, source_tp, source_id){
    mementry_ids_source.tp = source_tp;
    mementry_ids_source.id = source_id;
    mementry_ids_under_test_list = SetMapArr2Arr(mementry_ids);
    displayMemEntries(getElesFromArrays(mementry_ids_under_test_list, id2mementry));
}

function refreshMemEntriesByCurrentLecture(lecture_id){
    mySimpleReq("/scheduler/backend/mementries/?lecture_id=" + lecture_id, "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert("refreshMemEntriesByCurrentLecture" + JSON.stringify(resp));
        } else {
            recvMenEntries(resp.data);
            mementry_ids_current_lecture = items_with_id2id_set(resp.data);
            clear_obselete_mementries();    
            concerntrate_on_mementries(mementry_ids_current_lecture, "lecture", lecture_id);
        }
    });
}

function refreshMemEntriesByFavoriteGroup(book_id){
    mySimpleReq("/scheduler/backend/mementries/?group_ids has=" + favorite_group_id + " &book_id=" + book_id, "GET", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert("refreshMemEntriesByFavoriteGroup" + JSON.stringify(resp));
        } else {
            recvMenEntries(resp.data);
            mementry_ids_fav = items_with_id2id_set(resp.data);
            clear_obselete_mementries();
            concerntrate_on_mementries(mementry_ids_fav, "group_id", favorite_group_id);
        }
    });
}

function playAudio(data){
    data = base64ToByteArray(data);
    let audio_ele = document.getElementById("memquiz_audio");
    if(data != undefined){
        let audio_data = new Blob(data, {"type": "audio/wav"});
        audio_src_mementry = window.URL.createObjectURL(audio_data);
        audio_ele.src = audio_src_mementry;
    }
    audio_ele.play();
}

function ttsAndPlay(text, model_name, lang, mp3datacallback, other_params){
    if(mp3datacallback == undefined){
        mp3datacallback = playAudio;
    }
    myCORSReq("http://127.0.0.1:9201/" + model_name  + "_" + lang, "POST", (resp) => {
        if (resp == undefined || resp.error != undefined || resp.action == "error") {
            alert("ttsAndPlay" + JSON.stringify(resp));
        } else {
            mp3datacallback(resp.data);
        }
    }, data={
        "text": text,
        "other_params": other_params
    });
}

function get_model_and_lang_by_entry_id(entry_id){
    if(!id2mementry.has(entry_id)){
        return "";
    }
    var lecture_id = id2mementry.get(entry_id).lecture_id;
    if(!id2memlecture.has(lecture_id)){
        return "";
    }
    var book_id = id2memlecture.get(lecture_id).book_id;
    var book =  id2membook.get(book_id);
    for(var group_id of book.group_ids){
        if(group_id in audible_group_id2model_lang){
            return audible_group_id2model_lang[group_id];
        }
    }
    return "";
}

function ttsAndPlay_by_mementry_id(entry_id, mp3datacallback){
    var model_and_lang = get_model_and_lang_by_entry_id(entry_id);
    if(model_and_lang.length == 0){
        alert("Cannot understand how to speak entry" + entry_id);
    }
    ttsAndPlay(id2mementry.get(entry_id).name, model_and_lang["model"], model_and_lang["lang"], mp3datacallback, {"try_cache": true});
}

function stopPlayAllMemEntries(){
    is_playing_all_mementries = false;
    is_playing_all_mementries_data_list = [];
    is_playing_all_mementries_ind = 0;
    document.getElementById("memquiz_audio").removeEventListener("ended", audio_end_handler, false);
}

function playAllMemEntries(data_list, data_and_mp3_callback, data_end_handler){
    if(is_playing_all_mementries){
        console.log("Stop playing all");
        stopPlayAllMemEntries();
    }else{
        is_playing_all_mementries = true;
        is_playing_all_mementries_ind = 0;
        is_playing_all_mementries_data_list = data_list;
        const current_callback = (mp3_data)=>{
            if(is_playing_all_mementries){
                data_and_mp3_callback(is_playing_all_mementries_data_list[is_playing_all_mementries_ind], mp3_data);
                is_playing_all_mementries_ind += 1;
            }
        }
        audio_end_handler = ()=>{
            if(is_playing_all_mementries_ind <= is_playing_all_mementries_data_list.length){
                data_end_handler(is_playing_all_mementries_data_list[is_playing_all_mementries_ind - 1]);
            }
            if(is_playing_all_mementries && is_playing_all_mementries_ind < is_playing_all_mementries_data_list.length){
                ttsAndPlay_by_mementry_id(is_playing_all_mementries_data_list[is_playing_all_mementries_ind].id, current_callback);
            }else{
                stopPlayAllMemEntries();
            }
        };
        document.querySelector("#memquiz_audio").addEventListener("ended", audio_end_handler, false);
        ttsAndPlay_by_mementry_id(is_playing_all_mementries_data_list[is_playing_all_mementries_ind].id, current_callback);
    }
}

function disorderMemEntriesList(){
    mementry_ids_under_test_list = shuffle(mementry_ids_under_test_list);
    displayMemEntries(getElesFromArrays(mementry_ids_under_test_list, id2mementry));
}

function reorderMemEntriesList(){
    mementry_ids_under_test_list.sort((a, b)=>(a - b));
    displayMemEntries(getElesFromArrays(mementry_ids_under_test_list, id2mementry));
}

function playAllMemEntriesList(){
    var id_list = mementry_ids_under_test_list;
    var data_list = [];
    for(var id of id_list){
        data_list.push({"id": id});
    }
    playAllMemEntries(data_list, 
        (data, mp3_data)=>{
            var row_eles = document.getElementById("memquiz_view_list_entries").getElementsByName("r" + data.id);
            if(row_eles.length > 0){
                row_eles[0].classList.add("bg-teal");
            }
            playAudio(mp3_data);
        },
        (data)=>{
            var row_eles = document.getElementById("memquiz_view_list_entries").getElementsByName("r" + data.id);
            if(row_eles.length > 0){
                row_eles[0].classList.remove("bg-teal");
            }
        }
    );
}

function shift_next_mementry(id_delta){
    if(mementry_ids_under_test_list.length == 0)return;
    var ind_now = mementry_ids_under_test_list.findIndex((x)=>x == mementryIDSelected);
    if(ind_now == -1)ind_now = 0;
    let id = mementry_ids_under_test_list[(ind_now + id_delta + mementry_ids_under_test_list.length) % mementry_ids_under_test_list.length];
    displayMemEntry(id);
}

function myMemquizCardKeydown(event){
    if (event.keyCode == 37 && event.shiftKey && event.ctrlKey) { //tab was pressed
        shift_next_mementry(-1);
    }else if (event.keyCode == 39 && event.shiftKey && event.ctrlKey){
        shift_next_mementry(1);
    }
}

function startNewTest(){
    is_under_review = false;
    switchMemEntryViewMode('test');
    disorderMemEntriesList();
    mementry_ids_under_review.clear();
    mementry_id2subhistogram.clear();
    var current_enabled_memtest_ids = [];
    for(var group_id of id2membook.get(membookIDSelected).group_ids){
        var group = id2memgroup.get(group_id);
        if(group.name in group_name2enabled_memtest){
            for(var testname of group_name2enabled_memtest[group.name]){
                current_enabled_memtest_ids.push(memtest_name2id[testname]);
            }
        }
    }
    mementry_test_list = [];
    mementry_test_ind = 0;
    for(var entry_id of mementry_ids_under_test_list){
        for(var test_id of current_enabled_memtest_ids){
            var mementry = id2mementry.get(entry_id);
            if((mementry.text == undefined || mementry.text.length == 0) && test_id == memtest_name2id["main_text2name"]){
                continue;
            }
            mementry_test_list.push({"mementry_id": entry_id, "memtest_id": test_id, "R": -1});
        }
    }
    mementry_test_list = shuffle(mementry_test_list);
    startSubTest();
}

function startNewReview(){
    switchMemEntryViewMode("test");
    is_under_review = true;
    var current_enabled_memtest_ids = [];
    for(var group_id of id2membook.get(membookIDSelected).group_ids){
        var group = id2memgroup.get(group_id);
        if(group.name in group_name2enabled_memtest){
            for(var testname of group_name2enabled_memtest[group.name]){
                current_enabled_memtest_ids.push(memtest_name2id[testname]);
            }
        }
    }
    mementry_test_list = [];
    mementry_test_ind = 0;
    for(var entry_id of mementry_ids_under_review){
        for(var test_id of current_enabled_memtest_ids){
            var mementry = id2mementry.get(entry_id);
            if((mementry.text == undefined || mementry.text.length == 0) && test_id == memtest_name2id["main_text2name"]){
                continue;
            }
            mementry_test_list.push({"mementry_id": entry_id, "memtest_id": test_id, "R": -1});
        }
    }
    mementry_test_list = shuffle(mementry_test_list);
    startSubTest();
}

function showStaticsByFinishTest(){
    document.getElementById("memquiz_view_test_body_overall_text").innerText = "You remembered " + mementry_ids_under_test_list.length + " entries, " + mementry_ids_under_review.size  + " of them incorrect!";
    displayMemEntriesInTable(document.getElementById("memquiz_view_test_review_entries"), getElesFromArrays(mementry_ids_under_review, id2mementry));
    hideOtherChildAndVisThisChild("memquiz_view_test_body", "memquiz_view_test_body_overall");
    is_under_review = false;
}

function finishTest(){
    var timenow = new Date().valueOf();
    if(!is_under_review)mementry_ids_under_review.clear();

    for(var mementry_test of mementry_test_list){
        if(mementry_test.R == -1)continue;
        var subhistogram;
        if(!mementry_id2subhistogram.has(mementry_test.mementry_id)){
            subhistogram = {"TIME": timenow, "R": -1, "T": 0, "F": 0};
        }else{
            subhistogram = mementry_id2subhistogram.get(mementry_test.mementry_id);
        }
        subhistogram["R"] = mementry_test.R;
        if(mementry_test.R == 0){
            subhistogram["F"] += 1;
            mementry_ids_under_review.add(mementry_test.mementry_id);
        }else if(mementry_test.R == 1){
            subhistogram["T"] += 1;
        }
        else{
            alert("mementry_test.R not in [0, 1, -1]");
        }
        mementry_id2subhistogram.set(mementry_test.mementry_id, subhistogram);
    }
    var need_review = !is_under_review; //current strategy
    if(need_review){
        switchMemEntryViewMode("test");
        startNewReview();
    }else{
        showStaticsByFinishTest();
    }
}

function discardOldTest(){
    switchMemEntryViewMode("list");
    mementry_test_list = [];
    mementry_test_ind = 0;
    mementry_id2subhistogram.clear();
    mementry_ids_under_review.clear();
    
}

function saveOldTest(){
    for(var mementry_id of mementry_ids_under_test_list){
        var mementry = id2mementry.get(mementry_id);
        if(mementry_id2subhistogram.has(mementry_id)){
            var subhistogram = mementry_id2subhistogram.get(mementry_id);
            if(mementry.test_histogram == undefined){
                mementry.test_histogram = [];
            }
            if(mementry.test_histogram.length == 3){
                mementry.test_histogram = mementry.test_histogram.slice(1, mementry.test_histogram.length);
            }
            mementry.test_histogram.push(subhistogram);
        }
        mementry.difficulty = calc_difficulties_v_0_1(mementry.test_histogram);
    }
    mySimpleReq("/scheduler/backend/mementries/1", "PUT", (resp) => {
        console.log("Successfully updated test_histogram.", resp);
    }, data = getElesFromArrays(mementry_ids_under_test_list, id2mementry));
}

function startSubTest(){
    if(mementry_test_list.length <= mementry_test_ind){
        showStaticsByFinishTest();
        return;
    }
    var mementry_test = mementry_test_list[mementry_test_ind];
    var mementry_id = mementry_test.mementry_id;
    var memtest_id = mementry_test.memtest_id;
    var mementry = id2mementry.get(mementry_id);
    document.getElementById("memquiz_view_test_question").innerHTML = "";
    
    if(memtest_id == memtest_name2id["self_judgment"] || memtest_id == memtest_name2id["main_name2text"] || memtest_id == memtest_name2id["main_audible_name2text"]){
        document.getElementById("memquiz_view_test_question").innerHTML += normalStringToElementP(mementry.name) + "\n";
    }
    if(mementry.text.length > 0 && (memtest_id == memtest_name2id["self_judgment"] || memtest_id == memtest_name2id["main_text2name"])){
        document.getElementById("memquiz_view_test_question").innerHTML += normalStringToElementP(mementry.text) + "\n";
    }
    if(memtest_id == memtest_name2id["main_audible2text"] || memtest_id == memtest_name2id["main_audible2name"] || memtest_id == memtest_name2id["main_audible_name2text"]){
        document.getElementById("memquiz_view_test_play").onclick = ()=>{
            ttsAndPlay_by_mementry_id(mementry_id);
        };
    }
    hideOtherChildAndVisThisChild("memquiz_view_test_body", "memquiz_view_test_body_answer");
    ttsAndPlay_by_mementry_id(mementry_id);
}

function discardSubTest(){
    if(mementry_test_list.length > mementry_test_ind){
        mementry_test_list[mementry_test_ind]['R'] = -1;
        mementry_test_ind += 1;
    }
    if(mementry_test_ind < mementry_test_list.length){
        startSubTest();
    }else{
        finishTest();
    }
}

function judgeTxtEqual(s1, s2){
    return s1.replace(/\s+/g,' ').trim() == s2.replace(/\s+/g,' ').trim();
}

function judgeSubTest(){
    if(mementry_test_list.length <= mementry_test_ind){
        return;
    }
    var correct_answer = "";
    var mementry_test = mementry_test_list[mementry_test_ind];
    var mementry_id = mementry_test.mementry_id;
    var memtest_id = mementry_test.memtest_id;
    var mementry = id2mementry.get(mementry_id);
    if(memtest_id == memtest_name2id["main_name2text"] || memtest_id == memtest_name2id["main_audible2text"] || memtest_id == memtest_name2id["main_audible_name2text"]){
        correct_answer = mementry.text;
    }
    if(memtest_id == memtest_name2id["main_text2name"] || memtest_id == memtest_name2id["main_audible2name"]){
        correct_answer = mementry.name;
    }
    var input_answer = document.getElementById("memquiz_view_test_body_input").value;
    var res = -1;
    if(correct_answer.length > 0)res=judgeTxtEqual(correct_answer, input_answer)?1:0;
    mementry_test['R'] = res;
    hideOtherChildAndVisThisChild("memquiz_view_test_body", "memquiz_view_test_body_result");
    var test_res = (res == -1?'?':(res==0?'F':'T'));
    document.getElementById("memquiz_view_test_body_result_text").innerHTML = test_res + ", correct answer is: " + correct_answer;
    if(res == 0){
        document.getElementById("memquiz_view_test_body_result_text").innerHTML += ", your answer is: " + input_answer;
    }

    if(res == -1){
        document.getElementById("memquiz_view_test_body_btn_next").setAttribute("style", "display:none;");
        document.getElementById("memquiz_view_test_body_btn_correct").setAttribute("style", "display:block;");
        document.getElementById("memquiz_view_test_body_btn_incorrect").setAttribute("style", "display:block;");
    }else if(res == 1){
        document.getElementById("memquiz_view_test_body_btn_next").setAttribute("style", "display:block;");
        document.getElementById("memquiz_view_test_body_btn_correct").setAttribute("style", "display:none;");
        document.getElementById("memquiz_view_test_body_btn_incorrect").setAttribute("style", "display:none;");
    }else{
        document.getElementById("memquiz_view_test_body_btn_next").setAttribute("style", "display:block;");
        document.getElementById("memquiz_view_test_body_btn_correct").setAttribute("style", "display:block;");
        document.getElementById("memquiz_view_test_body_btn_incorrect").setAttribute("style", "display:none;");
    }
}

function finishSubTest(man_res){
    if(mementry_test_list.length <= mementry_test_ind){
        return;
    }
    var mementry_test = mementry_test_list[mementry_test_ind];
    if(man_res == 1 || man_res == 0){//-1: use the judged result
        mementry_test['R'] = man_res;
    }
    mementry_test_ind += 1;
    if(mementry_test_ind < mementry_test_list.length){
        startSubTest();
    }else{
        finishTest();
    }
}

function importMemEntriesByCSV(){
    if(memlectureIDSelected == -1){
        alert("Please select a lecture!");
    }
    var csvfile = document.getElementById("memquiz_csv_input").files[0];
    if (csvfile) {
        var reader = new FileReader();
        reader.readAsText(csvfile, "UTF-8");
        reader.onerror = function (event) {
           alert("error reading file" + JSON.stringify(event));
           document.getElementById("memquiz_csv_input").value = "";
        }
        reader.onloadend = function(event){
            mySimpleReq("/scheduler/backend/mementries_import_by_csv", "POST", 
            (resp)=>{
                if(resp.action == "error")alert("Cannot import records by CSV!" + JSON.stringify(resp));
                else alert("Successfully import records by CSV!" + JSON.stringify(resp));
                document.getElementById("memquiz_csv_input").value = "";
                refreshBooksAndLectures();
            }, 
            data={"fcontent": reader.result, "lecture_id": memlectureIDSelected});
        }
    }
}