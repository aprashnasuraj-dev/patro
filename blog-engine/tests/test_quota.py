import sqlite3,tempfile,unittest,threading
from pathlib import Path
from engine.quota_store import QuotaStore,QuotaExceeded
class QuotaTests(unittest.TestCase):
 def test_atomic_limit_and_replay_across_connections(self):
  with tempfile.TemporaryDirectory() as d:
   p=str(Path(d)/"shared.sqlite");success=[];errors=[]
   init=sqlite3.connect(p);QuotaStore(init);init.close()
   def go(i):
    con=sqlite3.connect(p,timeout=10);q=QuotaStore(con)
    try:
     result=q.reserve("groq","2026-10-16",5,"req-"+str(i))
     success.append((i,result))
    except QuotaExceeded:errors.append(i)
    finally:con.close()
   threads=[threading.Thread(target=go,args=(i,)) for i in range(12)]
   for t in threads:t.start()
   for t in threads:t.join()
   self.assertEqual(len(success),5);self.assertEqual(len(errors),7)
   con=sqlite3.connect(p);q=QuotaStore(con);self.assertEqual(q.used("groq","2026-10-16"),5)
   successful_id=success[0][0]
   self.assertEqual(q.reserve("groq","2026-10-16",5,"req-"+str(successful_id)),"reserved")
   self.assertEqual(q.used("groq","2026-10-16"),5)
   con.close()
if __name__=="__main__":unittest.main()
