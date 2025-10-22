"""Sales pipeline and order management models."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models


class Company(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="companies")
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=128, blank=True)
    website = models.URLField(blank=True)
    billing_address = models.TextField(blank=True)
    shipping_address = models.TextField(blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Contact(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="contacts")
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="contacts")
    first_name = models.CharField(max_length=128)
    last_name = models.CharField(max_length=128)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    tags = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.first_name} {self.last_name}"


class Pipeline(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="pipelines")
    name = models.CharField(max_length=255)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class DealStage(models.Model):
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="stages")
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField(default=0)
    win_probability = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))

    class Meta:
        ordering = ["position"]
        unique_together = ("pipeline", "name")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.pipeline.name} / {self.name}"


class Lead(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="leads")
    contact = models.ForeignKey(Contact, null=True, blank=True, on_delete=models.SET_NULL, related_name="leads")
    source = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=64, default="new")
    notes = models.TextField(blank=True)
    score = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"Lead {self.id}"


class Opportunity(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="opportunities")
    lead = models.ForeignKey(Lead, null=True, blank=True, on_delete=models.SET_NULL, related_name="opportunities")
    name = models.CharField(max_length=255)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="opportunities")
    stage = models.ForeignKey(DealStage, on_delete=models.CASCADE, related_name="opportunities")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    close_date = models.DateField(null=True, blank=True)
    probability = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.0"))
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class DealActivity(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="activities")
    type = models.CharField(max_length=64)
    subject = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-due_at"]


class Order(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="orders")
    contact = models.ForeignKey(Contact, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    opportunity = models.ForeignKey(Opportunity, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    status = models.CharField(max_length=64, default="draft")
    currency = models.CharField(max_length=8, default="USD")
    ordered_at = models.DateTimeField(auto_now_add=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)

    def total_amount(self) -> Decimal:
        return sum((line.total_price for line in self.lines.all()), start=Decimal("0.00"))

    def __str__(self) -> str:  # pragma: no cover
        return f"Order {self.id}"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    product_variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    @property
    def total_price(self) -> Decimal:
        return max(Decimal("0.00"), self.unit_price * self.quantity - self.discount_amount)


class Invoice(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="invoices")
    issued_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=32, default="draft")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)


class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    provider = models.CharField(max_length=64)
    transaction_reference = models.CharField(max_length=128)
    processed_at = models.DateTimeField(auto_now_add=True)


class Shipment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="shipments")
    carrier = models.CharField(max_length=64)
    tracking_number = models.CharField(max_length=128, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, default="pending")


class Note(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    content = models.TextField()
    related_object_type = models.CharField(max_length=64)
    related_object_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


class Attachment(models.Model):
    organization = models.ForeignKey("core.Organization", on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    file_name = models.CharField(max_length=255)
    file_url = models.URLField()
    related_object_type = models.CharField(max_length=64)
    related_object_id = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
