"""Package portable source, including dotfiles, without local/deployment state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import os
root = Path(__file__).resolve().parent.parent
out = root / 'public/apex-formula-lab-source.zip'
out.parent.mkdir(parents=True, exist_ok=True)
skip = {'node_modules','.git','.sites-runtime','.next','.vinext','.wrangler','dist','dist-pages','.openai','.agents','.codex','outputs','work','__pycache__','.pnpm-store'}
with ZipFile(out, 'w', ZIP_DEFLATED) as z:
    for folder, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in skip)
        for name in sorted(files):
            p = Path(folder) / name
            if p == out or p.is_symlink() or name.endswith(('.tsbuildinfo','.pem')) or name.startswith('.env'):
                continue
            z.write(p, p.relative_to(root))
print(f'Source package: {out.stat().st_size:,} bytes; repository files at ZIP root')
