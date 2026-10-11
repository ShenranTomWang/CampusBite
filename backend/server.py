"""Campus Bites demo API. Python standard library + SQLite, no dependencies."""
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

DB = Path(__file__).with_name('campus.db')
NAMES = [
    ('Wok & Roll', 'Ginger scallion chicken', 'Asian', 8.50, '🍜', 'photo-1512058564366-18510be2db19'),
    ('Pasta Social', 'Creamy mushroom pasta', 'Italian', 9.00, '🍝', 'photo-1473093295043-cdd812d0e601'),
    ('Green Theory', 'Harvest grain bowl', 'Vegetarian', 7.50, '🥗', 'photo-1512621776951-a57141f2eefd'),
    ('Seoul Kitchen', 'Korean bibimbap', 'Asian', 9.50, '🍚', 'photo-1498654896293-37aacf113fd9'),
    ('Smash Lab', 'Double smash burger', 'American', 10.00, '🍔', 'photo-1568901346375-23c9450c58cd'),
    ('Taco Tuesday', 'Roasted veggie tacos', 'Mexican', 7.00, '🌮', 'photo-1551504734-5ee1c4a1479b'),
    ('Curry Corner', 'Chickpea coconut curry', 'Indian', 8.00, '🍛', 'photo-1603894584373-5ac82b2ae398'),
    ('The Dumpling Club', 'Chili crisp dumplings', 'Asian', 7.50, '🥟', 'photo-1563245372-f21724e3856d'),
    ('Slice of Campus', 'Margherita pizza', 'Italian', 6.50, '🍕', 'photo-1579751626657-72bc17010498'),
    ('Morning People', 'Avocado sourdough toast', 'Vegetarian', 6.00, '🥑', 'photo-1525351484163-7529414344d8'),
    ('Pho Real', 'Beef noodle soup', 'Asian', 9.00, '🍲', 'photo-1569718212165-3a8278d5f624'),
    ('Wrap Session', 'Falafel hummus wrap', 'Vegetarian', 7.00, '🌯', 'photo-1512621776951-a57141f2eefd'),
    ('Fire & Rice', 'Spicy chicken rice bowl', 'Asian', 8.00, '🌶️', 'photo-1512058564366-18510be2db19'),
    ('Comfort Kitchen', 'Mac and cheese', 'American', 6.50, '🧀', 'photo-1473093295043-cdd812d0e601'),
    ('Bombay Bites', 'Paneer tikka bowl', 'Indian', 8.50, '🍛', 'photo-1603894584373-5ac82b2ae398'),
    ('Fresh Catch', 'Salmon poke bowl', 'Asian', 11.00, '🐟', 'photo-1498654896293-37aacf113fd9'),
    ('Garden Table', 'Crispy tofu salad', 'Vegetarian', 7.50, '🥬', 'photo-1512621776951-a57141f2eefd'),
    ('Grill Society', 'BBQ chicken sandwich', 'American', 8.50, '🥪', 'photo-1568901346375-23c9450c58cd'),
    ('Casa Verde', 'Black bean burrito bowl', 'Mexican', 7.50, '🫘', 'photo-1551504734-5ee1c4a1479b'),
    ('Little Napoli', 'Basil pesto gnocchi', 'Italian', 9.50, '🌿', 'photo-1473093295043-cdd812d0e601')
]

def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def initialize():
    with connect() as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS windows (
                id INTEGER PRIMARY KEY, name TEXT, dish TEXT, cuisine TEXT,
                price REAL, emoji TEXT, photo TEXT, base_rating REAL, base_count INTEGER,
                base_votes INTEGER, hall TEXT
            );
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY, window_id INTEGER, author TEXT, text TEXT, target TEXT
            );
            CREATE TABLE IF NOT EXISTS votes (window_id INTEGER PRIMARY KEY, value INTEGER);
            CREATE TABLE IF NOT EXISTS ratings (
                window_id INTEGER, target TEXT, value INTEGER, PRIMARY KEY(window_id, target)
            );
            CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY, data TEXT);
        ''')
        columns = {row['name'] for row in db.execute('PRAGMA table_info(windows)')}
        if 'created_at' not in columns:
            db.execute('ALTER TABLE windows ADD COLUMN created_at TEXT')
        if db.execute('SELECT COUNT(*) FROM windows').fetchone()[0] == 0:
            for i, item in enumerate(NAMES, 1):
                db.execute('INSERT INTO windows (id,name,dish,cuisine,price,emoji,photo,base_rating,base_count,base_votes,hall) VALUES (?,?,?,?,?,?,?,?,?,?,?)', (
                    i, *item, round(4.2 + (i % 7) * .1, 1), 32 + i * 7,
                    50 + (21 - i) * 13, ['North Commons', 'Student Union', 'South Dining Hall'][(i - 1) % 3]
                ))
                for author, comment in [
                    ('Jamie L.', 'My go-to between classes. Great portions for the price!'),
                    ('Alex K.', 'Tried this today and loved it. The line moves pretty quickly.'),
                    ('Sam R.', 'Really good flavor! Would definitely come back with friends.')
                ]:
                    db.execute('INSERT INTO comments (window_id,author,text,target) VALUES (?,?,?,?)', (
                        i, author, comment, 'dish' if author != 'Alex K.' else 'window'
                    ))

        added = datetime.now(timezone.utc)
        for i in range(1, 21):
            created_at = (added - timedelta(days=(20 - i) * 2)).isoformat()
            db.execute(
                'UPDATE windows SET created_at=? WHERE id=? AND created_at IS NULL',
                (created_at, i)
            )


def feed():
    with connect() as db:
        row = db.execute('SELECT data FROM profile WHERE id=1').fetchone()
        profile = json.loads(row[0]) if row else {'cuisines': ['Asian', 'Italian'], 'budget': 12, 'vegetarian': False}
        result = []
        for window in db.execute('SELECT * FROM windows'):
            item = dict(window)
            vote = db.execute('SELECT value FROM votes WHERE window_id=?', (item['id'],)).fetchone()
            item['myVote'] = vote[0] if vote else 0
            item['votes'] = item['base_votes'] + item['myVote']
            item['comments'] = [dict(c) for c in db.execute('SELECT * FROM comments WHERE window_id=? ORDER BY id DESC', (item['id'],))]
            item['myRatings'] = {r['target']: r['value'] for r in db.execute('SELECT * FROM ratings WHERE window_id=?', (item['id'],))}
            own = list(item['myRatings'].values())
            item['rating'] = round((item['base_rating'] * item['base_count'] + sum(own)) / (item['base_count'] + len(own)), 1)
            item['ratingCount'] = item['base_count'] + len(own)
            matched = item['cuisine'] in profile['cuisines']
            item['reason'] = 'Matches your taste' if matched else 'Loved on campus'
            item['score'] = (3 if matched else 0) + item['rating'] + item['votes'] / 200 + (1 if item['price'] <= profile['budget'] else -3)
            if not profile['vegetarian'] or item['cuisine'] == 'Vegetarian' or item['id'] in [2, 6, 7, 9, 14, 15, 19, 20]:
                result.append(item)
        return {'windows': sorted(result, key=lambda w: -w['score']), 'profile': profile}


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if urlparse(self.path).path == '/api/feed':
            self.reply(200, feed())
        else:
            self.reply(404, {'error': 'Not found'})

    def do_POST(self):
        try:
            size = int(self.headers.get('Content-Length', 0))
            if size > 10000:
                raise ValueError('Request too large')
            data = json.loads(self.rfile.read(size))
            path = urlparse(self.path).path
            with connect() as db:
                if path == '/api/profile':
                    cuisines = data.get('cuisines', [])
                    if not isinstance(cuisines, list) or any(c not in ['Asian', 'Italian', 'Vegetarian', 'American', 'Mexican', 'Indian'] for c in cuisines):
                        raise ValueError('Invalid cuisines')
                    budget = float(data.get('budget', 12))
                    if not 5 <= budget <= 15:
                        raise ValueError('Invalid budget')
                    db.execute('INSERT OR REPLACE INTO profile VALUES (1,?)', (json.dumps({
                        'cuisines': cuisines, 'budget': budget, 'vegetarian': bool(data.get('vegetarian'))
                    }),))
                elif path in ['/api/vote', '/api/rate', '/api/comment']:
                    wid = int(data['windowId'])
                    if not db.execute('SELECT id FROM windows WHERE id=?', (wid,)).fetchone():
                        raise ValueError('Unknown window')
                    if path == '/api/vote':
                        value = int(data['value'])
                        if value not in [-1, 0, 1]:
                            raise ValueError('Invalid vote')
                        db.execute('INSERT OR REPLACE INTO votes VALUES (?,?)', (wid, value))
                    else:
                        target = data.get('target', 'dish')
                        if target not in ['dish', 'window']:
                            raise ValueError('Invalid target')
                        if path == '/api/rate':
                            value = int(data['value'])
                            if value not in range(1, 6):
                                raise ValueError('Rating must be 1–5')
                            db.execute('INSERT OR REPLACE INTO ratings VALUES (?,?,?)', (wid, target, value))
                        else:
                            comment = str(data.get('text', '')).strip()
                            if not 1 <= len(comment) <= 500:
                                raise ValueError('Comment must be 1–500 characters')
                            db.execute('INSERT INTO comments (window_id,author,text,target) VALUES (?,?,?,?)', (wid, 'You', comment, target))
                else:
                    self.reply(404, {'error': 'Not found'})
                    return
            self.reply(200, feed())
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            self.reply(400, {'error': str(error)})


if __name__ == '__main__':
    initialize()
    print('Campus Bites API → http://127.0.0.1:8000', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
