"""Router registration for the assistant app."""
from __future__ import annotations

from rest_framework import routers
from simplycrm.assistant import views


router = routers.DefaultRouter()
router.register(r"ai/conversations", views.AIConversationViewSet, basename="ai-conversation")


app_name = "assistant"

urlpatterns = router.urls
