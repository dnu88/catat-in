"""Dependency regression: worker replacements must remain supervised.

Process doubles deliberately avoid spawning or killing application workers.
This tests the installed dependency, not a copied replacement algorithm.
"""

import threading
from unittest.mock import patch

import pytest
from uvicorn.supervisors import multiprocess


class WorkerDouble:
    def __init__(self, alive):
        self.alive = alive
        self.pid = id(self)
        self.started = False
        self.killed = False

    def is_alive(self):
        return self.alive and not self.killed

    def kill(self):
        self.killed = True

    def join(self):
        pass

    def start(self):
        self.started = True


@pytest.mark.parametrize("failed", [(False, False), (False, True), (True, False)])
def test_worker_recovery_preserves_all_running_replacements(failed):
    supervisor = multiprocess.Multiprocess.__new__(multiprocess.Multiprocess)
    supervisor.processes = [WorkerDouble(alive) for alive in failed]
    supervisor.should_exit = threading.Event()
    supervisor.config = None
    supervisor.target = None
    supervisor.sockets = []
    created = []

    def factory(*args):
        worker = WorkerDouble(True)
        created.append(worker)
        return worker

    with patch.object(multiprocess, "Process", side_effect=factory):
        for _ in range(3):
            supervisor.keep_subprocess_alive()
            assert len(supervisor.processes) == 2
            assert all(worker.is_alive() for worker in supervisor.processes)
            assert all(worker in supervisor.processes for worker in created)
    assert len(created) == sum(not alive for alive in failed)
