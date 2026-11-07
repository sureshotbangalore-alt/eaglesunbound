"""Non-invasive repository audit. Sends only locked package names/versions to OSV."""
import ast
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()
issues = []
for name in files:
    path = ROOT / name
    if not path.is_file() or path.stat().st_size > 1_000_000 or '.claude/' in name:
        continue
    if path.name.startswith('.env') and path.name != '.env.example':
        issues.append({'file': name, 'issue': 'Environment file must not be tracked'})
    if path.suffix not in {'.py', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.sql', '.env'}:
        continue
    source = path.read_text(encoding='utf-8')
    if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}', source):
        issues.append({'file': name, 'issue': 'Possible embedded secret (value redacted)'})
    if path.suffix == '.py' and name.startswith('backend/app/'):
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {'eval', 'exec'}:
                issues.append({'file': name, 'line': node.lineno, 'issue': 'Dynamic code execution requires review'})
            if isinstance(node, ast.Call) and any(k.arg == 'shell' and isinstance(k.value, ast.Constant) and k.value.value is True for k in node.keywords):
                issues.append({'file': name, 'line': node.lineno, 'issue': 'Shell execution requires review'})

queries = []
for line in (ROOT/'backend/requirements.lock').read_text().splitlines():
    if '==' in line and not line.startswith('#'):
        name, version = line.split('==')
        queries.append({'package': {'name': name, 'ecosystem': 'PyPI'}, 'version': version})
request = urllib.request.Request('https://api.osv.dev/v1/querybatch', data=json.dumps({'queries': queries}).encode(), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(request, timeout=45) as response:
        results = json.load(response)['results']
    vulnerabilities = [{'package': query['package']['name'], 'version': query['version'], 'ids': [v['id'] for v in result.get('vulns', [])]} for query, result in zip(queries, results) if result.get('vulns')]
    scan_error = None
except Exception as exc:
    vulnerabilities = []
    scan_error = type(exc).__name__ + ': dependency scan could not complete'
report = {'static_issues': issues, 'backend_advisories': vulnerabilities, 'scan_error': scan_error, 'scope': 'Source patterns and locked Python packages only. Run npm audit separately. This is not a penetration-test certification.'}
print(json.dumps(report, indent=2))
sys.exit(1 if issues or vulnerabilities or scan_error else 0)
