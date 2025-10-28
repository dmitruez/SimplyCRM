"""Multi-tenant regression tests for core API endpoints."""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from simplycrm.core import models, tenant


@override_settings(
    DDOS_SHIELD={"ENABLED": False},
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "user": "1000/min",
            "anon": "1000/min",
        },
    },
)
class UserViewSetIsolationTests(APITestCase):
    """Ensure user listings never leak members from other organizations."""

    def setUp(self) -> None:
        super().setUp()
        cache.clear()
        User = get_user_model()
        self.superuser = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password123",
        )
        self.organization = models.Organization.objects.create(name="Acme", slug="acme")
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="password123",
            organization=self.organization,
        )
        self.member = User.objects.create_user(
            username="teammate",
            email="teammate@example.com",
            password="password123",
            organization=self.organization,
        )
        self.owner_role = models.UserRole.objects.create(user=self.owner, role=models.UserRole.ADMIN)
        self.member_role = models.UserRole.objects.create(user=self.member, role=models.UserRole.MANAGER)
        self.superuser_role = models.UserRole.objects.create(user=self.superuser, role=models.UserRole.ADMIN)
        self.list_url = reverse("user-list")
        self.role_list_url = reverse("userrole-list")

    def _extract_usernames(self, response):
        return {entry["username"] for entry in response.data.get("results", [])}

    def test_regular_user_sees_only_their_organization(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = self._extract_usernames(response)
        self.assertIn(self.owner.username, usernames)
        self.assertIn(self.member.username, usernames)
        self.assertNotIn(self.superuser.username, usernames)

    def test_superuser_defaults_to_their_own_organization(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = self._extract_usernames(response)
        self.assertEqual(usernames, {self.superuser.username})

    def test_superuser_can_opt_in_to_impersonation_via_header(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(
            self.list_url,
            HTTP_X_ORGANIZATION_ID=str(self.organization.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = self._extract_usernames(response)
        self.assertNotIn(self.superuser.username, usernames)
        self.assertEqual(usernames, {self.owner.username, self.member.username})

    def test_user_role_listing_is_scoped_to_active_organization(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.role_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertEqual(user_ids, {self.owner.id, self.member.id})

    def test_superuser_user_role_listing_requires_impersonation(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.role_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertEqual(user_ids, {self.superuser.id})

        response = self.client.get(
            self.role_list_url,
            HTTP_X_ORGANIZATION_ID=str(self.organization.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertEqual(user_ids, {self.owner.id, self.member.id})

    def test_superuser_can_impersonate_via_query_parameter(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(
            self.role_list_url,
            data={"organization_id": self.organization.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertEqual(user_ids, {self.owner.id, self.member.id})

    def test_user_role_manager_respects_active_organization_context(self):
        token = tenant.activate(self.organization)
        try:
            roles = models.UserRole.objects.select_related("user").all()
            self.assertEqual(
                {role.user_id for role in roles},
                {self.owner.id, self.member.id},
            )
        finally:
            tenant.deactivate(token)

    def test_user_role_create_rejects_cross_organization_assignment(self):
        other_org = models.Organization.objects.create(name="Other", slug="other")
        outsider = get_user_model().objects.create_user(
            username="outsider",
            email="outside@example.com",
            password="password123",
            organization=other_org,
        )

        self.client.force_authenticate(self.owner)
        response = self.client.post(
            self.role_list_url,
            data={"user": outsider.id, "role": models.UserRole.MANAGER},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(models.UserRole.objects.filter(user=outsider).count(), 0)

    def test_user_role_destroy_requires_active_organization(self):
        other_org = models.Organization.objects.create(name="Other", slug="other")
        outsider = get_user_model().objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="password123",
            organization=other_org,
        )
        outsider_role = models.UserRole.objects.create(user=outsider, role=models.UserRole.ANALYST)

        self.client.force_authenticate(self.owner)
        response = self.client.delete(reverse("userrole-detail", args=[outsider_role.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(models.UserRole.objects.filter(pk=outsider_role.pk).exists())

    def test_user_role_listing_never_includes_global_admin(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.role_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertNotIn(self.superuser.id, org_ids)

    def test_token_authenticated_user_scoped_to_their_organization(self):
        token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.get(self.role_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {entry["user"] for entry in response.data.get("results", [])}
        self.assertEqual(user_ids, {self.owner.id, self.member.id})

        self.client.credentials()
