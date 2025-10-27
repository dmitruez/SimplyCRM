"""Routers for sales endpoints."""
from __future__ import annotations

from rest_framework import routers
from simplycrm.sales import viewsets


router = routers.DefaultRouter()
router.register(r"companies", viewsets.CompanyViewSet, basename="company")
router.register(r"contacts", viewsets.ContactViewSet, basename="contact")
router.register(r"pipelines", viewsets.PipelineViewSet, basename="pipeline")
router.register(r"deal-stages", viewsets.DealStageViewSet, basename="deal-stage")
router.register(r"leads", viewsets.LeadViewSet, basename="lead")
router.register(r"opportunities", viewsets.OpportunityViewSet, basename="opportunity")
router.register(r"deal-activities", viewsets.DealActivityViewSet, basename="deal-activity")
router.register(r"orders", viewsets.OrderViewSet, basename="order")
router.register(r"order-lines", viewsets.OrderLineViewSet, basename="order-line")
router.register(r"invoices", viewsets.InvoiceViewSet, basename="invoice")
router.register(r"payments", viewsets.PaymentViewSet, basename="payment")
router.register(r"shipments", viewsets.ShipmentViewSet, basename="shipment")
router.register(r"notes", viewsets.NoteViewSet, basename="note")
router.register(r"attachments", viewsets.AttachmentViewSet, basename="attachment")


app_name = "sales"

urlpatterns = router.urls
