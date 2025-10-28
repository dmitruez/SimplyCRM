"""ViewSets exposing the AI assistant."""
from __future__ import annotations

from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import ValidationError
from simplycrm.assistant import models, serializers, services
from simplycrm.core import tenant
from simplycrm.core.permissions import HasFeaturePermission


class AIConversationViewSet(viewsets.ModelViewSet):
    """Manage AI assistant conversations."""
    
    serializer_class = serializers.AIConversationSerializer
    permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
    feature_code = "assistant.chat"
    
    def get_queryset(self):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            return models.AIConversation.objects.none()
        return models.AIConversation.objects.filter(organization=organization)

    def perform_create(self, serializer):  # type: ignore[override]
        organization = tenant.get_request_organization(self.request)
        if not organization:
            raise ValidationError("Активная организация не выбрана.")
        serializer.save(organization=organization, owner=self.request.user)
    
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
        organization_id = tenant.get_request_organization_id(request)
        if organization_id is None:
            raise ValidationError("Активная организация не выбрана.")

        result = services.run_ai_analysis(system_prompt, prompt, organization_id)
        
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
