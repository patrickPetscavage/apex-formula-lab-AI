"""Create the portable source download, without deployment identity or runtime state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import os
root = Path(__file__).resolve().parent.parent
out = root / 'public/apex-formula-lab-source.zip'
skip = {'node_modules','.git','.sites-runtime','.next','.vinext','.wrangler','dist','dist-pages','.openai','.agents','.codex','outputs','work','.fastf1-cache','data-local','__pycache__'}
with ZipFile(out,'w',ZIP_DEFLATED) as z:
    for directory, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in skip and not (Path(directory).relative_to(root).parts == ('.github',) and d == 'Screenshots'))
        for name in sorted(files):
            p=Path(directory)/name
            rel=p.relative_to(root)
            if p==out or name.endswith(('.tsbuildinfo','.pyc','.pem')) or name.startswith('.env'):
                continue
            z.write(p,Path('apex-formula-lab')/rel)
print(f'Source package: {out.stat().st_size:,} bytes')
