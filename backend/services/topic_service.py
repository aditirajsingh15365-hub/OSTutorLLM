import json
import os
import re
from typing import Optional, Sequence

GENERAL_TOPIC = "General OS"

# If the current message names no topic (e.g. "yes", "I think it's the second one"),
# fall back to the topic of the student's recent messages, but only for short messages.
# A long message with no OS keyword is more likely a brand-new question.
HISTORY_FALLBACK_MAX_WORDS = 15
HISTORY_FALLBACK_LOOKBACK = 6


class TopicService:
    """Keyword-based topic detection.

    Each topic in data/os_topics.json has a list of keywords. A keyword matches
    as a whole word (a plural 's'/'es' is allowed, so "deadlocks" matches
    "deadlock" but "processing" does not match "process"). When several topics
    match, the one with the longest matching keyword wins, so
    "process synchronization" beats the generic "process". Ties go to the topic
    listed first in the JSON file.
    """

    def __init__(self, data_path: Optional[str] = None):
        if data_path is None:
            data_path = os.path.join(os.path.dirname(__file__), "..", "data", "os_topics.json")
        with open(data_path, "r", encoding="utf-8") as f:
            raw_topics = json.load(f)

        self.topics = [entry["name"] for entry in raw_topics]
        # (topic, keyword_length, compiled_pattern), kept in file order.
        self._patterns = []
        for entry in raw_topics:
            for keyword in [entry["name"], *entry.get("keywords", [])]:
                kw = keyword.lower()
                pattern = re.compile(r"(?<![a-z0-9])" + re.escape(kw) + r"(?:e?s)?(?![a-z0-9])")
                self._patterns.append((entry["name"], len(kw), pattern))

    @staticmethod
    def _normalize(text: str) -> str:
        return text.lower().replace("\u2019", "'")

    def _match(self, text: str) -> Optional[str]:
        text = self._normalize(text)
        best_topic, best_length = None, 0
        for topic, length, pattern in self._patterns:
            if length > best_length and pattern.search(text):
                best_topic, best_length = topic, length
        return best_topic

    def detect_topic(self, message: str, history: Optional[Sequence[str]] = None) -> str:
        """`history` is the student's earlier messages, oldest first."""
        topic = self._match(message)
        if topic:
            return topic

        if history and len(message.split()) <= HISTORY_FALLBACK_MAX_WORDS:
            for past in reversed(history[-HISTORY_FALLBACK_LOOKBACK:]):
                topic = self._match(past)
                if topic:
                    return topic

        return GENERAL_TOPIC
