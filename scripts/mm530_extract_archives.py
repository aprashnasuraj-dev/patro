#!/usr/bin/env python3
"""Safely extract 10 MM530 source ZIPs on the isolated table branch; no publication."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVES = [ROOT / f"MM530_GIT_IMPORT_BATCH_{n:02}.zip" for n in range(1, 11)]
RECEIPT = ROOT / "reports" / "mm530-table-extraction.json"
MAX_ENTRIES = 100_000
MAX_TOTAL_BYTES = 1_000_000_000
MAX_MEMBER_BYTES = 40_000_000

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def checked_path(raw):
    if (not raw or "\\" in raw or "\x00" in raw or raw.startswith("/") or
            re.match(r"^[a-zA-Z]:", raw)):
        raise ValueError(f"Unsafe archive path: {raw!r}")
    p = PurePosixPath(raw)
    parts = raw.rstrip("/").split("/")
    if (not parts or any(x in ("", ".", "..") for x in parts) or
            p.parts[0].lower() in (".git", ".github")):
        raise ValueError(f"Disallowed archive path: {raw!r}")
    if any(ord(c) < 32 for c in raw):
        raise ValueError(f"Control character in archive path: {raw!r}")
    dest = ROOT.joinpath(*parts)
    for ancestor in (dest, *dest.parents):
        if ancestor == ROOT:
            break
        if ancestor.is_symlink():
            raise ValueError(f"Refusing path through symlink: {dest.relative_to(ROOT)}")
    return dest

def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()

def main():
    if run("git", "branch", "--show-current") != "table":
        raise RuntimeError("Only the table branch may run this extractor")
    if run("git", "status", "--porcelain"):
        raise RuntimeError("Dirty checkout: refusing extraction")
    if RECEIPT.exists():
        raise RuntimeError("Receipt already exists: this is a one-time operation")
    for archive in ARCHIVES:
        if not archive.is_file():
            raise FileNotFoundError(f"Missing archive: {archive.name}")
    all_data = {}
    per_batch = []
    entry_count = 0
    expanded_bytes = 0
    # Validate all ten archives before writing any files.
    for archive in ARCHIVES:
        total = 0
        count = 0
        with zipfile.ZipFile(archive, "r") as z:
            if (bad := z.testzip()) is not None:
                raise ValueError(f"Bad ZIP CRC: {archive.name}:{bad}")
            seen_in_zip = set()
            for member in z.infolist():
                dest = checked_path(member.filename)
                normalized = str(dest.relative_to(ROOT))
                if normalized in seen_in_zip:
                    raise ValueError(f"Duplicate ZIP entry: {archive.name}:{normalized}")
                seen_in_zip.add(normalized)
                mode = member.external_attr >> 16
                if stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
                    raise ValueError(f"Nonregular ZIP entry: {archive.name}:{normalized}")
                if member.is_dir():
                    continue
                if member.file_size > MAX_MEMBER_BYTES:
                    raise ValueError(f"Excessively large member: {normalized}")
                expanded_bytes += member.file_size
                entry_count += 1
                count += 1
                total += member.file_size
                if entry_count > MAX_ENTRIES or expanded_bytes > MAX_TOTAL_BYTES:
                    raise ValueError("ZIP extraction size or file-count limit exceeded")
                data = z.read(member)
                if len(data) != member.file_size:
                    raise ValueError(f"Member size mismatch: {normalized}")
                old = all_data.get(normalized)
                if old is not None and old != data:
                    raise ValueError(f"Conflicting duplicate across archives: {normalized}")
                all_data[normalized] = data
        per_batch.append({
            "archive": archive.name,
            "compressed_bytes": archive.stat().st_size,
            "archive_sha256": sha256(archive.read_bytes()),
            "member_count": count,
            "uncompressed_bytes": total,
        })
    names = set(all_data)
    for rel, data in all_data.items():
        dest = checked_path(rel)
        for parent in dest.parents:
            if parent == ROOT:
                break
            if parent.is_file() or str(parent.relative_to(ROOT)) in names:
                raise ValueError(f"File/directory collision: {rel}")
        if dest.exists() and (not dest.is_file() or dest.read_bytes() != data):
            raise ValueError(f"Refusing to overwrite existing project file: {rel}")
    copied = 0
    for rel, data in sorted(all_data.items()):
        dest = ROOT / rel
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            copied += 1
        if sha256(dest.read_bytes()) != sha256(data):
            raise RuntimeError(f"Extraction hash mismatch: {rel}")
    fingerprint = hashlib.sha256()
    for rel, data in sorted(all_data.items()):
        fingerprint.update(rel.encode("utf-8") + b"\0" + sha256(data).encode() + b"\n")
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps({
        "branch": "table", "archives_verified": 10,
        "archive_details": per_batch, "archive_entry_count": entry_count,
        "unique_file_count": len(all_data), "new_files_extracted": copied,
        "uncompressed_total_bytes": expanded_bytes,
        "unique_files_path_sha256_fingerprint": fingerprint.hexdigest(),
        "zip_crc": "PASS", "path_safety": "PASS", "overwrite_conflicts": "NONE",
        "source_status": "EXTRACTED_TEST_PENDING", "tool_tests_executed": 0,
        "production_publication": "NOT_TRIGGERED", "publication_gate": "LOCKED",
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"EXTRACTED: {copied} new source files; {len(all_data)} unique across 10 ZIPs")
    print(f"RECEIPT: {RECEIPT.relative_to(ROOT)}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"MM530 EXTRACT FAILED SAFELY: {exc}", file=sys.stderr)
        raise
