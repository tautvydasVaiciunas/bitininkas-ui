from pathlib import Path
lines = Path('api/src/assignments/assignments.service.ts').read_text(encoding='utf-8').splitlines()
for i, line in enumerate(lines[1700:1780], start=1701):
    print(f"{i:4}: {line}")
