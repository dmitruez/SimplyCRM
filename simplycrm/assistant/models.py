"""Models capturing AI assistant conversations."""
from __future__ import annotations

from django.conf import settings
from django.db import models


class AIConversation(models.Model):
	"""A threaded dialogue between a user and the AI assistant."""
	
	organization = models.ForeignKey(
		"core.Organization", on_delete=models.CASCADE, related_name="ai_conversations"
	)
	owner = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_conversations"
	)
	title = models.CharField(max_length=255)
	system_prompt = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	
	class Meta:
		ordering = ["-updated_at"]
	
	
	def __str__(self) -> str:  # pragma: no cover - human readable label
		return self.title


class AIMessage(models.Model):
	"""Individual message within a conversation."""
	
	ROLE_USER = "user"
	ROLE_ASSISTANT = "assistant"
	ROLE_SYSTEM = "system"
	
	ROLE_CHOICES = [
		(ROLE_USER, "User"),
		(ROLE_ASSISTANT, "Assistant"),
		(ROLE_SYSTEM, "System"),
	]
	
	conversation = models.ForeignKey(
		AIConversation, on_delete=models.CASCADE, related_name="messages"
	)
	role = models.CharField(max_length=16, choices=ROLE_CHOICES)
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)
	token_usage = models.PositiveIntegerField(default=0)
	metadata = models.JSONField(default=dict, blank=True)
	
	
	class Meta:
		ordering = ["created_at"]
	
	
	def __str__(self) -> str:  # pragma: no cover - display helper
		return f"{self.role}: {self.content[:40]}"
