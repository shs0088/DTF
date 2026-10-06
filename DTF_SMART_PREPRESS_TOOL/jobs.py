from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass, asdict
from threading import Lock
from typing import Callable, Any, Dict
from uuid import uuid4

@dataclass
class Job:
    id: str
    state: str="queued"
    result: Any=None
    error: str|None=None

class BoundedJobQueue:
    def __init__(self,max_workers:int=2):
        if max_workers<1: raise ValueError("max_workers must be >= 1")
        self.pool=ThreadPoolExecutor(max_workers=max_workers,thread_name_prefix="dtf-prepress")
        self.jobs: Dict[str,Job]={}; self.futures: Dict[str,Future]={}; self.lock=Lock()

    def submit(self,fn:Callable,*args,**kwargs)->str:
        jid=uuid4().hex
        with self.lock: self.jobs[jid]=Job(jid)
        def run():
            with self.lock: self.jobs[jid].state="running"
            try:
                value=fn(*args,**kwargs)
                with self.lock:
                    self.jobs[jid].state="completed"; self.jobs[jid].result=value
            except Exception as e:
                with self.lock:
                    self.jobs[jid].state="failed"; self.jobs[jid].error=f"{type(e).__name__}: {e}"
        fut=self.pool.submit(run)
        with self.lock: self.futures[jid]=fut
        return jid

    def status(self,jid:str)->dict:
        with self.lock:
            if jid not in self.jobs: raise KeyError(jid)
            return asdict(self.jobs[jid])

    def cancel(self,jid:str)->bool:
        with self.lock:
            fut=self.futures.get(jid); job=self.jobs.get(jid)
            if fut is None or job is None: raise KeyError(jid)
            ok=fut.cancel()
            if ok: job.state="cancelled"
            return ok
