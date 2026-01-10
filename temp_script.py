import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
lines=Path('src/pages/reports/ReportsHives.tsx').read_text(encoding='utf-8').splitlines()
for i in range(0, 200):
    if i < len(lines):
        print(f"{i+1:03d}: {lines[i]}")
