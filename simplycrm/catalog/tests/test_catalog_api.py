"""Integration tests for the catalog API."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from simplycrm.catalog import models
from simplycrm.core import models as core_models


class CatalogApiTests(APITestCase):
    """Exercise the core catalog endpoints end-to-end."""

    def setUp(self):
        super().setUp()
        self.organization = core_models.Organization.objects.create(name="Acme", slug="acme")
        User = get_user_model()
        self.user = User.objects.create_user(
            username="cataloger",
            password="password123",
            email="cataloger@example.com",
            organization=self.organization,
        )
        self.client.force_authenticate(self.user)

    def test_category_tree_returns_nested_structure(self):
        root = models.Category.objects.create(
            organization=self.organization,
            name="Root",
            slug="root",
        )
        child = models.Category.objects.create(
            organization=self.organization,
            name="Child",
            parent=root,
        )

        url = reverse("catalog:category-tree")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Root")
        self.assertEqual(response.data[0]["children"][0]["name"], "Child")

    def test_create_product_with_variants_and_price_history(self):
        category = models.Category.objects.create(
            organization=self.organization,
            name="Equipment",
            slug="equipment",
        )
        payload = {
            "category": category.pk,
            "name": "3D Printer",
            "description": "Industrial grade printer",
            "is_active": True,
            "variants": [
                {
                    "name": "Standard",
                    "sku": "PRN-STD",
                    "price": "4999.00",
                    "cost": "3200.00",
                    "currency": "USD",
                    "is_default": True,
                },
                {
                    "name": "Extended",
                    "sku": "PRN-EXT",
                    "price": "5499.00",
                    "cost": "3600.00",
                    "currency": "USD",
                },
            ],
        }

        response = self.client.post(reverse("catalog:product-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = models.Product.objects.get(pk=response.data["id"])
        self.assertEqual(product.status, models.Product.Status.ACTIVE)
        self.assertTrue(product.slug)
        self.assertEqual(product.variants.count(), 2)
        default_variant = product.variants.get(is_default=True)
        self.assertEqual(default_variant.sku, "PRN-STD")
        self.assertEqual(default_variant.price_history.count(), 1)

    def test_set_status_action_transitions_product(self):
        product = models.Product.objects.create(
            organization=self.organization,
            name="Router",
            sku="RTR-001",
            status=models.Product.Status.DRAFT,
        )

        url = reverse("catalog:product-set-status", args=[product.pk])
        response = self.client.post(url, {"status": models.Product.Status.ACTIVE}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.status, models.Product.Status.ACTIVE)
        self.assertTrue(product.is_active)
        self.assertIsNotNone(product.published_at)
