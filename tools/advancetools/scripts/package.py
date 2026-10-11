"""Create the upload-ready ZIP using only Python's standard library."""
from pathlib import Path
import hashlib,shutil,zipfile
root=Path(__file__).resolve().parent.parent
source=root/'upload/tools/advancetools'
if source.exists():shutil.rmtree(source)
source.mkdir(parents=True)
for name in ['src','scripts','tests','licenses','reference','integration','docs','package.json','README.md','START_HERE.md']:
    item=root/name
    if item.is_dir():shutil.copytree(item,source/name)
    else:shutil.copy2(item,source/name)
files=sorted(p for p in root.rglob('*') if p.is_file() and p.name!='CHECKSUMS.sha256' and not p.name.endswith('.zip') and 'node_modules' not in p.parts and '.git' not in p.parts)
(root/'CHECKSUMS.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix()+'\n' for p in files))
files.append(root/'CHECKSUMS.sha256')
target=root.parent/'aafnaipatro-advancetools-complete.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,(Path(root.name)/p.relative_to(root)).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert 'advancetools-package/upload/public/advancetools/index.html' in z.namelist()
    assert 'advancetools-package/upload/tools/advancetools/src/app.mjs' in z.namelist()
print({'zip':str(target),'bytes':target.stat().st_size,'files':len(files),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
