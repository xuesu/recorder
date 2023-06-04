import abc
import base64
import ctypes
import datetime
import os
import threading

import utils

libc_dll = None
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

class CFile(ctypes.Structure):
    pass


def load_clib_dll():
    libc_dll0 = ctypes.windll.msvcrt
    libc_dll0.fopen.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    libc_dll0.fopen.restype = ctypes.POINTER(CFile)
    libc_dll0.fwrite.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_size_t, ctypes.POINTER(CFile)]
    libc_dll0.fwrite.restype = ctypes.c_size_t
    libc_dll0.fclose.argtypes = [ctypes.POINTER(CFile)]
    libc_dll0.fclose.restype = ctypes.c_int
    return libc_dll0


class APIWrapper(abc.ABC):
    def __init__(self):
        global libc_dll
        if libc_dll is None:
            libc_dll = load_clib_dll()
        self.lib = None
        self.lock = threading.Lock()
        self.cache_dir = os.path.join(ROOT_DIR, "cache")
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)

    def _gen_wav_file(self, text, fpath, other_params):
        raise NotImplementedError()

    def gen_mp3(self, text, other_params):
        cached_fpath = os.path.join(self.cache_dir, utils.clean_improper_punc(text) + ".mp3")
        if len(text) < 50 and os.path.exists(cached_fpath):
            with open(cached_fpath, "rb") as fin:
                generated_mp3 = fin.read()
        else:
            self.lock.acquire()
            fname = f"tmp" + datetime.datetime.now().strftime("%H%M%S%f")
            tmp_wav_fpath = os.path.join(self.cache_dir, fname + ".wav")
            tmp_mp3_fpath = os.path.join(self.cache_dir, fname + ".mp3")
            print(tmp_mp3_fpath)
            if not self._gen_wav_file(text, tmp_wav_fpath, other_params):
                return {"error": "Can not generate wav!!"}
            if not os.path.exists(tmp_wav_fpath):
                return {"error": "Can not generate wav!!Cannot find {}.wav!".format(fname)}
            utils.wav2mp3(tmp_wav_fpath, tmp_mp3_fpath)
            if not os.path.exists(tmp_mp3_fpath):
                return {"error": "Can not generate wav!!Cannot find {}.mp3!".format(fname)}
            with open(tmp_mp3_fpath, "rb") as fin:
                generated_mp3 = fin.read()
            if len(text) < 50 and other_params.get("try_cache", False):
                os.remove(tmp_wav_fpath)
                os.rename(tmp_mp3_fpath, cached_fpath)
            else:
                os.remove(tmp_wav_fpath)
                os.remove(tmp_mp3_fpath)
            self.lock.release()
        return {"data": base64.b64encode(generated_mp3).decode('ascii')}
