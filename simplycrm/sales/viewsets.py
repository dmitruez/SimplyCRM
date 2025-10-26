"""ViewSets for sales and order management."""
from __future__ import annotations

from rest_framework import permissions, viewsets
from simplycrm.core.permissions import HasFeaturePermission
from simplycrm.sales import models, serializers


class BaseOrgViewSet(viewsets.ModelViewSet):
	permission_classes = [permissions.IsAuthenticated]
	model = None
	
	def get_queryset(self):  # type: ignore[override]
		model_cls = self.model or self.serializer_class.Meta.model  # type: ignore[attr-defined]
		organization = self.request.user.organization
		return model_cls.objects.filter(organization=organization)
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization)


class CompanyViewSet(BaseOrgViewSet):
	serializer_class = serializers.CompanySerializer
	model = models.Company


class ContactViewSet(BaseOrgViewSet):
	serializer_class = serializers.ContactSerializer
	model = models.Contact


class PipelineViewSet(BaseOrgViewSet):
	serializer_class = serializers.PipelineSerializer
	model = models.Pipeline


class DealStageViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.DealStageSerializer
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):  # type: ignore[override]
		return models.DealStage.objects.filter(pipeline__organization=self.request.user.organization)


class LeadViewSet(BaseOrgViewSet):
	serializer_class = serializers.LeadSerializer
	model = models.Lead


class OpportunityViewSet(BaseOrgViewSet):
	serializer_class = serializers.OpportunitySerializer
	model = models.Opportunity
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "sales.advanced_pipeline"


class DealActivityViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.DealActivitySerializer
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):  # type: ignore[override]
		return models.DealActivity.objects.filter(opportunity__organization=self.request.user.organization)


class OrderViewSet(BaseOrgViewSet):
	serializer_class = serializers.OrderSerializer
	model = models.Order
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "sales.order_management"


class OrderLineViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.OrderLineSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "sales.order_management"
	
	def get_queryset(self):  # type: ignore[override]
		return models.OrderLine.objects.filter(order__organization=self.request.user.organization)


class InvoiceViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.InvoiceSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "billing.invoices"
	
	def get_queryset(self):  # type: ignore[override]
		return models.Invoice.objects.filter(order__organization=self.request.user.organization)


class PaymentViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.PaymentSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "billing.payments"
	
	def get_queryset(self):  # type: ignore[override]
		return models.Payment.objects.filter(invoice__order__organization=self.request.user.organization)


class ShipmentViewSet(viewsets.ModelViewSet):
	serializer_class = serializers.ShipmentSerializer
	permission_classes = [permissions.IsAuthenticated, HasFeaturePermission]
	feature_code = "logistics.shipments"
	
	def get_queryset(self):  # type: ignore[override]
		return models.Shipment.objects.filter(order__organization=self.request.user.organization)


class NoteViewSet(BaseOrgViewSet):
	serializer_class = serializers.NoteSerializer
	model = models.Note
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization, author=self.request.user)


class AttachmentViewSet(BaseOrgViewSet):
	serializer_class = serializers.AttachmentSerializer
	model = models.Attachment
	
	def perform_create(self, serializer):  # type: ignore[override]
		serializer.save(organization=self.request.user.organization, uploaded_by=self.request.user)
