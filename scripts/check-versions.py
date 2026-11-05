"""Fail on runtime or dependency drift; does not upgrade or install anything."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
runtime=json.loads((root/'runtime-lock.json').read_text())
errors=[]
def check(label,actual,expected):
    if actual!=expected:errors.append(f'{label}: expected {expected}, found {actual}')
check('Python', '.'.join(map(str,sys.version_info[:3])),runtime['python'])
check('Node',subprocess.check_output(['node','--version'],text=True).strip().lstrip('v'),runtime['node'])
npm=shutil.which('npm.cmd') or shutil.which('npm')
check('npm',subprocess.check_output([npm,'--version'],text=True).strip(),runtime['npm'])
package=json.loads((root/'frontend/package.json').read_text())
lock=json.loads((root/'frontend/package-lock.json').read_text())
installed=json.loads(subprocess.check_output([npm,'ls','--depth=0','--json'],cwd=root/'frontend',text=True))
for group in ('dependencies','devDependencies'):
    for name,version in package[group].items():
        if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[\w.-]+)?',version):errors.append(f'Floating frontend version: {name}={version}')
        check(name+' lockfile',lock['packages']['node_modules/'+name]['version'],version)
        check(name+' installed',installed['dependencies'][name]['version'],version)
for line in (root/'backend/requirements.lock').read_text().splitlines():
    if line and not line.startswith('#') and not re.fullmatch(r'[\w.-]+==[\w.+-]+',line):errors.append('Unpinned Python requirement: '+line)
for name,reference in runtime['images'].items():
    if not re.fullmatch(r'[\w./-]+:[\w.-]+@sha256:[0-9a-f]{64}',reference):errors.append('Non-immutable image: '+name)
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print('PASS: exact Node, npm, Python, installed frontend dependencies, lockfile consistency and immutable container references.')
print('PostgreSQL image is locked; execution verification still requires Docker/PostgreSQL.')
