import os
import string
import subprocess


def clean_improper_punc(s):
    return "".join([c if c not in string.punctuation else " " for c in s]).strip()


def clean_improper_punc_in_fname(s):
    return "".join([c if c not in "\\/:*?\"<>|" else " " for c in s]).strip()


def wav2mp3(in_wav_fpath, out_mp3_fpath):
    ffmpeg_fpath = r"../ffmpeg-2022-08-29-git-f99d15cca0-essentials_build/bin/ffmpeg.exe"
    ffmpeg_fpath = os.path.abspath(ffmpeg_fpath)
    cmd_txt = ffmpeg_fpath + r" -i {} -y -acodec libmp3lame {}".format(
        '"' + in_wav_fpath + '"', '"' + out_mp3_fpath + '"')
    res = subprocess.call(cmd_txt, shell=True)
    return res
