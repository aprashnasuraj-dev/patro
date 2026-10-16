"""SQLite transactional quota/lease coordinator for a SHARED database.
Do not point separate GitHub runners at separate filesystem copies. Production requires an
authenticated centralized service backed by one transactional store (e.g. D1/DO).
"""
import sqlite3,time,uuid
class QuotaExceeded(RuntimeError):pass
class QuotaStore:
 def __init__(self,connection):
  self.db=connection;self.db.execute("PRAGMA busy_timeout=5000")
  self.db.executescript("""CREATE TABLE IF NOT EXISTS provider_quota(provider TEXT NOT NULL,window_key TEXT NOT NULL,lim INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(provider,window_key));
CREATE TABLE IF NOT EXISTS quota_reservations(request_key TEXT PRIMARY KEY,provider TEXT NOT NULL,window_key TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL);""")
 def reserve(self,provider,window_key,limit,request_key):
  if not provider or not window_key or not request_key or limit<=0:raise ValueError("Invalid reservation")
  self.db.execute("BEGIN IMMEDIATE")
  try:
   old=self.db.execute("SELECT provider,window_key,status FROM quota_reservations WHERE request_key=?",(request_key,)).fetchone()
   if old:
    if old[0]!=provider or old[1]!=window_key:raise ValueError("Idempotency key reused for another request")
    self.db.commit();return old[2]
   self.db.execute("INSERT OR IGNORE INTO provider_quota(provider,window_key,lim) VALUES (?,?,?)",(provider,window_key,limit))
   row=self.db.execute("UPDATE provider_quota SET used=used+1,lim=MIN(lim,?) WHERE provider=? AND window_key=? AND used < MIN(lim,?) RETURNING used",(limit,provider,window_key,limit)).fetchone()
   if not row:raise QuotaExceeded("Provider limit exhausted")
   self.db.execute("INSERT INTO quota_reservations VALUES (?,?,?,?,?)",(request_key,provider,window_key,"reserved",int(time.time())))
   self.db.commit();return "reserved"
  except BaseException:self.db.rollback();raise
 def complete(self,request_key):
  with self.db:self.db.execute("UPDATE quota_reservations SET status='completed' WHERE request_key=? AND status='reserved'",(request_key,))
 def used(self,provider,window_key):
  x=self.db.execute("SELECT used FROM provider_quota WHERE provider=? AND window_key=?",(provider,window_key)).fetchone();return x[0] if x else 0
