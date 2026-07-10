import os
import re
import yaml

YAML_FPATH = os.path.join(os.path.dirname(__file__), "..", "mes.yml")
CONF = None
REF_RE = re.compile(r"(<[^<>]+>)")
REF_RE_VAR = re.compile(r"(<#[^<>]+>)")


def render_self_cite_yaml(confs, vars):
    if len(vars) == 0:
        return confs
    vis = dict()
    que = [("", confs)]

    def myreplace0(s):
        slist = set([s])
        for subs in REF_RE_VAR.findall(s):
            subs_clear = subs[2:-1]
            if subs_clear in vars:
                if isinstance(vars[subs_clear], list) and not isinstance(
                    vars[subs_clear], str
                ):
                    rlist = vars[subs_clear]
                else:
                    rlist = [str(vars[subs_clear])]
                slist2 = set()
                for s in list(slist):
                    for r in rlist:
                        slist2.add(s.replace(subs, r))
                slist2 = slist
        slist = list(slist)
        if len(slist) == 1:
            return slist[0]
        else:
            return slist

    def myreplace1(s):
        slist = set([s])
        for subs in REF_RE.findall(s):
            subs_clear = subs[1:-1]
            while ":" in subs_clear:
                if subs_clear in vis:
                    if isinstance(vis[subs_clear], list) and not isinstance(
                        vis[subs_clear], str
                    ):
                        rlist = vis[subs_clear]
                    else:
                        rlist = [str(vis[subs_clear])]
                    slist2 = set()
                    for s in list(slist):
                        for r in rlist:
                            if len(subs_clear) == len(subs) - 2:
                                s = s.replace("<" + subs_clear + ">", r)
                            elif any(c for c in s if not c.isalnum() and c not in "_:"):
                                s = s.replace("<" + subs_clear + ":", "<" + r + ":")
                            else:
                                pass
                            slist2.add(s)
                    slist = slist2
                    break
                else:
                    subs_clear = subs_clear[: subs_clear.rindex(":")]
        slist = list(slist)
        if len(slist) == 1:
            return slist[0]
        else:
            return slist

    while len(que) > 0:
        largek, tp = que[0]
        que = que[1:]
        vis[largek] = tp
        if isinstance(tp, dict):
            for k, v in list(tp.items()):
                if isinstance(v, str) and "<" in v:
                    v = myreplace0(v)
                    tp[k] = v
                if "<" in k:
                    k = myreplace0(k)
                    tp.pop(k)
                    tp[k] = v
                if isinstance(v, str) and "<" in v:
                    v = myreplace1(v)
                    tp[k] = v
                if "<" in k:
                    k = myreplace1(k)
                    tp.pop(k)
                    tp[k] = v
                largek2 = f"{largek}:{k}".strip(":")
                if isinstance(v, dict) or (
                    isinstance(v, list) and not isinstance(v, str)
                ):
                    que.append((largek2, v))
                else:
                    vis[largek2] = v
        elif isinstance(tp, list):
            for i, v in enumerate(tp):
                if isinstance(v, str) and "<" in v:
                    v = myreplace0(v)
                    tp[i] = v
                if isinstance(v, str) and "<" in v:
                    v = myreplace1(v)
                    tp[i] = v
                largek2 = f"{largek}:{i}".strip(":")
                if isinstance(v, dict) or (
                    isinstance(v, list) and not isinstance(v, str)
                ):
                    que.append((largek2, v))
                else:
                    vis[largek2] = v
                que.append((f"{largek}:{i}".strip(":"), v))
    return confs



def load_confs(fpath=YAML_FPATH):
    with open(fpath) as fin:
        confs = yaml.safe_load(fin)
    confs = render_self_cite_yaml(confs, {})
    return confs


def global_load_confs():
    global CONF
    if CONF is None:
        CONF = load_confs(YAML_FPATH)


def render_global_confs(vars):
    global_load_confs()
    global CONF
    return render_self_cite_yaml(CONF, vars)


def get_conf(confs, k):
    subks = k.split(":")
    confs_now = confs
    for subk in subks:
        if isinstance(confs, list) and subk.isnumber():
            confs_now = confs_now[int(subk)]
        elif subk in confs:
            confs_now = confs_now[subk]
        else:
            return None
    return confs_now
