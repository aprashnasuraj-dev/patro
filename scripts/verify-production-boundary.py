#!/usr/bin/env python3
"""Check that production access cannot enter an ordinary Actions job."""
from pathlib import Path
import re
import sys
import yaml

REPOSITORY = 'aprashnasuraj-dev/patro'
WRITERS = {'release-gate.yml', 'history-hotfix.yml', 'explore-deploy.yml',
           'import-d1.yml', 'seed-history-r2.yml', 'places-calendar-deploy.yml'}

def validate(workflows):
    errors = []
    for filename, document in workflows.items():
        # PyYAML's YAML 1.1 loader treats the unquoted Actions `on` key as True.
        events = document.get('on', document.get(True, {})) or {}
        if isinstance(events, str):
            events = {events: None}
        if 'pull_request_target' in events or 'workflow_run' in events:
            errors.append(f'{filename}: privileged event requires explicit security review')
        production = []
        for job_name, job in document.get('jobs', {}).items():
            label = f'{filename}/{job_name}'
            serialized = yaml.safe_dump(job)
            secret_names = set(re.findall(r'secrets\.([A-Za-z_][A-Za-z0-9_]*)', serialized)) - {'GITHUB_TOKEN'}
            environment = job.get('environment')
            if isinstance(environment, dict):
                environment = environment.get('name')
            if secret_names and environment != 'production':
                errors.append(f'{label}: production secrets outside protected environment')
            if environment == 'production':
                production.append(job_name)
                condition = job.get('if', '')
                for required in [f"github.repository == '{REPOSITORY}'", "github.ref == 'refs/heads/main'",
                                 "vars.PATRO_PRODUCTION_APPROVAL_CONFIGURED == '1'"]:
                    if required not in condition:
                        errors.append(f'{label}: missing production guard: {required}')
                if not job.get('needs'):
                    errors.append(f'{label}: production must depend on unprivileged validation')
                if 'self-hosted' in str(job.get('runs-on')):
                    errors.append(f'{label}: shared self-hosted runner prohibited')
                for step in job.get('steps', []):
                    if str(step.get('uses', '')).startswith('actions/checkout@'):
                        settings = step.get('with', {})
                        if settings.get('ref') != '${{ github.sha }}' or settings.get('persist-credentials') is not False:
                            errors.append(f'{label}: checkout must pin event SHA and discard Git credentials')
            if re.search(r'secrets\.(?:git|GIT)\b', serialized):
                errors.append(f'{label}: legacy deployment token alias prohibited')
        if filename in WRITERS and not production:
            errors.append(f'{filename}: missing production environment')
    return errors

def main():
    root = Path(__file__).resolve().parents[1]
    workflows = {p.name: yaml.safe_load(p.read_text()) for p in (root / '.github/workflows').glob('*.yml')}
    errors = validate(workflows)
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Production boundary verified across {len(workflows)} workflows')
    return 0

if __name__ == '__main__':
    sys.exit(main())
