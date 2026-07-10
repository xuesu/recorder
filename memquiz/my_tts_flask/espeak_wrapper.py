import ctypes
import os

import api_wrapper

# espeak_AUDIO_OUTPUT
AUDIO_OUTPUT_PLAYBACK = 0  # PLAYBACK mode: plays the audio data, supplies events to the calling program
AUDIO_OUTPUT_RETRIEVAL = 1  # RETRIEVAL mode: supplies audio data and events to the calling program
AUDIO_OUTPUT_SYNCHRONOUS = 2  # SYNCHRONOUS mode: as RETRIEVAL but doesn't return until synthesis is completed
AUDIO_OUTPUT_SYNCH_PLAYBACK = 3  # Synchronous playback

# espeak_EVENT_TYPE
espeakEVENT_LIST_TERMINATED = 0  # Retrieval mode: terminates the event list.
espeakEVENT_WORD = 1  # Start of word
espeakEVENT_SENTENCE = 2  # Start of sentence
espeakEVENT_MARK = 3  # Mark
espeakEVENT_PLAY = 4  # Audio element
espeakEVENT_END = 5  # End of sentence or clause
espeakEVENT_MSG_TERMINATED = 6  # End of message
espeakEVENT_PHONEME = 7  # Phoneme, if enabled in espeak_Initialize()
espeakEVENT_SAMPLERATE = 8  # internal use, set sample rate

# espeak_ERROR
EE_OK = 0
EE_INTERNAL_ERROR = -1
EE_BUFFER_FULL = 1
EE_NOT_FOUND = 2

# espeak_POSITION_TYPE
POS_CHARACTER = 1
POS_WORD = 2
POS_SENTENCE = 3

# espeak_PUNCT_TYPE
espeakPUNCT_NONE = 0
espeakPUNCT_ALL = 1
espeakPUNCT_SOME = 2

# espeak_PARAMETER
espeakSILENCE = 0
espeakRATE = 1
espeakVOLUME = 2
espeakPITCH = 3
espeakRANGE = 4
espeakPUNCTUATION = 5
espeakCAPITALS = 6
espeakWORDGAP = 7
espeakOPTIONS = 8
espeakINTONATION = 9
espeakRESERVED1 = 10
espeakRESERVED2 = 11
espeakEMPHASIS = 12
espeakLINELENGTH = 13
espeakVOICETYPE = 14
N_SPEECH_PARAM = 15


class UnionIDESpeakEvent(ctypes.Union):
    _fields_ = [
        ('number', ctypes.c_int),
        ('name', ctypes.c_char_p),
        ('string', ctypes.c_char * 8),
    ]


class ESpeakEvent(ctypes.Structure):
    _fields_ = [('type', ctypes.c_int),  # espeak_EVENT_TYPE
                # message identifier (or 0 for key or character)
                ('unique_identifier', ctypes.c_uint),
                ('text_position', ctypes.c_int),  # the number of characters from the start of the text
                ('length', ctypes.c_int),  # word length, in characters ( for espeakEVENT_WORD)
                ('audio_position', ctypes.c_ubyte),  # 0=not specified, or age in years
                ('sample', ctypes.c_ubyte),  # sample id (internal use)
                ('user_data', ctypes.c_ubyte),  # pointer supplied by the calling program
                # int number: used for WORD and SENTENCE events.
                # const char * name: used for MARK and PLAY events.UTF8 string
                # char string[8]: used for phoneme names (UTF8).Terminated by a zero byte unless the name needs the full 8 bytes.
                ('id', UnionIDESpeakEvent),
                ('spare', ctypes.c_void_p),  # for internal use
                ]


class ESpeakVoice(ctypes.Structure):
    _fields_ = [('name', ctypes.c_char_p),  # a given name for this voice. UTF8 string.
                # list of pairs of (byte) priority + (string) language (and dialect qualifier)
                ('languages', ctypes.c_char_p),
                ('identifier', ctypes.c_char_p),  # the filename for this voice within espeak-data/voices
                ('gender', ctypes.c_ubyte),  # 0=none 1=male, 2=female,
                ('age', ctypes.c_ubyte),  # 0=not specified, or age in years
                ('variant', ctypes.c_ubyte),  # only used when passed as a parameter to espeak_SetVoiceByProperties
                ('xx1', ctypes.c_ubyte),  # for internal use
                ('score', ctypes.c_int),  # for internal use
                ('spare', ctypes.c_void_p),  # for internal use
                ]

    def to_ctypes(self):
        """Converts the Voice instance to  an espeak ctypes structure"""
        return self.VoiceStruct(
            self.name.encode('utf8') if self.name else None,
            self.language.encode('utf8') if self.language else None,
            self.identifier.encode('utf8') if self.identifier else None)

    @classmethod
    def from_ctypes(cls, struct):
        """Returns a Voice instance built from an espeak ctypes structure"""
        return cls(
            name=(struct.name or b'').decode(),
            # discard a useless char prepended by espeak
            language=(struct.languages or b'0').decode()[1:],
            identifier=(struct.identifier or b'').decode())


# typedef int (t_espeak_callback)(short*, int, espeak_EVENT*);
ESPEAK_T_CALLBACK_FUNC = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int,
                                          ctypes.c_void_p)
# ctypes.POINTER(ESpeakEvent))
# int (*UriCallback)(int, const char*, const char*)
ESPEAK_UNI_CALLBACK_FUNC = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p)
ESPEAK_Phoneme_CALLBACK_FUNC = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_char_p)
ESPEAK_TEST_CALLBACK_FUNC = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_int)


def load_espeak_dll():
    install_dir = r"..\espeak-1.48.04-source\install"
    mingw_bin_dir = os.environ['MINGW_HOME']
    os.environ['PATH'] = mingw_bin_dir + os.pathsep + install_dir + os.pathsep + os.environ['PATH']
    os.environ['LD_LIBRARY_PATH'] = mingw_bin_dir + os.pathsep + install_dir + os.pathsep + os.environ[
        'LD_LIBRARY_PATH']
    espeak_dll0 = ctypes.CDLL(os.path.join(install_dir, r"libespeak.dll"), ctypes.RTLD_GLOBAL, winmode=0)
    espeak_dll0.espeak_Initialize.restype = ctypes.c_int
    espeak_dll0.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
    espeak_dll0.espeak_SetSynthCallback.argtypes = [ESPEAK_T_CALLBACK_FUNC]
    espeak_dll0.espeak_SetUriCallback.argtypes = [ESPEAK_UNI_CALLBACK_FUNC]
    espeak_dll0.espeak_Synth.restype = ctypes.c_int
    espeak_dll0.espeak_Synth.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_uint,
                                         ctypes.c_uint, ctypes.c_uint, ctypes.POINTER(ctypes.c_uint), ctypes.c_void_p]
    espeak_dll0.espeak_Synth_Mark.restype = ctypes.c_int
    espeak_dll0.espeak_Synth_Mark.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_uint,
                                              ctypes.c_uint, ctypes.POINTER(ctypes.c_uint), ctypes.c_void_p]
    espeak_dll0.espeak_Key.restype = ctypes.c_int
    espeak_dll0.espeak_Key.argtypes = [ctypes.c_char_p]
    espeak_dll0.espeak_Char.restype = ctypes.c_int
    espeak_dll0.espeak_Char.argtypes = [ctypes.c_wchar]
    espeak_dll0.espeak_SetParameter.restype = ctypes.c_int
    espeak_dll0.espeak_SetParameter.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
    espeak_dll0.espeak_GetParameter.restype = ctypes.c_int
    espeak_dll0.espeak_GetParameter.argtypes = [ctypes.c_int, ctypes.c_int]
    espeak_dll0.espeak_SetPunctuationList.restype = ctypes.c_int
    espeak_dll0.espeak_SetPunctuationList.argtypes = [ctypes.c_int, ctypes.c_wchar_p]
    espeak_dll0.espeak_SetPhonemeTrace.restype = None
    espeak_dll0.espeak_SetPhonemeTrace.argtypes = [ctypes.c_int, ctypes.py_object]
    espeak_dll0.espeak_TextToPhonemes.restype = ctypes.c_char_p
    espeak_dll0.espeak_TextToPhonemes.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int, ctypes.c_int]
    espeak_dll0.espeak_CompileDictionary.restype = None
    espeak_dll0.espeak_CompileDictionary.argtypes = [ctypes.c_char_p, ctypes.py_object, ctypes.c_int]
    espeak_dll0.espeak_SetVoiceByName.restype = ctypes.c_int
    espeak_dll0.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
    espeak_dll0.espeak_SetVoiceByProperties.restype = ctypes.c_int
    espeak_dll0.espeak_SetVoiceByProperties.argtypes = [ctypes.POINTER(ESpeakVoice)]
    espeak_dll0.espeak_GetCurrentVoice.restype = None
    espeak_dll0.espeak_GetCurrentVoice.argtypes = [ctypes.POINTER(ESpeakVoice)]
    espeak_dll0.espeak_Cancel.restype = ctypes.c_int
    espeak_dll0.espeak_Cancel.argtypes = []
    espeak_dll0.espeak_IsPlaying.restype = ctypes.c_int
    espeak_dll0.espeak_IsPlaying.argtypes = []
    espeak_dll0.espeak_Synchronize.restype = ctypes.c_int
    espeak_dll0.espeak_Synchronize.argtypes = []
    espeak_dll0.espeak_Terminate.restype = ctypes.c_int
    espeak_dll0.espeak_Terminate.argtypes = []
    espeak_dll0.espeak_Info.restype = ctypes.c_char_p
    espeak_dll0.espeak_Info.argtypes = [ctypes.POINTER(ctypes.c_char_p)]
    espeak_dll0.espeak_ListVoices.restype = ctypes.POINTER(ctypes.POINTER(ESpeakVoice))
    espeak_dll0.espeak_ListVoices.argtypes = [ctypes.POINTER(ESpeakVoice)]
    espeak_dll0.espeak_GetCurrentVoice.restype = ctypes.POINTER(ESpeakVoice)
    espeak_dll0.espeak_GetCurrentVoice.argtypes = []
    espeak_dll0.espeak_Synth2file.restype = ctypes.c_int
    espeak_dll0.espeak_Synth2file.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_char_p,
                                              ctypes.c_int, ctypes.c_uint]
    return espeak_dll0


def p2list(ctype_p):
    res = []
    i = 0
    while True:
        if not ctype_p[i]:
            break
        res.append(ctype_p[i].contents)
        i += 1
    return res


class ESpeakWrapper(api_wrapper.APIWrapper):
    def __init__(self):
        super().__init__()
        self.lib = load_espeak_dll()

    def _gen_wav_file(self, text, fpath, other_params):
        raise NotImplementedError()
