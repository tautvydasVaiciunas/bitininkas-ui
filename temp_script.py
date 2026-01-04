import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
path=Path('src/pages/admin/StoreProducts.tsx')
lines=path.read_text(encoding='utf-8').splitlines()
for i in range(430, 500):
    print(f"{i+1:03d}: {lines[i]}")
