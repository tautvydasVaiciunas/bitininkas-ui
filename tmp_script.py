from pathlib import Path
text = Path('src/pages/admin/Tasks.tsx').read_text(encoding='utf-8')
start = text.index('const resetEditForm')
print(text[start:start+200])

