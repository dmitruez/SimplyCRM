"""Product catalog and inventory models."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from simplycrm.catalog.validators import validate_image_mime


class TimeStampedModel(models.Model):
    """Abstract base model with creation and modification tracking."""

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "slug"],
                name="catalog_category_unique_slug_per_org",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return self.name

    def clean(self) -> None:
        super().clean()
        if self.parent and self.parent.organization_id != self.organization_id:
            raise ValidationError("Родительская категория должна принадлежать той же организации.")
        if self.pk and self.parent_id == self.pk:
            raise ValidationError("Категория не может ссылаться на саму себя.")
        ancestor = self.parent
        while ancestor:
            if ancestor.pk == self.pk:
                raise ValidationError("Обнаружена циклическая ссылка в дереве категорий.")
            ancestor = ancestor.parent

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "category"
            self.slug = self._generate_unique_slug(base_slug)
        self.full_clean()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self, base_slug: str) -> str:
        candidate = base_slug
        suffix = 1
        while Category.objects.filter(organization=self.organization, slug=candidate).exclude(pk=self.pk).exists():
            suffix += 1
            candidate = f"{base_slug}-{suffix}"
        return candidate

    @property
    def path(self) -> str:
        """Return the hierarchical path for display purposes."""

        parts = [self.name]
        parent = self.parent
        while parent:
            parts.append(parent.name)
            parent = parent.parent
        return " / ".join(reversed(parts))


class Supplier(TimeStampedModel):
    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="suppliers",
    )
    name = models.CharField(max_length=255)
    contact_email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Product(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Активен"
        INACTIVE = "inactive", "Неактивен"
        ARCHIVED = "archived", "Архив"

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, default="")
    sku = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    attributes = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    main_image = models.FileField(
        upload_to="product-images/",
        blank=True,
        null=True,
        validators=[validate_image_mime],
    )
    is_active = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "sku"],
                name="catalog_product_unique_sku_per_org",
            ),
            models.UniqueConstraint(
                fields=["organization", "slug"],
                name="catalog_product_unique_slug_per_org",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return self.name

    def clean(self) -> None:
        super().clean()
        if self.category and self.category.organization_id != self.organization_id:
            raise ValidationError("Категория должна принадлежать активной организации.")
        if self.slug:
            self.slug = slugify(self.slug)
        if self.status == self.Status.ACTIVE and not self.is_active:
            raise ValidationError("Активный продукт не может быть помечен как неактивный.")

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "product"
            self.slug = self._generate_unique_slug(base_slug)
        if self.status == self.Status.ACTIVE and self.published_at is None:
            self.published_at = timezone.now()
        if self.status != self.Status.ACTIVE:
            self.published_at = None
        self.full_clean()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self, base_slug: str) -> str:
        candidate = base_slug
        suffix = 1
        while Product.objects.filter(organization=self.organization, slug=candidate).exclude(pk=self.pk).exists():
            suffix += 1
            candidate = f"{base_slug}-{suffix}"
        return candidate

    def set_status(self, status: str) -> None:
        if status not in dict(self.Status.choices):
            raise ValidationError("Недопустимый статус продукта.")
        self.status = status
        if status == self.Status.ACTIVE:
            self.is_active = True
            self.published_at = self.published_at or timezone.now()
        elif status in {self.Status.INACTIVE, self.Status.ARCHIVED}:
            self.is_active = False
            self.published_at = None
        self.save(update_fields=["status", "is_active", "published_at", "updated_at"])

    @property
    def is_visible(self) -> bool:
        return self.status == self.Status.ACTIVE and self.is_active


class ProductVariant(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Активен"
        INACTIVE = "inactive", "Неактивен"
        ARCHIVED = "archived", "Архив"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    attributes = models.JSONField(default=dict, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    barcode = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "sku"],
                name="catalog_variant_unique_sku_per_product",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.product.name} / {self.name}"

    def clean(self) -> None:
        super().clean()
        if self.is_default:
            exists = (
                ProductVariant.objects.filter(product=self.product, is_default=True)
                .exclude(pk=self.pk)
                .exists()
            )
            if exists:
                raise ValidationError("У продукта может быть только один вариант по умолчанию.")

    def save(self, *args, recorded_by=None, **kwargs):
        old_price: Decimal | None = None
        old_currency: str | None = None
        creating = self._state.adding
        if not creating and self.pk:
            previous = (
                ProductVariant.objects.filter(pk=self.pk)
                .values("price", "currency")
                .first()
            )
            if previous:
                old_price = previous["price"]
                old_currency = previous["currency"]

        self.full_clean()
        super().save(*args, **kwargs)

        price_changed = (
            creating
            or old_price is None
            or Decimal(old_price) != self.price
            or old_currency != self.currency
        )
        if price_changed:
            PriceHistory.objects.create(
                variant=self,
                price=self.price,
                currency=self.currency,
                recorded_by=recorded_by,
            )


class InventoryLot(TimeStampedModel):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="inventory_lots",
    )
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inventory_lots",
    )
    quantity = models.PositiveIntegerField()
    received_at = models.DateField()
    expires_at = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Lot for {self.variant}"


class PriceHistory(TimeStampedModel):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="price_history",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.variant} @ {self.price}"
