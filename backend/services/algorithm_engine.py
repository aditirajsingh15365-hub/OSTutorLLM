"""Deterministic CPU scheduling and Banker's safety calculations."""

from collections import deque
from typing import Iterable


def _validate_processes(processes: Iterable[dict]) -> list[dict]:
    result = []
    seen = set()
    for order, process in enumerate(processes):
        pid = str(process.get("pid", "")).strip()
        arrival = int(process.get("arrival", 0))
        burst = int(process["burst"])
        if not pid or pid in seen:
            raise ValueError("Process IDs must be present and unique.")
        if arrival < 0 or burst <= 0:
            raise ValueError("Arrival times must be non-negative and burst times positive.")
        seen.add(pid)
        result.append({**process, "pid": pid, "arrival": arrival, "burst": burst,
                       "priority": int(process.get("priority", 0)), "order": order})
    if not result:
        raise ValueError("At least one process is required.")
    return result


def calculate_cpu_schedule(processes: Iterable[dict], algorithm: str, quantum: int | None = None) -> dict:
    """Return Gantt segments and per-process timing metrics.

    Supported algorithms: FCFS, SJF, SRTF, PRIORITY, PRIORITY_PREEMPTIVE,
    and RR. A lower numeric priority is treated as higher priority.
    """
    jobs = _validate_processes(processes)
    name = algorithm.upper().replace("-", "_").replace(" ", "_")
    if name in {"ROUND_ROBIN", "ROBIN", "RR"}:
        name = "RR"
        if quantum is None or int(quantum) <= 0:
            raise ValueError("Round Robin requires a positive time quantum.")
        quantum = int(quantum)
    supported = {"FCFS", "SJF", "SRTF", "PRIORITY", "PRIORITY_PREEMPTIVE", "RR"}
    if name not in supported:
        raise ValueError(f"Unsupported CPU scheduling algorithm: {algorithm}")

    segments = []

    def add_segment(pid, start, end):
        if end <= start:
            return
        if segments and segments[-1]["pid"] == pid and segments[-1]["end"] == start:
            segments[-1]["end"] = end
        else:
            segments.append({"pid": pid, "start": start, "end": end})

    completion = {}
    first_run = {}

    if name in {"FCFS", "SJF", "PRIORITY"}:
        remaining = list(jobs)
        time = 0
        while remaining:
            ready = [p for p in remaining if p["arrival"] <= time]
            if not ready:
                next_arrival = min(p["arrival"] for p in remaining)
                add_segment("IDLE", time, next_arrival)
                time = next_arrival
                ready = [p for p in remaining if p["arrival"] <= time]
            if name == "FCFS":
                current = min(ready, key=lambda p: (p["arrival"], p["order"]))
            elif name == "SJF":
                current = min(ready, key=lambda p: (p["burst"], p["arrival"], p["order"]))
            else:
                current = min(ready, key=lambda p: (p["priority"], p["arrival"], p["order"]))
            first_run.setdefault(current["pid"], time)
            end = time + current["burst"]
            add_segment(current["pid"], time, end)
            time = end
            completion[current["pid"]] = time
            remaining.remove(current)
    elif name in {"SRTF", "PRIORITY_PREEMPTIVE"}:
        remaining = {p["pid"]: p["burst"] for p in jobs}
        time = 0
        done = set()
        while len(done) < len(jobs):
            ready = [p for p in jobs if p["arrival"] <= time and p["pid"] not in done]
            if not ready:
                next_arrival = min(p["arrival"] for p in jobs if p["pid"] not in done)
                add_segment("IDLE", time, next_arrival)
                time = next_arrival
                continue
            if name == "SRTF":
                current = min(ready, key=lambda p: (remaining[p["pid"]], p["arrival"], p["order"]))
            else:
                current = min(ready, key=lambda p: (p["priority"], p["arrival"], p["order"]))
            pid = current["pid"]
            first_run.setdefault(pid, time)
            add_segment(pid, time, time + 1)
            remaining[pid] -= 1
            time += 1
            if remaining[pid] == 0:
                done.add(pid)
                completion[pid] = time
    else:  # RR
        time = 0
        ordered = sorted(jobs, key=lambda p: (p["arrival"], p["order"]))
        remaining = {p["pid"]: p["burst"] for p in jobs}
        ready = deque()
        next_idx = 0
        while len(completion) < len(jobs):
            if not ready and next_idx < len(ordered) and time < ordered[next_idx]["arrival"]:
                add_segment("IDLE", time, ordered[next_idx]["arrival"])
                time = ordered[next_idx]["arrival"]
            while next_idx < len(ordered) and ordered[next_idx]["arrival"] <= time:
                ready.append(ordered[next_idx]["pid"])
                next_idx += 1
            if not ready:
                continue
            pid = ready.popleft()
            first_run.setdefault(pid, time)
            run_for = min(quantum, remaining[pid])
            end = time + run_for
            add_segment(pid, time, end)
            time = end
            remaining[pid] -= run_for
            while next_idx < len(ordered) and ordered[next_idx]["arrival"] <= time:
                ready.append(ordered[next_idx]["pid"])
                next_idx += 1
            if remaining[pid] == 0:
                completion[pid] = time
            else:
                ready.append(pid)

    metrics = []
    for process in jobs:
        pid = process["pid"]
        turnaround = completion[pid] - process["arrival"]
        metrics.append({
            "pid": pid,
            "completion": completion[pid],
            "turnaround": turnaround,
            "waiting": turnaround - process["burst"],
            "response": first_run[pid] - process["arrival"],
        })
    return {
        "algorithm": name,
        "quantum": quantum,
        "segments": segments,
        "metrics": metrics,
        "average_waiting": sum(m["waiting"] for m in metrics) / len(metrics),
        "average_turnaround": sum(m["turnaround"] for m in metrics) / len(metrics),
    }


def bankers_safety(available: list[int], allocation: list[list[int]], maximum: list[list[int]]) -> dict:
    """Run Banker's safety test and return the need matrix and safe sequence."""
    if not allocation or len(allocation) != len(maximum):
        raise ValueError("Allocation and maximum matrices must have the same non-zero row count.")
    resource_count = len(available)
    if resource_count == 0 or any(len(row) != resource_count for row in allocation + maximum):
        raise ValueError("Every process row must match the available vector dimensions.")
    values = list(available) + [v for row in allocation + maximum for v in row]
    if any(int(v) < 0 for v in values):
        raise ValueError("Resource counts cannot be negative.")
    allocation = [[int(v) for v in row] for row in allocation]
    maximum = [[int(v) for v in row] for row in maximum]
    work = [int(v) for v in available]
    need = []
    for alloc_row, max_row in zip(allocation, maximum):
        if any(a > m for a, m in zip(alloc_row, max_row)):
            raise ValueError("Allocation cannot exceed a process's declared maximum.")
        need.append([m - a for a, m in zip(alloc_row, max_row)])

    finished = [False] * len(allocation)
    sequence = []
    while True:
        progressed = False
        for idx, row in enumerate(need):
            if not finished[idx] and all(required <= have for required, have in zip(row, work)):
                work = [have + held for have, held in zip(work, allocation[idx])]
                finished[idx] = True
                sequence.append(f"P{idx}")
                progressed = True
        if not progressed:
            break
    return {
        "safe": all(finished),
        "safe_sequence": sequence if all(finished) else [],
        "unfinished": [f"P{i}" for i, done in enumerate(finished) if not done],
        "need": need,
    }


def _parse_processes(message: str, require_priority: bool = False) -> list[dict]:
    import re

    matches = list(re.finditer(r"\b(P\d+)\b(.*?)(?=\s*[,;\n]?\s*P\d+\b|$)", message, re.I))
    processes = []
    for match in matches:
        pid, tail = match.group(1).upper(), match.group(2)
        arrival_match = re.search(r"(?:arrival(?:\s+time)?|at)\s*[:=]?\s*(\d+)", tail, re.I)
        burst_match = re.search(r"(?:burst(?:\s+time)?|bt)\s*[:=]?\s*(\d+)", tail, re.I)
        priority_match = re.search(r"(?:priority|prio)\s*[:=]?\s*(\d+)", tail, re.I)
        if arrival_match and burst_match:
            item = {"pid": pid, "arrival": int(arrival_match.group(1)), "burst": int(burst_match.group(1))}
            if priority_match:
                item["priority"] = int(priority_match.group(1))
        else:
            numbers = [int(n) for n in re.findall(r"(?<![A-Za-z])\d+", tail)]
            if len(numbers) < 2:
                continue
            item = {"pid": pid, "arrival": numbers[0], "burst": numbers[1]}
            if len(numbers) >= 3:
                item["priority"] = numbers[2]
        if require_priority and "priority" not in item:
            continue
        processes.append(item)
    return processes


def solve_from_message(message: str) -> str | None:
    """Solve common explicitly formatted numerical scheduling requests."""
    import re

    text = message.lower()
    if re.search(r"banker(?:'s)?\s+(?:algorithm|safety|safe sequence)|safe sequence.*banker", text):
        return _solve_banker_message(message)
    algo_match = re.search(
        r"\b(round\s*robin|rr|srtf|sjf|shortest\s+job\s+first|fcfs|first\s+come\s+first\s+served|(?:preemptive\s+)?priority(?:\s+preemptive)?)\b",
        text,
    )
    if not algo_match:
        return None
    raw_algo = algo_match.group(1).replace(" ", "_").upper()
    if raw_algo in {"ROUND_ROBIN", "RR"}:
        algorithm = "RR"
    elif raw_algo in {"FIRST_COME_FIRST_SERVED"}:
        algorithm = "FCFS"
    elif raw_algo in {"PRIORITY_PREEMPTIVE", "PREEMPTIVE_PRIORITY"}:
        algorithm = "PRIORITY_PREEMPTIVE"
    elif raw_algo == "SHORTEST_JOB_FIRST":
        algorithm = "SJF"
    else:
        algorithm = raw_algo
    quantum_match = re.search(r"(?:quantum|time\s+slice|\bq)\s*(?:=|:|of|is)?\s*(\d+)", text)
    quantum = int(quantum_match.group(1)) if quantum_match else None
    processes = _parse_processes(message, require_priority=algorithm.startswith("PRIORITY"))
    if not processes or (algorithm == "RR" and quantum is None):
        return None
    result = calculate_cpu_schedule(processes, algorithm, quantum)
    chart = " → ".join(f"{s['pid']}[{s['start']}-{s['end']}]" for s in result["segments"])
    rows = "\n".join(
        f"| {m['pid']} | {m['completion']} | {m['turnaround']} | {m['waiting']} | {m['response']} |"
        for m in result["metrics"]
    )
    return (
        f"**Deterministic {result['algorithm']} calculation**\n\n"
        f"Gantt chart: {chart}\n\n"
        "| Process | Completion | Turnaround | Waiting | Response |\n"
        "|---|---:|---:|---:|---:|\n"
        f"{rows}\n\n"
        f"Average waiting time: {result['average_waiting']:.2f}\n\n"
        f"Average turnaround time: {result['average_turnaround']:.2f}"
    )


def _solve_banker_message(message: str) -> str | None:
    import re

    available_match = re.search(r"available(?:\s+vector)?\s*[:=]\s*([\d, ]+)", message, re.I)
    if not available_match:
        return None
    available = [int(v) for v in re.findall(r"\d+", available_match.group(1))]
    allocation = []
    maximum = []

    # Inline rows: P0 Allocation: 0 1 0; Max: 7 5 3
    inline_rows = re.finditer(
        r"\bP\d+\b[^\n;]*?allocation\s*[:=]\s*([\d, ]+?)\s*(?:;\s*)?\bmax(?:imum)?\s*[:=]\s*([\d, ]+)",
        message, re.I,
    )
    for row in inline_rows:
        allocation.append([int(v) for v in re.findall(r"\d+", row.group(1))])
        maximum.append([int(v) for v in re.findall(r"\d+", row.group(2))])

    # Matrix form: Allocation matrix: rows... Max matrix: rows...
    if not allocation:
        alloc_match = re.search(r"allocation(?:\s+matrix)?\s*[:=]\s*(.*?)(?=\bmax(?:imum)?(?:\s+matrix)?\s*[:=])", message, re.I | re.S)
        max_match = re.search(r"\bmax(?:imum)?(?:\s+matrix)?\s*[:=]\s*(.*?)(?=\bavailable(?:\s+vector)?\s*[:=]|$)", message, re.I | re.S)
        if alloc_match and max_match:
            def rows(section):
                found = []
                for line in section.group(1).splitlines():
                    match = re.search(r"\bP\d+\b\s*[:=]?\s*([\d, ]+)", line, re.I)
                    if match:
                        found.append([int(v) for v in re.findall(r"\d+", match.group(1))])
                return found
            allocation, maximum = rows(alloc_match), rows(max_match)

    if not allocation or len(allocation) != len(maximum):
        return None
    result = bankers_safety(available, allocation, maximum)
    need_rows = "\n".join(f"P{i}: {row}" for i, row in enumerate(result["need"]))
    if result["safe"]:
        conclusion = f"Safe state. One safe sequence is {' → '.join(result['safe_sequence'])}."
    else:
        conclusion = f"Unsafe state. No complete safe sequence exists; blocked processes: {', '.join(result['unfinished'])}."
    return f"**Deterministic Banker's safety check**\n\nNeed matrix (Max − Allocation):\n{need_rows}\n\n{conclusion}"
