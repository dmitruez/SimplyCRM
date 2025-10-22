"""ViewSets exposing the AI assistant."""
from __future__ import annotations

from rest_framework import decorators, permissions, response, status, viewsets

from simplycrm.assistant import models, serializers, services
from simplycrm.core.permissions import HasFeaturePermission


class AIConversationViewSet(viewsets.ModelViewSet):
    """Manage AI assistant conversations."""

    serializer_class = serializers.AIConversationSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "assistant.chat"

    def get_queryset(self):  # type: ignore[override]
        return models.AIConversation.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(organization=self.request.user.organization, owner=self.request.user)

    @decorators.action(detail=True, methods=["post"], url_path="ask")
    def ask(self, request, pk: str | None = None):
        """Submit a question to the assistant and persist the exchange."""

        conversation = self.get_object()
        prompt = request.data.get("prompt", "").strip()
        if not prompt:
            return response.Response(
                {"detail": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        system_prompt = (
            conversation.system_prompt
            or "You are SimplyCRM's AI co-pilot. Provide concise, actionable analytics recommendations."
        )
        result = services.run_ai_analysis(system_prompt, prompt, request.user.organization_id)

        user_message = models.AIMessage.objects.create(
            conversation=conversation,
            role=models.AIMessage.ROLE_USER,
            content=prompt,
        )
        assistant_message = models.AIMessage.objects.create(
            conversation=conversation,
            role=models.AIMessage.ROLE_ASSISTANT,
            content=result.get("content", ""),
            token_usage=result.get("usage", {}).get("total_tokens", 0),
            metadata={"context": result.get("context", {})},
        )
        conversation.refresh_from_db()
        serializer = self.get_serializer(conversation)
        return response.Response(
            {
                "conversation": serializer.data,
                "user_message_id": user_message.id,
                "assistant_message_id": assistant_message.id,
                "usage": result.get("usage", {}),
            }
        )
