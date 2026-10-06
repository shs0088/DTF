from __future__ import annotations
from pathlib import Path
from datetime import datetime,timezone
import sqlite3,json
from typing import Dict,Any
from provenance import sha256_file

class AssetRegistry:
    def __init__(self,db_path:str="runtime_assets.sqlite3"):
        self.db_path=db_path
        self._init()

    def _conn(self):
        c=sqlite3.connect(self.db_path,timeout=30)
        c.execute("PRAGMA journal_mode=WAL")
        return c

    def _init(self):
        with self._conn() as c:
            c.execute("""CREATE TABLE IF NOT EXISTS assets(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              sha256 TEXT NOT NULL,
              role TEXT NOT NULL,
              parent_sha256 TEXT,
              operation TEXT,
              params_json TEXT,
              created_utc TEXT NOT NULL,
              path TEXT NOT NULL
            )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_assets_sha ON assets(sha256)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_sha256)")

    def register(self,path:str,role:str,parent_sha256:str|None=None,
                 operation:str|None=None,parameters:Dict[str,Any]|None=None)->dict:
        p=Path(path)
        rec={"sha256":sha256_file(str(p)),"role":role,"parent_sha256":parent_sha256,
             "operation":operation,"parameters":parameters or {},
             "created_utc":datetime.now(timezone.utc).isoformat(),"path":str(p)}
        with self._conn() as c:
            cur=c.execute("""INSERT INTO assets(sha256,role,parent_sha256,operation,params_json,created_utc,path)
                          VALUES(?,?,?,?,?,?,?)""",
                          (rec["sha256"],role,parent_sha256,operation,json.dumps(rec["parameters"],ensure_ascii=False),
                           rec["created_utc"],rec["path"]))
            rec["id"]=cur.lastrowid
        return rec

    def lineage(self,sha256:str)->list[dict]:
        with self._conn() as c:
            rows=c.execute("""SELECT id,sha256,role,parent_sha256,operation,params_json,created_utc,path
                              FROM assets WHERE sha256=? OR parent_sha256=? ORDER BY id""",(sha256,sha256)).fetchall()
        return [{"id":r[0],"sha256":r[1],"role":r[2],"parent_sha256":r[3],"operation":r[4],
                 "parameters":json.loads(r[5] or "{}"),"created_utc":r[6],"path":r[7]} for r in rows]
