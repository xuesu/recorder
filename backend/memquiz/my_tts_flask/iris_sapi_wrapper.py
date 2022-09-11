import ctypes

import api_wrapper

IRIS_SAPI_ENABLED_LANG_EN = 0
IRIS_SAPI_ENABLED_LANG_DE = 1
IRIS_SAPI_ENABLED_LANG_ZH = 2
IRIS_SAPI_ENABLED_LANG_JP = 3
IRIS_SAPI_ENABLED_LANG_CNT = 4
IRIS_SAPI_ENABLED_LANG2ID = {
    "en": 0,
    "de": 1,
    "zh": 2,
    "jp": 3,
}


def load_iris_api_binding_dll():
    iris_sapi_binding_dll0 = ctypes.CDLL(r"iris_sapi_binding.dll", ctypes.RTLD_GLOBAL, winmode=0)
    iris_sapi_binding_dll0.printAllToken.argtypes = []
    iris_sapi_binding_dll0.printAllToken.restype = None
    iris_sapi_binding_dll0.init.argtypes = [ctypes.c_bool]
    iris_sapi_binding_dll0.init.restype = ctypes.c_void_p
    iris_sapi_binding_dll0.uninit.argtypes = [ctypes.c_void_p]
    iris_sapi_binding_dll0.uninit.restype = None
    iris_sapi_binding_dll0.speak2file.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int, ctypes.c_wchar_p]
    iris_sapi_binding_dll0.speak2file.restype = ctypes.c_bool
    iris_sapi_binding_dll0.speak2file_utf8.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p]
    iris_sapi_binding_dll0.speak2file_utf8.restype = ctypes.c_bool
    return iris_sapi_binding_dll0


class SAPI5Wrapper(api_wrapper.APIWrapper):
    def __init__(self):
        super().__init__()
        self.lib = load_iris_api_binding_dll()
        self.psettings = self.lib.init(False)
        print("Initialized SAPI Binding.")

    def __del__(self):
        print("Uninitialized SAPI Binding.")
        self.lib.uninit(self.psettings)

    def _gen_wav_file(self, text, fpath, other_params):
        self.lib.init(True)
        voice_id = IRIS_SAPI_ENABLED_LANG2ID[other_params["lang"]]
        bfpath = fpath.encode('utf-8')
        btext = text.encode('utf-8')
        return self.lib.speak2file_utf8(self.psettings, bfpath, voice_id, btext)
