import json
import os

class TopicService:
    def __init__(self):
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'os_topics.json')
        with open(data_path, 'r') as f:
            self.topics = json.load(f)

    def detect_topic(self, message: str) -> str:
        msg_lower = message.lower()
        for topic in self.topics:
            topic_lower = topic.lower()
            if topic_lower in msg_lower:
                return topic
            # simple checks
            if "process" in msg_lower and topic == "Processes":
                return topic
            if "thread" in msg_lower and topic == "Threads":
                return topic
        return "General OS"
