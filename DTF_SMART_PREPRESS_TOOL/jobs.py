from concurrent.futures import ThreadPoolExecutor,Future
from dataclasses import dataclass,asdict
from threading import Lock
from typing import Callable,Any,Dict
from uuid import uuid4
from datetime import datetime,timezone
from pathlib import Path
import sqlite3,json

@dataclass
class Job:
    id:str
    state:str="queued"
    result:Any=None
    error:str|None=None
    created_utc:str|None=None
    updated_utc:str|None=None

class PersistentJobQueue:
    def __init__(self,max_workers:int=2,db_path:str="runtime_jobs.sqlite3"):
        if max_workers<1: raise ValueError("max_workers must be >= 1")
        self.pool=ThreadPoolExecutor(max_workers=max_workers,thread_name_prefix="dtf-prepress")
        self.db_path=str(Path(db_path)); self.futures:Dict[str,Future]={}; self.lock=Lock()
        self._init_db()
        self._mark_interrupted()

    def _conn(self):
        c=sqlite3.connect(self.db_path,timeout=30)
        c.execute("PRAGMA journal_mode=WAL")
        return c

    def _init_db(self):
        with self._conn() as c:
            c.execute("""CREATE TABLE IF NOT EXISTS jobs(
              id TEXT PRIMARY KEY,state TEXT NOT NULL,result_json TEXT,error TEXT,
              created_utc TEXT NOT NULL,updated_utc TEXT NOT NULL)""")

    def _now(self): return datetime.now(timezone.utc).isoformat()

    def _mark_interrupted(self):
        now=self._now()
        with self._conn() as c:
            c.execute("UPDATE jobs SET state='interrupted',updated_utc=? WHERE state IN ('queued','running')",(now,))

    def _insert(self,jid:str):
        now=self._now()
        with self._conn() as c:
            c.execute("INSERT INTO jobs(id,state,created_utc,updated_utc) VALUES(?,?,?,?)",(jid,"queued",now,now))

    def _update(self,jid:str,state:str,result:Any=None,error:str|None=None):
        now=self._now()
        rj=None if result is None else json.dumps(result,ensure_ascii=False)
        with self._conn() as c:
            c.execute("UPDATE jobs SET state=?,result_json=?,error=?,updated_utc=? WHERE id=?",
                      (state,rj,error,now,jid))

    def submit(self,fn:Callable,*args,**kwargs)->str:
        jid=uuid4().hex
        self._insert(jid)
        def run():
            self._update(jid,"running")
            try:
                value=fn(*args,**kwargs); self._update(jid,"completed",result=value)
            except Exception as e:
                self._update(jid,"failed",error=f"{type(e).__name__}: {e}")
        fut=self.pool.submit(run)
        with self.lock: self.futures[jid]=fut
        return jid

    def status(self,jid:str)->dict:
        with self._conn() as c:
            row=c.execute("SELECT id,state,result_json,error,created_utc,updated_utc FROM jobs WHERE id=?",(jid,)).fetchone()
        if row is None: raise KeyError(jid)
        result=json.loads(row[2]) if row[2] else None
        return asdict(Job(row[0],row[1],result,row[3],row[4],row[5]))

    def cancel(self,jid:str)->bool:
        with self.lock: fut=self.futures.get(jid)
        if fut is None:
            state=self.status(jid)["state"]
            return False if state in ("completed","failed","cancelled","interrupted") else False
        ok=fut.cancel()
        if ok: self._update(jid,"cancelled")
        return ok

    def list_recent(self,limit:int=50)->list[dict]:
        limit=max(1,min(int(limit),500))
        with self._conn() as c:
            rows=c.execute("SELECT id,state,result_json,error,created_utc,updated_utc FROM jobs ORDER BY created_utc DESC LIMIT ?",(limit,)).fetchall()
        out=[]
        for row in rows:
            out.append(asdict(Job(row[0],row[1],json.loads(row[2]) if row[2] else None,row[3],row[4],row[5])))
        return out

# Backward-compatible name used by earlier code/tests.
BoundedJobQueue=PersistentJobQueue
