import datetime
import os
import shutil
import subprocess

import slack_bot as _slack_bot
import utils as _utils

GENERAL_SYNC_COMMIT_PREFIX = "general_sync_"
GENERAL_TIME_SUFFIX = "%Y%m%d%H%M%S"


def mysimplerun(cmds):
    try:
        res = subprocess.run(cmds, capture_output=True, text=True, check=True)
    except Exception as e:
        print("while execute", cmds, "got", e)
        return None, None, res.returncode
    return res.stdout, res.stderr, res.returncode


def git_sync_projs_dir(projs_dir, ignore_func, prefix, forced=False):
    output, _, _ = mysimplerun(["git", "-C", projs_dir, "log", "-1", "--pretty=%s"])
    if not ignore_func(output):
        mysimplerun(["git", "-C", projs_dir, "add", "*"])
        output, _, _ = mysimplerun(["git", "-C", projs_dir, "status", "--porcelain"])
        if len(output.strip()) > 0 and not forced:
            mysimplerun(
                [
                    "git",
                    "-C",
                    projs_dir,
                    "commit",
                    "-m",
                    prefix + datetime.datetime.now().strftime(GENERAL_TIME_SUFFIX),
                ],
                capture_output=True,
                text=True,
            )


def myread(src_path, try_parse=False):
    if os.path.isfile(src_path):
        pass


def general_sync():
    confs = _utils.render_global_confs({})
    projs_dir = _utils.get_conf(confs, "obsidian:projs_dir")
    git_sync_projs_dir(
        projs_dir,
        lambda commit_str: commit_str.startswith(GENERAL_SYNC_COMMIT_PREFIX),
        GENERAL_SYNC_COMMIT_PREFIX,
    )
    for general_sync_ele in _utils.get_conf(confs, "mysync:general_sync"):
        main_dir = general_sync_ele[0]
        for other_dir in general_sync_ele[1:]:
            mysimplerun(other_dir.split(" ") + [main_dir])
    git_sync_projs_dir(projs_dir, lambda _: False, GENERAL_SYNC_COMMIT_PREFIX)


def simple_parse_header(fpath):
    stack = []
    res = []
    inside_code_block = False
    with open(fpath, "r", encoding="utf-8") as fin:
        for line in fin.readlines():
            if not inside_code_block and line.startswith("#"):
                res.append((line, list(stack)))
                stack.clear()
            else:
                stack.push(line)
                if line.strip() == "```":
                    inside_code_block = not inside_code_block
    res2 = [(res[i - 1][0] if i > 0 else "Head", res[i][1]) for i in range(len(res))]
    res2 = [(h, b) for (h, b) in res2 if len(h) > 0 or len(b) > 0]
    return res2


def simple_write_plus_insert_blocks(
    fpath, head_and_content_blocks, new_head, new_block
):
    if not new_head.endswith("\n"):
        new_head = new_head + "\n"
    block_ids = [
        i
        for i, (h, _) in enumerate(head_and_content_blocks)
        if h.lower().strip().strip("#").strip()
        == new_head.lower().strip().strip("#").strip()
    ]
    if len(block_ids) == 0:
        if len(head_and_content_blocks) == 0:
            head_and_content_blocks = [(new_head, new_block)]
        else:
            head_and_content_blocks.insert(1, (new_head, new_block))
    else:
        block_id = block_ids[0]
        if "".join(new_block) in "".join(head_and_content_blocks[block_id][1]):
            return
        else:
            head_and_content_blocks[block_id][1] += new_block
    with open(fpath, "w", encoding="utf-8") as fout:
        for h, b in head_and_content_blocks:
            fout.write(h)
            fout.writelines(b)


def create_a_proj(proj_name):
    confs = _utils.render_global_confs({})
    projs_dir = _utils.get_conf(confs, "obsidian:projs_dir")
    proj_dir = os.path.join(projs_dir, proj_name)
    if not os.path.isdir(proj_dir):
        os.makedirs(proj_dir)
    shutil.copy(_utils.get_conf(confs, "obsidian:canvas_template_dir"), proj_dir)
    for create_ref_key, create_ref_fpath in _utils.get_conf(
        confs, "obsidian:proj_create_refs"
    ).items():
        head_and_content_blocks = simple_parse_header(create_ref_fpath)
        block = [
            b
            for (h, b) in head_and_content_blocks
            if h.lower().strip().strip("#").strip() == proj_name.lower()
        ][0]
        target_md_fpath = os.path.join(
            proj_dir, _utils.get_conf(confs, "obsidian:overview_md_in_template")
        )
        simple_write_plus_insert_blocks(
            target_md_fpath,
            simple_parse_header(target_md_fpath),
            "## " + create_ref_key + "\n",
            block,
        )
    canvas_sync(proj_name)


def canvas_sync():
    # Sync from local vault instead of slack canvas, for slack canvas has the problem of format loss
    pass


def main():
    pass
