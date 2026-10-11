import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import server


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DB = Path(cls.temp.name) / 'test.db'
        server.initialize()
        cls.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.url = 'http://127.0.0.1:' + str(cls.http.server_port)
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.temp.cleanup()

    def request(self, path='/api/feed', body=None):
        request = Request(
            self.url + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={'Content-Type': 'application/json'}
        )
        with urlopen(request) as response:
            return json.load(response)

    def test_seed_and_feedback(self):
        data = self.request()
        self.assertEqual(len(data['windows']), 20)
        self.assertTrue(all(w['created_at'] for w in data['windows']))
        self.assertTrue(all(len(w['comments']) == 3 for w in data['windows']))
        original = next(w for w in data['windows'] if w['id'] == 1)
        for vote in [1, -1, 0]:
            data = self.request('/api/vote', {'windowId': 1, 'value': vote})
            w = next(w for w in data['windows'] if w['id'] == 1)
            self.assertEqual(w['votes'], original['base_votes'] + vote)
        for target, value in [('dish', 5), ('window', 3)]:
            self.request('/api/rate', {'windowId': 1, 'target': target, 'value': value})
        data = self.request('/api/comment', {'windowId': 1, 'target': 'window', 'text': 'Friendly service'})
        w = next(w for w in data['windows'] if w['id'] == 1)
        self.assertEqual(w['myRatings'], {'dish': 5, 'window': 3})
        self.assertEqual(w['comments'][0]['text'], 'Friendly service')
        self.assertEqual(w['comments'][0]['target'], 'window')
        self.assertEqual(len(self.request()['windows']), 20)

    def test_validation(self):
        for path, body in [
            ('/api/vote', {'windowId': 999, 'value': 1}),
            ('/api/rate', {'windowId': 1, 'value': 6}),
            ('/api/comment', {'windowId': 1, 'text': ' '}),
            ('/api/profile', {'cuisines': ['Invalid'], 'budget': 10})
        ]:
            with self.assertRaises(HTTPError) as error:
                self.request(path, body)
            self.assertEqual(error.exception.code, 400)

    def test_vegetarian_recommendations(self):
        profile = {'cuisines': ['Vegetarian'], 'budget': 8, 'vegetarian': True}
        data = self.request('/api/profile', profile)
        self.assertEqual(data['profile'], profile)
        self.assertLess(len(data['windows']), 20)
        self.assertEqual(data['windows'][0]['cuisine'], 'Vegetarian')
        self.assertNotIn(1, [w['id'] for w in data['windows']])
        self.request('/api/profile', {'cuisines': ['Asian', 'Italian'], 'budget': 12, 'vegetarian': False})


if __name__ == '__main__':
    unittest.main()
