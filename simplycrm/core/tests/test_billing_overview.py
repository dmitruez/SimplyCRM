"""Tests for subscription visibility in the billing overview endpoint."""
from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from simplycrm.core import models
from simplycrm.core.views import BillingOverviewView


class BillingOverviewViewTests(TestCase):
        """Validate that active subscriptions are surfaced correctly."""

        def setUp(self):
                super().setUp()
                self.factory = APIRequestFactory()
                self.organization = models.Organization.objects.create(name="Acme", slug="acme")
                self.plan = models.SubscriptionPlan.objects.get(key=models.SubscriptionPlan.PRO)
                User = get_user_model()
                self.user = User.objects.create_user(
                        username="alice",
                        password="password123",
                        email="alice@example.com",
                        organization=self.organization,
                )

        def _perform_request(self):
                request = self.factory.get("/api/billing/overview/")
                force_authenticate(request, user=self.user)
                return BillingOverviewView.as_view()(request)

        def test_returns_current_subscription_when_flagged_active(self):
                models.Subscription.objects.create(
                        organization=self.organization,
                        plan=self.plan,
                        started_at=date.today(),
                        is_active=True,
                )

                response = self._perform_request()

                self.assertIn("current_subscription", response.data)
                self.assertEqual(response.data["current_subscription"]["plan"]["key"], self.plan.key)

        def test_falls_back_to_valid_subscription_even_if_flag_is_inactive(self):
                models.Subscription.objects.create(
                        organization=self.organization,
                        plan=self.plan,
                        started_at=date.today() - timedelta(days=5),
                        expires_at=date.today() + timedelta(days=5),
                        is_active=False,
                )

                response = self._perform_request()

                self.assertIn("current_subscription", response.data)
                self.assertEqual(response.data["current_subscription"]["plan"]["key"], self.plan.key)

        def test_feature_flags_are_exposed_for_valid_subscription(self):
                models.Subscription.objects.create(
                        organization=self.organization,
                        plan=self.plan,
                        started_at=date.today() - timedelta(days=2),
                        expires_at=date.today() + timedelta(days=30),
                        is_active=False,
                )

                feature_codes = self.user.feature_codes()

                self.assertIn("catalog.manage", feature_codes)
