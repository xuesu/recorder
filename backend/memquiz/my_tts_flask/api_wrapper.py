import abc
import base64
import ctypes
import datetime
import os
import threading

import utils

libc_dll = None


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

    def _gen_wav_file(self, text, fpath, other_params):
        raise NotImplementedError()

    def gen_mp3(self, text, other_params):
        cached_fpath = os.path.join("cache", utils.clean_improper_punc(text) + ".mp3")
        if len(text) < 50 and os.path.exists(os.path.join("cache", utils.clean_improper_punc(text) + ".mp3")):
            with open(cached_fpath, "rb") as fin:
                generated_mp3 = fin.read()
        else:
            self.lock.acquire()
            fname = f"tmp" + datetime.datetime.now().strftime("%H%M%S%f")
            if not self._gen_wav_file(text, fname + ".wav", other_params):
                return {"error": "Can not generate wav!!"}
            if not os.path.exists(fname + ".wav"):
                return {"error": "Can not generate wav!!Cannot find {}.wav!".format(fname)}
            utils.wav2mp3(fname + ".wav", fname + ".mp3")
            if not os.path.exists(fname + ".mp3"):
                return {"error": "Can not generate wav!!Cannot find {}.mp3!".format(fname)}
            with open(fname + ".mp3", "rb") as fin:
                generated_mp3 = fin.read()
            if len(text) < 50 and other_params.get("try_cache", False):
                os.remove(fname + ".wav")
                os.rename(fname + ".mp3", cached_fpath)
            else:
                os.remove(fname + ".wav")
                os.remove(fname + ".mp3")
            self.lock.release()
        return {"data": base64.b64encode(generated_mp3).decode('ascii')}
