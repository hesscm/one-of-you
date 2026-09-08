"""Verify the exact cached model artifacts. No network or fallback download."""
import hashlib
import json
from pathlib import Path


def verify():
    lock = json.loads(Path('/opt/brain/model-lock.json').read_text())
    snapshot = Path('/opt/models/hub') / ('models--' + lock['repository'].replace('/', '--')) / 'snapshots' / lock['revision']
    for name, expected in lock['files'].items():
        digest = hashlib.sha256()
        with (snapshot / name).open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        if digest.hexdigest() != expected:
            raise ValueError('Embedding model artifact digest mismatch')
    return {'repository': lock['repository'], 'revision': lock['revision'], 'files_verified': len(lock['files'])}


if __name__ == '__main__':
    print(json.dumps(verify()))
