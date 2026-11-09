"""Canonical taxonomy; legacy daily Facts features are NOT modified."""
import re, unicodedata
ROOT="https://aafnaipatro.com"
FOLDERS={"article":"articles","blog":"blogs","fact":"facts","answer":"what"}
def slug(title):
    ascii_=unicodedata.normalize("NFKD",title).encode("ascii","ignore").decode().lower()
    result=re.sub(r"[^a-z0-9]+","-",ascii_).strip("-")[:88].strip("-")
    if not result:raise ValueError("Supply an explicit English slug")
    return result
def canonical(type,title,explicit_slug=None):
    if type not in FOLDERS:raise ValueError("Unrecognized type")
    s=explicit_slug or slug(title)
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",s):raise ValueError("Unsafe slug")
    return ROOT+"/"+FOLDERS[type]+"/"+s+"/"
