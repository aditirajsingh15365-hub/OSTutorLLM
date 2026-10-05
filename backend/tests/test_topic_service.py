import pytest

from services.topic_service import TopicService

topics = TopicService()


@pytest.mark.parametrize(
    "message, expected",
    [
        ("What is a process?", "Processes"),
        ("Explain process vs program", "Processes"),
        ("Explain process synchronization", "Process Synchronization"),
        ("What is a semaphore?", "Process Synchronization"),
        ("How does round robin scheduling work?", "CPU Scheduling"),
        ("Give me a CPU scheduling question", "CPU Scheduling"),
        ("Explain disk scheduling", "Disk Scheduling"),
        ("What is a deadlock?", "Deadlocks"),
        ("Teach me deadlocks", "Deadlocks"),
        ("Explain paging", "Memory Management"),
        ("Quiz me on memory management", "Memory Management"),
        ("What causes a page fault?", "Virtual Memory"),
        ("Explain demand paging", "Virtual Memory"),
        ("How do threads differ from processes?", "Processes"),
        ("What is a kernel thread?", "Threads"),
        ("What is a system call?", "System Calls"),
        ("Explain the Banker\u2019s algorithm", "Deadlocks"),
        ("What does chmod do?", "Linux basics"),
    ],
)
def test_detects_topic(message, expected):
    assert topics.detect_topic(message) == expected


def test_unknown_message_is_general():
    assert topics.detect_topic("hello there") == "General OS"
    assert topics.detect_topic("yes") == "General OS"


def test_does_not_match_inside_other_words():
    # "processing" must not count as "process"
    assert topics.detect_topic("I love image processing") == "General OS"


def test_short_reply_inherits_topic_from_history():
    history = ["What is a deadlock?", "Mutual exclusion"]
    assert topics.detect_topic("yes, I think I get it", history) == "Deadlocks"


def test_long_unrelated_message_does_not_inherit_topic():
    history = ["What is a deadlock?"]
    message = "Completely different question: can you tell me about the history of the first computers ever built and who made them?"
    assert topics.detect_topic(message, history) == "General OS"
