"""Narrow offline bridge. One JSON request on stdin; no daemon or host hooks.

Only a dedicated container volume is writable. No network, provider CLI,
arbitrary file ingestion, secret export, or policy mutation is exposed.
"""
import json
import os
import sys
import hashlib
import uuid
import fcntl
import signal
from dataclasses import asdict
from pathlib import Path


ROOT = Path('/home/brain/.iai-mcp')
MAPPING = ROOT / 'brain-mapping.json'
REVISION = 'b586c2a35e413e239756f321aa5398a82501b671'


def atomic_json(path, value):
    tmp = path.with_name(path.name + '.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, path)


def source_hashes():
    import iai_mcp
    base = Path(iai_mcp.__file__).parent
    names = ['capture.py', 'crypto.py', 'embed.py', 'retrieve.py', 'store/_store.py', 'hippo/_table.py', 'core/__init__.py']
    return {name: hashlib.sha256((base / name).read_bytes()).hexdigest() for name in names}


def handle(request):
    from verify_model import verify
    model = verify()
    from importlib.metadata import version
    fingerprints = source_hashes()
    if version('iai-pme') != '3.1.0' or fingerprints != json.loads(Path('/opt/brain/fingerprints.json').read_text()):
        raise ValueError('Installed release does not match reviewed source fingerprints')
    if request.get('operation') == 'status':
        return {'version': version('iai-pme'), 'offline': os.environ.get('HF_HUB_OFFLINE'),
                'reflection_disabled': os.environ.get('IAI_MCP_REM_DISABLED'), 'source_hashes': fingerprints, 'model': model}
    if request.get('operation') not in {'ingest', 'recall', 'audit'}:
        raise ValueError('Unknown operation')
    key = ROOT / '.crypto.key'
    if not key.exists():
        if any(p.name != 'brain-bridge.lock' for p in ROOT.iterdir()):
            raise ValueError('Missing key on nonempty store; refusing replacement')
        from iai_mcp.crypto import write_key_material
        write_key_material(key, os.urandom(32))
    from iai_mcp.crypto import CryptoKey
    CryptoKey(store_root=ROOT).get_or_create()  # fail before any capture
    from iai_mcp.store import MemoryStore, flush_record_buffer
    class ReplayStore(MemoryStore):
        def _feed_working(self, record):
            # Library store.insert feeds the live working tier regardless of
            # capture_turn(live_turn=False). A replay index has no active task.
            # Disable that integration hook, not the encrypted record/index path.
            return
    # Remove only the rebuildable caches produced by the first public-corpus
    # smoke test. Never remove records, key material, or canonical evidence.
    removed_caches = []
    for pattern in ('.working-tier.*.cached.md', '.session-continuity.cached.md'):
        for cache in ROOT.glob(pattern):
            if cache.is_file():
                cache.unlink()
                removed_caches.append(cache.name)
    mapping = json.loads(MAPPING.read_text()) if MAPPING.exists() else {'schema': 1, 'entries': {}}
    if mapping.get('schema') != 1:
        raise ValueError('Unknown mapping format')
    store = ReplayStore(ROOT)
    try:
        if request['operation'] == 'ingest':
            from iai_mcp.capture import capture_turn
            import re
            added = 0
            requests = request.get('requests')
            if not isinstance(requests, list) or len(requests) > 500:
                raise ValueError('Expected at most 500 captures')
            for item in requests:
                source_id, part = item['source_id'], item['part']
                text = item['params']['text']
                if not re.fullmatch(r'm_[a-f0-9]{64}', source_id) or type(part) is not int or not 0 <= part < 100:
                    raise ValueError('Invalid source identity')
                if not isinstance(text, str) or not 12 <= len(text) <= 8000:
                    raise ValueError('Invalid text size')
                digest = hashlib.sha256(text.encode()).hexdigest()
                if digest != item['part_sha256']:
                    raise ValueError('Capture fragment digest mismatch')
                source_uuid = str(uuid.uuid5(uuid.NAMESPACE_URL, f'one-of-you:{source_id}:{part}:{digest}'))
                entry = mapping['entries'].get(source_uuid)
                if entry:
                    rec = store.get(uuid.UUID(entry['engine_id']))
                    if rec is None or rec.literal_surface != text.strip() or entry['part_sha256'] != digest:
                        raise ValueError('Persisted mapping does not match source')
                    continue
                outcome = capture_turn(store, text=text, cue=text[:500], tier='episodic',
                    session_id=f'repository-import:{source_id}', source_uuid=source_uuid,
                    role='assistant', live_turn=False, near_dup_gate=False,
                    directive=False, directive_marker_allowed=False,
                    provenance_extra={'brain_source_id': source_id, 'brain_part': part, 'brain_sha256': digest})
                flush_record_buffer(store)
                engine_id = outcome.get('record_id')
                rec = store.get(uuid.UUID(engine_id)) if engine_id else None
                if rec is None or rec.literal_surface != text.strip() or rec.directive:
                    raise ValueError(f'Capture not verified: {outcome.get("status")}')
                mapping['entries'][source_uuid] = {'source_id': source_id, 'part': part,
                    'part_sha256': digest, 'engine_id': engine_id}
                atomic_json(MAPPING, mapping)
                added += 1
            return {'added': added, 'mapped': len(mapping['entries']), 'mapping': list(mapping['entries'].values())}
        if request['operation'] == 'recall':
            cue = request.get('cue')
            if not isinstance(cue, str) or not 1 <= len(cue) <= 4000:
                raise ValueError('Expected bounded query')
            from iai_mcp.embed import embedder_for_store
            from iai_mcp.retrieve import recall
            vector = embedder_for_store(store).embed_query(cue)
            result = recall(store, vector, cue, 'brain-retrieval', budget_tokens=8000, k_hits=10)
            payload = asdict(result)
            return {'hits': payload['hits'], 'anti_hits': payload['anti_hits'],
                    'mapping': list(mapping['entries'].values())}
        missing, directives, plain = [], [], []
        needles = []
        for entry in mapping['entries'].values():
            rec = store.get(uuid.UUID(entry['engine_id']))
            if rec is None:
                missing.append(entry['engine_id'])
            else:
                if rec.directive:
                    directives.append(entry['engine_id'])
                needles.append(rec.literal_surface.encode())
        for file in ROOT.rglob('*'):
            if file.is_file() and file.name != '.crypto.key':
                data = file.read_bytes()
                if any(len(n) >= 32 and n in data for n in needles):
                    plain.append(str(file.relative_to(ROOT)))
        return {'mapped': len(mapping['entries']), 'missing': missing, 'directives': directives,
                'plaintext_full_passage_files': plain, 'removed_legacy_caches': removed_caches,
                'key_mode': oct(key.stat().st_mode & 0o777)}
    finally:
        store.close()


def main():
    # Independent of the host client: even host death cannot leave this bridge
    # running forever. SIGALRM terminates the process; next run recovers storage.
    # PID 1 ignores many default signal dispositions; install an explicit exit.
    signal.signal(signal.SIGALRM, lambda signum, frame: os._exit(124))
    signal.alarm(150)
    raw = sys.stdin.buffer.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError('Request too large')
    request = json.loads(raw)
    ROOT.mkdir(parents=True, exist_ok=True)
    # Lock spans mapping + engine together, including store.close/checkpoint.
    with (ROOT / 'brain-bridge.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        print(json.dumps(handle(request), default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)[:300]}))
        sys.exit(1)
