from __future__ import annotations

from django.contrib import admin

from simplycrm.sales import models


@admin.register(models.Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "industry")
    search_fields = ("name", "industry")


@admin.register(models.Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "organization", "company", "email")
    search_fields = ("first_name", "last_name", "email")


class DealStageInline(admin.TabularInline):
    model = models.DealStage
    extra = 0


@admin.register(models.Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ("name", "organization")
    inlines = [DealStageInline]


@admin.register(models.Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "status", "score", "created_at")
    list_filter = ("organization", "status")


@admin.register(models.Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "amount", "stage")
    list_filter = ("organization", "stage")


@admin.register(models.DealActivity)
class DealActivityAdmin(admin.ModelAdmin):
    list_display = ("subject", "type", "due_at", "completed_at")
    list_filter = ("type",)


class OrderLineInline(admin.TabularInline):
    model = models.OrderLine
    extra = 0


@admin.register(models.Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "status", "ordered_at", "fulfilled_at")
    list_filter = ("organization", "status")
    inlines = [OrderLineInline]


@admin.register(models.Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "issued_at", "due_date")


@admin.register(models.Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "provider", "processed_at")


@admin.register(models.Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("order", "carrier", "status", "shipped_at", "delivered_at")


@admin.register(models.Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("organization", "author", "related_object_type", "created_at")


@admin.register(models.Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("organization", "file_name", "related_object_type", "uploaded_at")
