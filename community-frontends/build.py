"""Inline engine bundle + kit into each page → portable single files in immersive/suites/dist/."""
import pathlib, sys
root = pathlib.Path(__file__).parent
bundle = (root / 'engine.bundle.js').read_text().replace('</script', '<\\/script')
kit_js = (root / 'kit.js').read_text()
kit_css = (root / 'kit.css').read_text()
out = root / 'dist'; out.mkdir(exist_ok=True)
for src in sorted(root.glob('*.src.html')):
    s = src.read_text()
    s = s.replace('/*__KIT_CSS__*/', kit_css).replace('/*__BUNDLE__*/', bundle).replace('/*__KIT_JS__*/', kit_js)
    dst = out / src.name.replace('.src', '')
    dst.write_text(s)
    print(dst.name, len(s) // 1024, 'KB')
