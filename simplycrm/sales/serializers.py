"""Serializers for sales models."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from simplycrm.sales import models


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Company
        fields = ["id", "organization", "name", "industry", "website", "billing_address", "shipping_address"]
        read_only_fields = ["id"]


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Contact
        fields = [
            "id",
            "organization",
            "company",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "tags",
        ]
        read_only_fields = ["id"]


class PipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Pipeline
        fields = ["id", "organization", "name"]
        read_only_fields = ["id"]


class DealStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.DealStage
        fields = ["id", "pipeline", "name", "position", "win_probability"]
        read_only_fields = ["id"]


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Lead
        fields = [
            "id",
            "organization",
            "contact",
            "source",
            "status",
            "notes",
            "score",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OpportunitySerializer(serializers.ModelSerializer):
    pipeline_name = serializers.CharField(source="pipeline.name", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = models.Opportunity
        fields = [
            "id",
            "organization",
            "lead",
            "name",
            "pipeline",
            "stage",
            "amount",
            "close_date",
            "probability",
            "owner",
            "pipeline_name",
            "stage_name",
            "owner_name",
        ]
        read_only_fields = ["id"]

    def get_owner_name(self, obj: models.Opportunity) -> str | None:  # noqa: D401
        if not obj.owner:
            return None
        return obj.owner.get_full_name() or obj.owner.username


class DealActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.DealActivity
        fields = ["id", "opportunity", "type", "subject", "notes", "due_at", "completed_at", "owner"]
        read_only_fields = ["id"]


class OrderLineSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = models.OrderLine
        fields = ["id", "order", "product_variant", "quantity", "unit_price", "discount_amount", "total_price"]
        read_only_fields = ["id", "total_price"]


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = models.Order
        fields = [
            "id",
            "organization",
            "contact",
            "contact_name",
            "opportunity",
            "status",
            "currency",
            "ordered_at",
            "fulfilled_at",
            "lines",
            "total_amount",
        ]
        read_only_fields = ["id", "ordered_at", "total_amount"]

    def get_total_amount(self, obj: models.Order) -> Decimal:
        return obj.total_amount()

    def get_contact_name(self, obj: models.Order) -> str | None:  # noqa: D401
        contact = obj.contact
        if not contact:
            return None
        parts = [contact.first_name, contact.last_name]
        name = " ".join([part for part in parts if part]).strip()
        if not name and contact.company:
            return contact.company.name
        if not name and contact.email:
            return contact.email
        return name or None


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Invoice
        fields = ["id", "order", "issued_at", "due_date", "status", "total_amount"]
        read_only_fields = ["id", "issued_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Payment
        fields = ["id", "invoice", "amount", "provider", "transaction_reference", "processed_at"]
        read_only_fields = ["id", "processed_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Shipment
        fields = ["id", "order", "carrier", "tracking_number", "shipped_at", "delivered_at", "status"]
        read_only_fields = ["id"]


class NoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = models.Note
        fields = [
            "id",
            "organization",
            "author",
            "author_name",
            "content",
            "related_object_type",
            "related_object_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_author_name(self, obj: models.Note) -> str | None:  # noqa: D401
        if not obj.author:
            return None
        return obj.author.get_full_name() or obj.author.username


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Attachment
        fields = [
            "id",
            "organization",
            "uploaded_by",
            "file_name",
            "file_url",
            "related_object_type",
            "related_object_id",
            "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_at"]
