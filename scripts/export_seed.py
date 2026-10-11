"""Export only fresh mock data; never publish the local SQLite database."""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import server

with tempfile.TemporaryDirectory() as directory:
    server.DB = Path(directory) / 'seed.db'
    server.initialize()
    output = Path(__file__).resolve().parents[1] / 'frontend/src/seed.json'
    output.write_text(json.dumps(server.feed(), ensure_ascii=False, indent=4) + '\n')
