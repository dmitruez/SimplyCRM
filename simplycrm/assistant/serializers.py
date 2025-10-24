"""Serializers for AI assistant conversations."""
from __future__ import annotations

from rest_framework import serializers
from simplycrm.assistant import models


class AIMessageSerializer(serializers.ModelSerializer):
	class Meta:
		model = models.AIMessage
		fields = [
			"id",
			"role",
			"content",
			"created_at",
			"token_usage",
			"metadata",
		]
		read_only_fields = ["id", "created_at", "token_usage", "metadata"]


class AIConversationSerializer(serializers.ModelSerializer):
	messages = AIMessageSerializer(many=True, read_only=True)
	
	
	class Meta:
		model = models.AIConversation
		fields = [
			"id",
			"title",
			"system_prompt",
			"created_at",
			"updated_at",
			"messages",
		]
		read_only_fields = ["id", "created_at", "updated_at", "messages"]
