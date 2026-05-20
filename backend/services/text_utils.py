import unicodedata

def normalize_turkish_text(s: str) -> str:
    """Normalize text for consistent Turkish output.

    - Normalize Unicode to NFC
    - Strip surrounding whitespace
    """
    if not isinstance(s, str):
        s = str(s)
    s = unicodedata.normalize("NFC", s)
    return s.strip()
