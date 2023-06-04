import os
import string
import subprocess
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))


def clean_improper_punc(s):
    return "".join([c if c not in string.punctuation else " " for c in s]).strip()


def clean_improper_punc_in_fname(s):
    return "".join([c if c not in "\\/:*?\"<>|" else " " for c in s]).strip()


def wav2mp3(in_wav_fpath, out_mp3_fpath):
    ffmpeg_fpath = r"../ffmpeg-2023-05-31-git-baa9fccf8d-full_build/bin/ffmpeg.exe"
    ffmpeg_fpath = os.path.abspath(os.path.join(ROOT_DIR, ffmpeg_fpath))
    if not os.path.exists(ffmpeg_fpath):
        print("[ERROR] Pleasee make sure you install ffmpeg correctly!")
        return -1
    cmd_txt = ffmpeg_fpath + r" -i {} -y -acodec libmp3lame {}".format(
        '"' + in_wav_fpath + '"', '"' + out_mp3_fpath + '"')
    res = subprocess.call(cmd_txt, shell=True)
    return res
