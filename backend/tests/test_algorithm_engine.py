import pytest

from services.algorithm_engine import (
    bankers_safety,
    calculate_cpu_schedule,
    solve_from_message,
)


def test_fcfs_includes_idle_time_and_metrics():
    result = calculate_cpu_schedule(
        [{"pid": "P1", "arrival": 2, "burst": 3}, {"pid": "P2", "arrival": 3, "burst": 1}],
        "FCFS",
    )
    assert result["segments"] == [
        {"pid": "IDLE", "start": 0, "end": 2},
        {"pid": "P1", "start": 2, "end": 5},
        {"pid": "P2", "start": 5, "end": 6},
    ]
    assert [m["waiting"] for m in result["metrics"]] == [0, 2]


def test_sjf_and_srtf_choose_shorter_work():
    jobs = [
        {"pid": "P1", "arrival": 0, "burst": 5},
        {"pid": "P2", "arrival": 1, "burst": 2},
    ]
    sjf = calculate_cpu_schedule(jobs, "SJF")
    srtf = calculate_cpu_schedule(jobs, "SRTF")
    assert [s["pid"] for s in sjf["segments"]] == ["P1", "P2"]
    assert [s["pid"] for s in srtf["segments"]] == ["P1", "P2", "P1"]
    assert srtf["metrics"][0]["completion"] == 7


def test_round_robin_requires_quantum_and_handles_arrivals():
    jobs = [
        {"pid": "P1", "arrival": 0, "burst": 3},
        {"pid": "P2", "arrival": 1, "burst": 2},
    ]
    with pytest.raises(ValueError):
        calculate_cpu_schedule(jobs, "RR")
    result = calculate_cpu_schedule(jobs, "RR", 2)
    assert [(s["pid"], s["start"], s["end"]) for s in result["segments"]] == [
        ("P1", 0, 2), ("P2", 2, 4), ("P1", 4, 5)
    ]


def test_priority_scheduling_preempts_only_in_preemptive_variant():
    jobs = [
        {"pid": "P1", "arrival": 0, "burst": 4, "priority": 2},
        {"pid": "P2", "arrival": 1, "burst": 2, "priority": 1},
    ]
    non_preemptive = calculate_cpu_schedule(jobs, "PRIORITY")
    preemptive = calculate_cpu_schedule(jobs, "PRIORITY_PREEMPTIVE")
    assert [(s["pid"], s["start"], s["end"]) for s in non_preemptive["segments"]] == [
        ("P1", 0, 4), ("P2", 4, 6)
    ]
    assert [(s["pid"], s["start"], s["end"]) for s in preemptive["segments"]] == [
        ("P1", 0, 1), ("P2", 1, 3), ("P1", 3, 6)
    ]
def test_scheduling_rejects_invalid_jobs():
    with pytest.raises(ValueError):
        calculate_cpu_schedule([{"pid": "P1", "arrival": 0, "burst": 0}], "FCFS")
    with pytest.raises(ValueError):
        calculate_cpu_schedule([
            {"pid": "P1", "arrival": 0, "burst": 2},
            {"pid": "P1", "arrival": 1, "burst": 2},
        ], "FCFS")


def test_bankers_safe_sequence_and_unsafe_state():
    safe = bankers_safety(
        [3, 3, 2],
        [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
        [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    )
    assert safe["safe"] is True
    assert safe["safe_sequence"] == ["P1", "P3", "P4", "P0", "P2"]

    unsafe = bankers_safety([0, 0], [[1, 0], [0, 1]], [[2, 0], [0, 2]])
    assert unsafe["safe"] is False
    assert unsafe["unfinished"] == ["P0", "P1"]


def test_bankers_rejects_bad_dimensions_and_impossible_allocation():
    with pytest.raises(ValueError):
        bankers_safety([1], [[1, 0]], [[2, 1]])
    with pytest.raises(ValueError):
        bankers_safety([1], [[3]], [[2]])


def test_chat_parser_uses_deterministic_scheduler_for_structured_rows():
    answer = solve_from_message("Solve FCFS: P1 0 5; P2 1 3")
    assert answer is not None
    assert "Deterministic FCFS" in answer
    assert "P1[0-5]" in answer
    assert "| P2 | 8 | 7 | 4 | 4 |" in answer


def test_chat_parser_uses_deterministic_bankers_for_inline_matrices():
    answer = solve_from_message(
        "Run Banker's algorithm. Available: 3 3 2. "
        "P0 Allocation: 0 1 0; Max: 7 5 3\n"
        "P1 Allocation: 2 0 0; Max: 3 2 2\n"
        "P2 Allocation: 3 0 2; Max: 9 0 2\n"
        "P3 Allocation: 2 1 1; Max: 2 2 2\n"
        "P4 Allocation: 0 0 2; Max: 4 3 3"
    )
    assert answer is not None
    assert "Deterministic Banker's safety check" in answer
    assert "P1 → P3 → P4 → P0 → P2" in answer


def test_chat_parser_supports_preemptive_priority_rows_without_delimiters():
    answer = solve_from_message("Solve preemptive priority P1 0 4 2 P2 1 2 1")
    assert answer is not None
    assert "Deterministic PRIORITY_PREEMPTIVE" in answer
    assert "P2[1-3]" in answer
