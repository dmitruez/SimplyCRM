"""Catalog routes."""
from __future__ import annotations

from rest_framework import routers

from simplycrm.catalog import viewsets

router = routers.DefaultRouter()
router.register(r"categories", viewsets.CategoryViewSet, basename="category")
router.register(r"suppliers", viewsets.SupplierViewSet, basename="supplier")
router.register(r"products", viewsets.ProductViewSet, basename="product")
router.register(r"product-variants", viewsets.ProductVariantViewSet, basename="product-variant")
router.register(r"inventory-lots", viewsets.InventoryLotViewSet, basename="inventory-lot")
router.register(r"price-history", viewsets.PriceHistoryViewSet, basename="price-history")
