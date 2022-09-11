function getCurrentDateStr(date_now, with_hour){
    if(date_now == undefined)date_now = new Date();
	var date_str = date_now.getFullYear() + "-" + String(date_now.getMonth() + 1).padStart(2, '0') + "-" + String(date_now.getDate()).padStart(2, '0');
    if(with_hour){
        date_str += " " + String(date_now.getHours()).padStart(2, '0') + ":" +  String(date_now.getMinutes()).padStart(2, '0');
    }
    return date_str;
}

function SetMapArr2Arr(arr){
    var res = [];
    if(arr instanceof Map){
        res = [...arr.values()];
    }
    else if(arr instanceof Array){
        res = arr;
    }
    else if(arr instanceof Set){
        res = [...arr];
    }
    return res;
}

function getSortedElesFromArrays(ids, arr){
    var ids_arr = SetMapArr2Arr(ids);
    ids_arr.sort((a, b)=>(a - b));
    var res = [];
    for(var id of ids_arr){
        if(arr instanceof Map){
            res.push(arr.get(id));
        }else{
            res.push(arr[id]);
        }
    }
    return res;
}

function getElesFromArrays(ids, arr){
    var ids_arr = SetMapArr2Arr(ids);
    var res = [];
    for(var id of ids_arr){
        if(arr instanceof Map){
            res.push(arr.get(id));
        }else{
            res.push(arr[id]);
        }
    }
    return res;
}

function base64ToByteArray(base64String) {
    try {            
        var sliceSize = 1024;
        var byteCharacters = atob(base64String);
        var bytesLength = byteCharacters.length;
        var slicesCount = Math.ceil(bytesLength / sliceSize);
        var byteArrays = new Array(slicesCount);

        for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
            var begin = sliceIndex * sliceSize;
            var end = Math.min(begin + sliceSize, bytesLength);

            var bytes = new Array(end - begin);
            for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                bytes[i] = byteCharacters[offset].charCodeAt(0);
            }
            byteArrays[sliceIndex] = new Uint8Array(bytes);
        }
        return byteArrays;
    } catch (e) {
        console.log("Couldn't convert to byte array: " + e);
        return undefined;
    }
}

function items_with_id2map(arr){
    var mp = new Map();
    arr.sort((a, b) => a.id - b.id);
    for(var i = 0; i < arr.length;i+=1){
        mp.set(arr[i].id, arr[i]);
    }
    if(mp.size != arr.length){
        alert("Key redundant in items_with_id2map");
    }
    return mp;
}

function items_with_id2id_set(arr){
    var st = new Set();
    for(var i = 0; i < arr.length;i+=1){
        st.add(arr[i].id);
    }
    if(st.size != arr.length){
        alert("Key redundant in items_with_id2id_set");
    }
    return st;
}

function normalStringToElementP(str) {
	return "<p>" + String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').split("\n").join("</p><p>") + "</p>";
}

Element.prototype.getElementById = function (id) {
	return this.querySelector("#" + id);
}

Element.prototype.getElementsByName = function (name) {
	return this.querySelectorAll("[name=\"" + name + "\"]");
}

function showElementById(elementID) {
	//document.getElementById(elementID).setAttribute("style", "visibility: visible;")
    document.getElementById(elementID).setAttribute("style", "display: block;");
}

function hideElementById(elementID) {
	//document.getElementById(elementID).setAttribute("style", "visibility: hidden;")
    document.getElementById(elementID).setAttribute("style", "display : none;");
}

function hideOtherChildAndVisThisChild(father_id, child_id){
    var father_ele = document.getElementById(father_id);
    for(var child of father_ele.children){
        if(child.getAttribute("id") == child_id){
            showElementById(child_id);
        }else{
            hideElementById(child.getAttribute("id"));
        }
    }
}

function clear_all_info_tr(table_ele) {
	for (var i = table_ele.getElementsByTagName("tr").length - 1; i >= 0; i--) {
		table_ele.deleteRow(i);
	}
}

function show_diff_time(x) {
	var x = Math.floor(x / 1000);
	var hour = Math.floor(x / 3600);
	var min = Math.floor((x % 3600) / 60);
	var sec = Math.floor((x % 3600) % 60);
	return hour + " hour " + min + " min " + sec + " sec";
}

function getRandomArbitrary(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function shuffle(arr){
    var new_arr = [];
    var org_arr = [...arr];
    for(var i = 0; i < org_arr.length;i+=1){
        var rid = getRandomArbitrary(i, org_arr.length - 1);
        new_arr.push(org_arr[rid]);
        org_arr[rid] = org_arr[i];
    }
    return new_arr;
}
