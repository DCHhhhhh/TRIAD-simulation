"""Dependency-free public artifact validator, also run by GitHub Actions."""
import argparse, hashlib, json, re
from pathlib import Path


def validate(root,allow_preview=False):
    root=Path(root)
    if root.is_symlink():raise ValueError('Artifact cannot be a symlink')
    manifest=json.loads((root/'publication.json').read_text())
    if manifest.get('approved_for_publication') is False and not allow_preview:raise ValueError('Updated public content is a preview, not approved for deployment')
    files={str(p.relative_to(root)):p for p in root.rglob('*') if p.is_file()}
    if any(p.is_symlink() for p in root.rglob('*')):raise ValueError('No symlinks in artifact')
    expected=set(manifest['files'])|{'publication.json'}
    if set(files)!=expected:raise ValueError('Artifact file set differs from reviewed manifest')
    fixed={'index.html','style.css','app.js','catalog.json','publication.json','.nojekyll','research.js','research.css'}
    forbidden=re.compile(r'(?i)(/Users/|/home/|[A-Z]:\\Users\\|sk-(?:proj-)?[a-z0-9_-]{16,}|https://[^\s\"<>]+\.openai\.azure\.com|-----BEGIN .*PRIVATE KEY-----|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})')
    for name,path in files.items():
        if name not in fixed and not re.fullmatch(r'data/[a-z0-9][a-z0-9-]{0,59}/(?:recording\.json|art/[a-f0-9]{64}\.svg)',name):raise ValueError('Unexpected public file: '+name)
        if name!='publication.json' and hashlib.sha256(path.read_bytes()).hexdigest()!=manifest['files'][name]:raise ValueError('Public file changed: '+name)
        text=path.read_text()
        if forbidden.search(text):raise ValueError('Potential sensitive content detected (value not logged)')
        if path.suffix=='.svg':
            import xml.etree.ElementTree as ET
            svg=ET.fromstring(text)
            for el in svg.iter():
                if el.tag.split('}')[-1] in ['script','foreignObject','image','iframe']:raise ValueError('Active SVG content')
                for k,v in el.attrib.items():
                    if k.lower().startswith('on') or (k.split('}')[-1] in ['src','href'] and not v.startswith('#')):raise ValueError('External/active SVG reference')
    catalog=json.loads((root/'catalog.json').read_text())
    for description in catalog.get('scenarios',[]):
        allowed={'scenario_id','title','discussion_question','background','objectives','known_constraints','language','version','fictional'}
        if set(description)!=allowed:raise ValueError('Only approved scenario descriptions belong in the static library')
        if not all(isinstance(description[k],str) for k in ['scenario_id','title','discussion_question','background','language','version']):raise ValueError('Invalid scenario description text')
        if not all(isinstance(description[k],list) and all(isinstance(x,str) for x in description[k]) for k in ['objectives','known_constraints']):raise ValueError('Invalid scenario description list')
    slugs=[r['slug'] for r in catalog['recordings']]
    if len(slugs)!=len(set(slugs)) or slugs!=manifest.get('recordings',manifest['approved_recordings']):raise ValueError('Approved recording list mismatch')
    linked=fixed & set(files)
    for item in catalog['recordings']:
        expected_path=f'data/{item["slug"]}/recording.json'
        if item['path']!=expected_path or expected_path not in files:raise ValueError('Invalid recording path')
        linked.add(expected_path);recording=json.loads(files[expected_path].read_text())
        if recording['slug']!=item['slug'] or recording['mode']!='recorded':raise ValueError('Invalid recording identity')
        if {p['participant_id'] for p in recording['participants']}!={f'P{i}' for i in range(1,7)}:raise ValueError('Six anonymous actor IDs required')
        if set(recording['stages'])!={'Target','Represent','Identify','Assess','Decide'} or len(recording['tools'])!=11:raise ValueError('Stage/tool catalogue incomplete')
        deny={'private_history','role_card','role_cards','api_key','endpoint','session_id','internal_session_uuid','timestamp','timestamp_local','timestamp_utc','configuration','source_run'}
        def check(value):
            if isinstance(value,dict):
                if deny & value.keys():raise ValueError('Private metadata key in public data')
                for v in value.values():check(v)
            elif isinstance(value,list):
                for v in value:check(v)
        check(recording)
        for frame in recording['frames'].values():
            if set(frame['svgs'])!=set(recording['tools']):raise ValueError('Frame missing a tool')
            for paths in frame['svgs'].values():
                if not paths:raise ValueError('Tool has no SVG')
                for path in paths:
                    if not re.fullmatch(r'art/[a-f0-9]{64}\.svg',path):raise ValueError('Unsafe SVG path')
                    name=f'data/{item["slug"]}/{path}'
                    if name not in files:raise ValueError('Missing SVG')
                    linked.add(name)
        for stage in recording['stages'].values():
            if stage and stage['frame'] not in recording['frames']:raise ValueError('Broken stage snapshot link')
    if linked!=set(files):raise ValueError('Unreferenced public files are not allowed')
    return {'files':len(files),'recordings':slugs,'bytes':sum(p.stat().st_size for p in files.values())}


def validate_repository(root):
    root=Path(root)
    allowed={'.gitignore','README.md','.github/workflows/pages.yml','scripts/validate_pages.py'}
    for p in root.rglob('*'):
        rel=p.relative_to(root)
        if rel.parts[0]=='.git':continue
        if p.is_symlink():raise ValueError('Repository contains symlink')
        if p.is_file() and str(rel) not in allowed and rel.parts[:2]!=('deploy','pages'):raise ValueError('Repository includes files outside the publication allowlist')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',nargs='?',default='deploy/pages');p.add_argument('--repository');p.add_argument('--allow-preview',action='store_true');a=p.parse_args()
    if a.repository:validate_repository(a.repository)
    print(json.dumps(validate(a.root,allow_preview=a.allow_preview),ensure_ascii=False))
