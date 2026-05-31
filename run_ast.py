import json
from pathlib import Path
from graphify.extract import extract

detect_path = Path('graphify-out/.graphify_detect.json')
detect = json.loads(detect_path.read_text(encoding='utf-8'))

code_files = [Path(f) for f in detect.get('files', {}).get('code', [])]

if code_files:
    result = extract(code_files, cache_root=Path('.'))
    ast_path = Path('graphify-out/.graphify_ast.json')
    ast_path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f'AST: {len(result["nodes"])} nodes, {len(result["edges"])} edges')
else:
    print('No code files found.')
