import time
import ctypes
from ctypes import wintypes

# Fix for MSYS2 Python
if not hasattr(wintypes, "ULONG_PTR"):
    if ctypes.sizeof(ctypes.c_void_p) == 8:
        wintypes.ULONG_PTR = ctypes.c_uint64
    else:
        wintypes.ULONG_PTR = ctypes.c_uint32
# =========================
# SETTINGS
# =========================
WPM = 20
MESSAGE = "Im not quite sure if I understood everything you said but cool, im going now. 73"

# PARIS timing (standard Morse)
DIT = 1.2 / WPM
DAH = 3 * DIT
INTRA_ELEMENT_GAP = DIT          # between dits/dahs in the same character
INTER_CHARACTER_GAP = 3 * DIT    # between characters
WORD_GAP = 7 * DIT               # between words

# Virtual key codes
VK_LCONTROL = 0xA2
VK_RCONTROL = 0xA3
VK_ESCAPE = 0x1B

# =========================
# Windows SendInput
# =========================
# =========================
# Windows SendInput (FIXED)
# =========================
user32 = ctypes.WinDLL("user32", use_last_error=True)

# Fix for MSYS2 Python (ULONG_PTR sometimes missing)
if not hasattr(wintypes, "ULONG_PTR"):
    wintypes.ULONG_PTR = ctypes.c_uint64 if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_uint32

INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP       = 0x0002
KEYEVENTF_SCANCODE    = 0x0008

VK_ESCAPE = 0x1B

# Scan codes (Set 1)
SC_LCTRL = 0x1D              # Left Ctrl
SC_RCTRL = 0x1D              # Right Ctrl uses same scan code but with EXTENDED flag (E0 1D)

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", wintypes.ULONG_PTR),
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", wintypes.ULONG_PTR),
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]

class INPUT(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [
            ("mi", MOUSEINPUT),
            ("ki", KEYBDINPUT),
            ("hi", HARDWAREINPUT),
        ]
    _anonymous_ = ("u",)
    _fields_ = [
        ("type", wintypes.DWORD),
        ("u", _U),
    ]

def _send_key_scancode(scan: int, *, keyup: bool, extended: bool):
    flags = KEYEVENTF_SCANCODE
    if extended:
        flags |= KEYEVENTF_EXTENDEDKEY
    if keyup:
        flags |= KEYEVENTF_KEYUP

    inp = INPUT(type=INPUT_KEYBOARD, ki=KEYBDINPUT(
        wVk=0,
        wScan=scan,
        dwFlags=flags,
        time=0,
        dwExtraInfo=0
    ))

    sent = user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    if sent != 1:
        raise ctypes.WinError(ctypes.get_last_error())

def key_down_left_ctrl():
    _send_key_scancode(SC_LCTRL, keyup=False, extended=False)

def key_up_left_ctrl():
    _send_key_scancode(SC_LCTRL, keyup=True, extended=False)

def key_down_right_ctrl():
    _send_key_scancode(SC_RCTRL, keyup=False, extended=True)

def key_up_right_ctrl():
    _send_key_scancode(SC_RCTRL, keyup=True, extended=True)

def escape_pressed() -> bool:
    return (user32.GetAsyncKeyState(VK_ESCAPE) & 0x8000) != 0

# =========================
# MORSE MAP
# =========================
MORSE = {
    "A": ".-",    "B": "-...",  "C": "-.-.",  "D": "-..",   "E": ".",
    "F": "..-.",  "G": "--.",   "H": "....",  "I": "..",    "J": ".---",
    "K": "-.-",   "L": ".-..",  "M": "--",    "N": "-.",    "O": "---",
    "P": ".--.",  "Q": "--.-",  "R": ".-.",   "S": "...",   "T": "-",
    "U": "..-",   "V": "...-",  "W": ".--",   "X": "-..-",  "Y": "-.--",
    "Z": "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "/": "-..-.", "-": "-....-",
    "'": ".----.", "!": "-.-.--", ":": "---...", ";": "-.-.-.", "(": "-.--.",
    ")": "-.--.-", "&": ".-...",  "=": "-...-",  "+": ".-.-.", "@": ".--.-.",
}

# =========================
# SENDING LOGIC
# =========================
def send_element(is_dah: bool) -> bool:
    if escape_pressed():
        return False

    duration = DAH if is_dah else DIT

    if is_dah:
        key_down_right_ctrl()
        time.sleep(duration)
        key_up_right_ctrl()
    else:
        key_down_left_ctrl()
        time.sleep(duration)
        key_up_left_ctrl()

    return True

def send_char(ch: str) -> bool:
    code = MORSE.get(ch.upper())
    if not code:
        return True  # skip unknown characters

    for i, sym in enumerate(code):
        if escape_pressed():
            return False

        if sym == ".":
            if not send_element(False):
                return False
        elif sym == "-":
            if not send_element(True):
                return False

        # gap between elements inside the same character
        if i != len(code) - 1:
            time.sleep(INTRA_ELEMENT_GAP)

    return True

def send_message(msg: str) -> bool:
    words = msg.split(" ")
    for wi, word in enumerate(words):
        for ci, ch in enumerate(word):
            if not send_char(ch):
                return False

            # gap between characters
            if ci != len(word) - 1:
                time.sleep(INTER_CHARACTER_GAP)

        # gap between words
        if wi != len(words) - 1:
            time.sleep(WORD_GAP)

    return True

def main():
    print("VBAND Morse Sender (no pip)")
    print("---------------------------")
    print(f"WPM: {WPM}  (DIT={DIT:.4f}s)")
    print("DIT = Left Ctrl | DAH = Right Ctrl")
    print("Press ESC to abort.\n")
    print("1) Open VBAND and enable keyboard mode.")
    print("2) Click VBAND so it has focus.\n")

    for i in range(3, 0, -1):
        print(f"Starting in {i}...")
        time.sleep(1)
        if escape_pressed():
            print("Aborted before start.")
            return

    print("\nSending:\n" + MESSAGE + "\n")
    ok = send_message(MESSAGE)
    print("Done." if ok else "Aborted.")

if __name__ == "__main__":
    main()