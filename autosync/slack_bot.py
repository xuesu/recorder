import json
import os
import re
import time
import typing
import requests
import markdownify

import utils as _utils

URL = "https://slack.com/api"
WAIT_SEC = 1.3
CHANNEL2TEST = "C0ADTCSRTUZ"
APP_TOKEN = None
BOT_TOKEN = None
BOT_UID = None


def setup():
    confs = _utils.render_global_confs({})
    global APP_TOKEN, BOT_TOKEN, BOT_UID
    APP_TOKEN = confs["slack"]["app_token"]
    BOT_TOKEN = confs["slack"]["bot_token"]
    BOT_UID = confs["slack"]["bot_uid"]


def call(method, token, params=None, http="GET", follow_next_cursor=False):
    url = f"{URL}/{method}"
    headers = {"Authorization": f"Bearer {token}"}
    next_cursor = ""
    data_ls = []
    for _ in range(1000):
        if follow_next_cursor and len(next_cursor) > 0:
            params["cursor"] = next_cursor
            time.sleep(WAIT_SEC * 3)
        if http == "GET":
            r = requests.get(url, headers=headers, params=params, timeout=30)
        else:
            r = requests.post(url, headers=headers, data=params, timeout=30)
        if follow_next_cursor and len(next_cursor) > 0:
            params.pop("cursor")
        data = r.json()
        if not data.get("ok"):
            # Surface Slack's exact error string (missing_scope, cant_delete_message, etc.)
            raise RuntimeError(
                f"{method} failed: {data.get('error')} | params={params}"
            )
        data_ls.append(data)
        if (
            follow_next_cursor
            and "response_metadata" in data
            and len(data["response_metadata"].get("next_cursor", "").strip()) > 0
        ):
            next_cursor = data["response_metadata"].get("next_cursor", "").strip()
        else:
            break
    if len(data_ls) == 0:
        return None
    elif len(data_ls) == 1:
        return data_ls[0]
    else:
        return data_ls


def conversation_history(channel, limit=50, include_replies=True, reply_limit=50):
    data = call(
        "conversations.history",
        BOT_TOKEN,
        {"channel": channel, "limit": limit, "inclusive": True},
    )
    if include_replies and data.get("ok"):
        for msg in data["messages"]:
            if "reply_count" in msg:
                msg["replies"] = call(
                    "conversations.replies",
                    BOT_TOKEN,
                    {
                        "channel": channel,
                        "ts": msg["ts"],
                        "limit": reply_limit,
                        "inclusive": True,
                    },
                )
    return data


def chat_delete(channel, ts):
    print("chat.delete", ts)
    return call("chat.delete", BOT_TOKEN, {"channel": channel, "ts": ts}, http="POST")


def chat_delete_all_replied_history_from_bot(channel, ts, uid):
    data = call(
        "conversations.replies",
        BOT_TOKEN,
        {"channel": channel, "ts": ts, "limit": 999, "inclusive": True},
    )
    if not data.get("ok"):
        return
    for msg in data["messages"]:
        print("examine reply", msg)
        if msg.get("user") == uid:
            chat_delete(channel, msg.get("ts"))
            time.sleep(WAIT_SEC * 2)


def chat_clear_all_msgs_from_bot(channel, uid):
    data0 = conversation_history(channel, limit=999, include_replies=False)
    if not data0.get("ok"):
        return
    for msg in data0["messages"]:
        print("examine msg", msg)
        if msg.get("user") == uid:
            chat_delete(channel, msg.get("ts"))
            time.sleep(WAIT_SEC)
        if "reply_count" in msg:
            chat_delete_all_replied_history_from_bot(channel, msg.get("ts"), uid)


def channels_list(team_id="", types="public_channel,private_channel"):
    """
    Args:
        team_id (str, optional): _description_. Defaults to "".
        types (str, optional): _description_. Defaults to "public_channel,private_channel". public_channel, private_channel, mpim, im
    """
    if len(team_id) == 0:
        team_id = call("auth.test", token=BOT_TOKEN)["team_id"]
    return call(
        "conversations.list",
        BOT_TOKEN,
        params={
            "team_id": team_id,
            "types": types,
            "exclude_archived": True,
            "limit": 999,
        },
        follow_next_cursor=True,
    )


def files_list(
    channel="",
    count=100,
    page=1,
    team_id="",
    ts_from="",
    ts_to="",
    types="all",
    user="",
):
    params = {
        "channel": channel,
        "count": count,
        "page": page,
        "team_id": team_id,
        "ts_from": ts_from,
        "ts_to": ts_to,
        "types": types,
        "user": user,
    }
    for k, v in list(params.items()):
        if isinstance(v, str) and len(v) == 0:
            params.pop(k)
    return call(
        "files.list",
        BOT_TOKEN,
        params=params,
        follow_next_cursor=True,
    )


def canvas_list(channel=""):
    return files_list(channel=channel, types="canvas")


def canvas_read(file_id):
    return call(
        "canvases.sections.lookup",
        BOT_TOKEN,
        params={
            "token": BOT_TOKEN,
            "canvas_id": file_id,
            "criteria": '{"section_types": ["any_header"]}',
        },
        http="POST",
        follow_next_cursor=True,
    )

class SlackCanvasConverter(markdownify.MarkdownConverter):
    """markdownify converter that recovers Slack-canvas todo lists.
 
    Slack drops the visible "- [ ] / - [x]" markers but tags checked items with
    a CSS class on the <li>. Rule: a list is a todo list if ANY of its direct
    <li> children carries CHECKED_CLASS. Detection walks node -> parent <ul> ->
    sibling <li>s. Every item in such a list is rendered as a task item, checked
    or unchecked, with a normalized "-" bullet (Obsidian/GFM form).
    """
 
    CHECKED_CLASS = "checked"
 
    # ---- helpers (node -> parent -> siblings) ----
    def _classes(self, node):
        cls = node.get("class") if node is not None else None
        return cls or []
 
    def _is_checked(self, li):
        return self.CHECKED_CLASS in self._classes(li)
 
    def _list_is_todo(self, li):
        parent = li.parent
        if parent is None or parent.name != "ul":
            return False
        if parent.get("data-section-style") == '7' or (parent.parent is not None and parent.parent.get("data-section-style") == '7'):
            return True
        # siblings = the parent <ul>'s DIRECT <li> children (not nested ones)
        for sibling in parent.find_all("li", recursive=False):
            if self._is_checked(sibling):
                return True
        return False
    
    def count_parent(self, li, func):
        el = li
        cnt = 0
        while el is not None:
            if func(el):
                cnt += 1
            el = el.parent
        return cnt
 
    def convert_ul(self, el, text, *args, **kwargs):
        line = super().convert_ul(el, text, *args, **kwargs)
        return line
        
    def convert_li(self, el, text, *args, **kwargs):
        line = super().convert_li(el, text, *args, **kwargs)
        # split into: leading whitespace | bullet char | the rest (incl. nested)
        m = re.match(r"^(\s*)([-*+]) (.*)$", line, re.S)
        if not m:
            return line
        indent, _bullet, rest = m.groups()
        assert _bullet == "-"
        if self._list_is_todo(el):
            checkbox = "[x] " if self._is_checked(el) else "[ ] "
        else:
            checkbox = ""
        indent = max(self.count_parent(el, lambda e: e.name == 'ul') - 1, 0) * 4 * " "
        return f"{indent}- {checkbox}{rest}"


def download_all(files_msgs, html2markdown, out_dir="out"):
    que = [files_msgs] + files_msgs.get("files", [])
    file_msgs = []
    while len(que) > 0:
        dt = que.pop()
        if "id" in dt and "pretty_type" in dt and "url_private_download" in dt:
            file_msgs.append(dt)
            print("file_msgs", dt)
        for v in dt.items():
            if isinstance(v, dict):
                que.append(v)
    del que
    for file_msg in file_msgs:
        fname = file_msg.get("id") + "_" + file_msg.get("name")
        if file_msg.get("pretty_type") != "Canvas":
            continue
        fpath = os.path.join(out_dir, fname)
        try:
            req = requests.get(
                file_msg.get("url_private_download"),
                headers={"Authorization": f"Bearer {BOT_TOKEN}"},
            )
            time.sleep(5 * WAIT_SEC)
        except requests.RequestException as e:
            print(e)
            continue
        print(file_msg)
        content = req.content
        # print(content)
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)
        with open(fpath, "wb") as fout:
            fout.write(content)
        if html2markdown and file_msg.get("pretty_type") == "Canvas":
            content = markdownify.markdownify(content.decode("utf-8"), bullets="-", heading_style="ATX")
            content = content.encode("utf-8")
            with open(fpath + ".md", "wb") as fout:
                fout.write(content)


def canvas_create_from_markdown(fpath, canvas_name="", channel_id=""):
    """
    channel_id is optional on paid workspaces but REQUIRED on free teams (it also
    tabs the canvas into that channel). If creation fails complaining about a free
    team, pass channel_id.
    """
    with open(fpath, "r", encoding="utf-8") as fin:
        content = fin.read()
    params = {"document_content": json.dumps({"type": "markdown", "markdown": content})}
    if canvas_name:
        params["title"] = canvas_name
    if channel_id:
        params["channel_id"] = channel_id
    data = call("canvases.create", BOT_TOKEN, params, http="POST")
    return data.get("canvas_id")


def canvas_replace_from_markdown(canvas_id, fpath):
    with open(fpath, "r", encoding="utf-8") as fin:
        content = fin.read()
    changes = [
        {
            "operation": "replace",
            "document_content": {
                "type": "markdown",
                "markdown": content,
            },
        }
    ]
    return call(
        "canvases.edit",
        BOT_TOKEN,
        {"canvas_id": canvas_id, "changes": json.dumps(changes)},
        http="POST",
    )


def get_canvas_id_by_name(canvas_name, channel=""):
    resp = canvas_list(channel=channel)
    if resp is None:
        return None
    pages = resp if isinstance(resp, list) else [resp]
    for page in pages:
        for f in page.get("files", []):
            if canvas_name.lower() in (f.get("name").lower(), f.get("title").lower()):
                return f.get("id")
    return None


def canvas_add_or_update_from_markdown(
    md_path, canvas_id=None, canvas_name="", channel_id=""
):
    if canvas_id is None:
        canvas_id = get_canvas_id_by_name(canvas_name)
        time.sleep(WAIT_SEC * 2)
    if canvas_id is None:
        return canvas_create_from_markdown(
            md_path, canvas_name=canvas_name, channel_id=channel_id
        )
    canvas_replace_from_markdown(canvas_id, md_path)
    time.sleep(WAIT_SEC * 2)
    return canvas_id


if __name__ == "__main__":
    setup()
    # with open("F0BBVUXMRG9_Obsidian_____Canvas_Round-Trip_Fixture.html", "r", encoding="utf-8") as fin:
    #     content = fin.read()
    # content = SlackCanvasConverter(bullets="-", heading_style="ATX").convert(content)
    # content = content.encode("utf-8")
    # with open("F0BBVUXMRG9_Obsidian_____Canvas_Round-Trip_Fixture" + ".md", "wb") as fout:
    #     fout.write(content)
    # print(json.dumps(channels_list(), indent=4))
    for channel_list_resp in channels_list():
        for channel in channel_list_resp["channels"]:
            if channel["creator"] == "U04DHT1NML6" and "vis" in channel["name"]:
                download_all(
                    files_list(channel["id"]),
                    html2markdown=True,
                    out_dir="out/" + channel["name_normalized"],
                )
    # print(json.dumps(files_list("C09RQG7HRJ7"), indent=4))
    # print(json.dumps(canvas_read("F0A7F4DDXV2"), indent=4))
