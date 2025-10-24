"""Authentication endpoints with hardened security defaults."""
from __future__ import annotations

import importlib
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from simplycrm.catalog import models as catalog_models
from simplycrm.core.security import LoginAttemptTracker
from simplycrm.core.serializers import (
	AuthTokenSerializer,
	GoogleAuthSerializer,
	RegistrationSerializer,
	UserProfileSerializer,
	EmptySerializer
)
from simplycrm.core.services import provision_google_account
from simplycrm.core.throttling import LoginRateThrottle, RegistrationRateThrottle
from simplycrm.sales import models as sales_models


class CSRFCookieView(APIView):
	"""Issue a CSRF cookie/token pair for cross-origin API clients."""
	
	permission_classes = [permissions.AllowAny]
	
	def get(self, request, *args, **kwargs):  # type: ignore[override]
		token = get_token(request)
		response = Response({"csrfToken": token})
		
		response.set_cookie(
			settings.CSRF_COOKIE_NAME,
			token,
			max_age=settings.CSRF_COOKIE_AGE,
			domain=settings.CSRF_COOKIE_DOMAIN,
			path=settings.CSRF_COOKIE_PATH,
			secure=settings.CSRF_COOKIE_SECURE,
			httponly=settings.CSRF_COOKIE_HTTPONLY,
			samesite=settings.CSRF_COOKIE_SAMESITE,
		)
		response["X-CSRFToken"] = token
		return response


class ObtainAuthTokenView(generics.GenericAPIView):
	"""Issue DRF tokens with brute-force protection."""
	
	permission_classes = [permissions.AllowAny]
	throttle_classes = [LoginRateThrottle]
	serializer_class = AuthTokenSerializer
	
	def post(self, request, *args, **kwargs):  # type: ignore[override]
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		username = serializer.validated_data["username"]
		password = serializer.validated_data["password"]
		
		tracker = LoginAttemptTracker.from_request(username, self._client_ip(request))
		lock = tracker.is_locked()
		if lock:
			return Response(
				{"detail": _(f"Too many attempts. Try again in {lock.remaining_seconds} seconds.")},
				status=status.HTTP_423_LOCKED,
			)
		
		user = authenticate(request=request, username=username, password=password)
		if not user:
			lock = tracker.register_failure()
			message = _("Invalid username or password.")
			if lock:
				message = _("Account locked due to too many failed attempts. Try again later.")
			return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
		
		if not user.is_active:
			tracker.register_failure()
			return Response({"detail": _("User account is disabled.")}, status=status.HTTP_403_FORBIDDEN)
		
		tracker.reset()
		payload = self._build_auth_payload(user)
		return Response(payload, status=status.HTTP_200_OK)
	
	@staticmethod
	def _client_ip(request) -> str:
		forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
		if forwarded_for:
			return forwarded_for.split(",")[0].strip()
		return request.META.get("REMOTE_ADDR", "unknown")
	
	@staticmethod
	def _build_auth_payload(user):
		token, _ = Token.objects.get_or_create(user=user)
		profile = UserProfileSerializer(user).data
		return {"access": token.key, "token_type": "Token", "profile": profile}


class RevokeAuthTokenView(generics.GenericAPIView):
	"""Allow authenticated users to revoke their active token."""
	
	permission_classes = [permissions.IsAuthenticated]
	serializer_class = EmptySerializer
	
	def post(self, request, *args, **kwargs):  # type: ignore[override]
		Token.objects.filter(user=request.user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
	"""Return the authenticated user's profile details."""
	
	permission_classes = [permissions.IsAuthenticated]
	
	def get(self, request, *args, **kwargs):  # type: ignore[override]
		serializer = UserProfileSerializer(request.user)
		return Response(serializer.data)


class DashboardOverviewView(APIView):
	"""Aggregate CRM signals for the interactive dashboard."""
	
	permission_classes = [permissions.IsAuthenticated]
	
	def get(self, request, *args, **kwargs):  # type: ignore[override]
		organization = request.user.organization
		now = timezone.now()
		start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
		seven_days_ago = now - timedelta(days=7)
		
		pipeline_rows = (
			sales_models.Opportunity.objects.filter(organization=organization)
			.values("pipeline__name", "stage__name", "stage__position")
			.annotate(
				count=Count("id"),
				value=Coalesce(Sum("amount"), Decimal("0")),
			)
			.order_by("pipeline__name", "stage__position")
		)
		pipeline_breakdown = [
			{
				"pipeline": row["pipeline__name"],
				"stage": row["stage__name"],
				"count": row["count"],
				"value": float(row["value"] or 0),
			}
			for row in pipeline_rows
		]
		
		opportunities_qs = sales_models.Opportunity.objects.filter(
			organization=organization
		).select_related("pipeline", "stage", "owner")
		pipeline_total_value = (
				opportunities_qs.aggregate(
					total=Coalesce(Sum("amount"), Decimal("0"))
				)["total"]
				or Decimal("0")
		)
		recent_opportunities = [
			{
				"id": opportunity.id,
				"name": opportunity.name,
				"pipeline": opportunity.pipeline.name,
				"stage": opportunity.stage.name,
				"owner": (
						opportunity.owner.get_full_name() or opportunity.owner.username
				)
				if opportunity.owner
				else None,
				"amount": float(opportunity.amount),
				"close_date": opportunity.close_date.isoformat()
				if opportunity.close_date
				else None,
				"probability": float(opportunity.probability),
			}
			for opportunity in opportunities_qs.order_by("-close_date", "-id")[:6]
		]
		
		orders_qs = sales_models.Order.objects.filter(organization=organization)
		currency = (
				orders_qs.order_by("-ordered_at").values_list("currency", flat=True).first()
				or "USD"
		)
		line_value = ExpressionWrapper(
			F("lines__unit_price") * F("lines__quantity") - F("lines__discount_amount"),
			output_field=DecimalField(max_digits=14, decimal_places=2),
		)
		orders_totals = orders_qs.aggregate(
			total_value=Coalesce(Sum(line_value), Decimal("0")),
			pending_count=Count(
				"id", filter=Q(status__in=["draft", "processing", "pending"])
			),
		)
		recent_orders = []
		for order in (
				orders_qs.select_related("contact", "contact__company")
						.prefetch_related("lines")
						.order_by("-ordered_at")[:6]
		):
			contact_name = None
			if order.contact:
				parts = [order.contact.first_name, order.contact.last_name]
				contact_name = " ".join([p for p in parts if p]) or None
				if not contact_name and order.contact.company:
					contact_name = order.contact.company.name
			recent_orders.append(
				{
					"id": order.id,
					"status": order.status,
					"currency": order.currency,
					"total": float(order.total_amount()),
					"contact": contact_name,
					"ordered_at": order.ordered_at.isoformat()
					if order.ordered_at
					else None,
				}
			)
		
		invoices_qs = sales_models.Invoice.objects.filter(
			order__organization=organization
		)
		outstanding_invoices = invoices_qs.exclude(status__iexact="paid")
		invoices_due = outstanding_invoices.count()
		overdue_invoices = outstanding_invoices.filter(
			Q(status__iexact="overdue") | Q(due_date__lt=now.date())
		).count()
		recent_invoices = [
			{
				"id": invoice.id,
				"status": invoice.status,
				"total": float(invoice.total_amount),
				"due_date": invoice.due_date.isoformat() if invoice.due_date else None,
				"issued_at": invoice.issued_at.isoformat(),
				"order_id": invoice.order_id,
			}
			for invoice in invoices_qs.select_related("order").order_by("-issued_at")[:6]
		]
		
		payments_qs = sales_models.Payment.objects.filter(
			invoice__order__organization=organization
		)
		payments_month_total = (
				payments_qs.filter(processed_at__gte=start_of_month).aggregate(
					total=Coalesce(Sum("amount"), Decimal("0"))
				)["total"]
				or Decimal("0")
		)
		recent_payments = [
			{
				"id": payment.id,
				"amount": float(payment.amount),
				"provider": payment.provider,
				"processed_at": payment.processed_at.isoformat()
				if payment.processed_at
				else None,
				"invoice_id": payment.invoice_id,
			}
			for payment in payments_qs.select_related("invoice").order_by("-processed_at")[:6]
		]
		
		shipments_qs = sales_models.Shipment.objects.filter(
			order__organization=organization
		)
		shipments_in_transit = shipments_qs.exclude(status__iexact="delivered").count()
		recent_shipments = [
			{
				"id": shipment.id,
				"status": shipment.status,
				"carrier": shipment.carrier,
				"tracking_number": shipment.tracking_number,
				"shipped_at": shipment.shipped_at.isoformat()
				if shipment.shipped_at
				else None,
				"delivered_at": shipment.delivered_at.isoformat()
				if shipment.delivered_at
				else None,
				"order_id": shipment.order_id,
			}
			for shipment in shipments_qs.order_by("-shipped_at", "-id")[:6]
		]
		
		notes_qs = sales_models.Note.objects.filter(
			organization=organization
		).select_related("author")
		notes_recent_count = notes_qs.filter(created_at__gte=seven_days_ago).count()
		recent_notes = [
			{
				"id": note.id,
				"content": note.content,
				"author": (
						note.author.get_full_name() or note.author.username
				)
				if note.author
				else None,
				"created_at": note.created_at.isoformat(),
				"related_object": {
					"type": note.related_object_type,
					"id": note.related_object_id,
				},
			}
			for note in notes_qs.order_by("-created_at")[:8]
		]
		
		activities_qs = sales_models.DealActivity.objects.filter(
			opportunity__organization=organization
		).select_related("opportunity", "owner")
		upcoming_activities = [
			{
				"id": activity.id,
				"type": activity.type,
				"subject": activity.subject,
				"due_at": activity.due_at.isoformat() if activity.due_at else None,
				"completed_at": activity.completed_at.isoformat()
				if activity.completed_at
				else None,
				"owner": (
						activity.owner.get_full_name() or activity.owner.username
				)
				if activity.owner
				else None,
				"opportunity": {
					"id": activity.opportunity_id,
					"name": activity.opportunity.name if activity.opportunity else None,
				},
			}
			for activity in activities_qs.filter(completed_at__isnull=True)
			                .order_by("due_at", "id")[:6]
		]
		
		products_active = catalog_models.Product.objects.filter(
			organization=organization, is_active=True
		).count()
		variants_count = catalog_models.ProductVariant.objects.filter(
			product__organization=organization
		).count()
		suppliers_count = catalog_models.Supplier.objects.filter(
			organization=organization
		).count()
		inventory_on_hand = (
				catalog_models.InventoryLot.objects.filter(
					variant__product__organization=organization
				).aggregate(total=Coalesce(Sum("quantity"), 0))["total"]
				or 0
		)
		
		summary = {
			"open_opportunities": opportunities_qs.count(),
			"pipeline_total": float(pipeline_total_value),
			"pending_orders": orders_totals["pending_count"] or 0,
			"orders_total": float(orders_totals["total_value"] or Decimal("0")),
			"invoices_due": invoices_due,
			"overdue_invoices": overdue_invoices,
			"payments_month": float(payments_month_total),
			"shipments_in_transit": shipments_in_transit,
			"products_active": products_active,
			"product_variants": variants_count,
			"suppliers": suppliers_count,
			"inventory_on_hand": inventory_on_hand,
			"notes_recent": notes_recent_count,
			"currency": currency,
		}
		
		payload = {
			"summary": summary,
			"pipeline": pipeline_breakdown,
			"recent_opportunities": recent_opportunities,
			"recent_orders": recent_orders,
			"recent_invoices": recent_invoices,
			"recent_payments": recent_payments,
			"recent_shipments": recent_shipments,
			"recent_notes": recent_notes,
			"upcoming_activities": upcoming_activities,
		}
		return Response(payload, status=status.HTTP_200_OK)


class RegisterView(APIView):
	"""Self-service registration endpoint with throttling."""
	
	permission_classes = [permissions.AllowAny]
	throttle_classes = [RegistrationRateThrottle]
	
	def post(self, request, *args, **kwargs):  # type: ignore[override]
		serializer = RegistrationSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		payload = ObtainAuthTokenView._build_auth_payload(user)
		return Response(payload, status=status.HTTP_201_CREATED)


class GoogleAuthView(APIView):
	"""Authenticate or register a user using a verified Google ID token."""
	
	permission_classes = [permissions.AllowAny]
	throttle_classes = [LoginRateThrottle]
	
	def post(self, request, *args, **kwargs):  # type: ignore[override]
		serializer = GoogleAuthSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		google_settings = getattr(settings, "GOOGLE_OAUTH", {})
		client_id = google_settings.get("CLIENT_ID")
		if not client_id:
			raise ValidationError({"detail": _("Google Sign-In is not configured.")})
		
		if importlib.util.find_spec("google.oauth2") is None:
			raise ValidationError({
				"detail": _("Google authentication library is not installed on the server."),
			})
		
		from google.auth.transport import requests as google_requests  # type: ignore
		from google.oauth2 import id_token  # type: ignore
		
		credential = serializer.validated_data["credential"]
		try:
			id_info = id_token.verify_oauth2_token(
				credential,
				google_requests.Request(),
				client_id,
			)
		except ValueError as exc:  # pragma: no cover - external dependency
			raise ValidationError({"detail": _("Invalid Google credential provided.")}) from exc
		
		email = id_info.get("email")
		if not email:
			raise ValidationError({"detail": _("Google account email is required.")})
		
		allowed_domains = google_settings.get("ALLOWED_DOMAINS")
		if allowed_domains:
			domain = email.split("@")[-1].lower()
			if domain not in {d.lower() for d in allowed_domains}:
				raise ValidationError({"detail": _("Email domain is not allowed for Google Sign-In.")})
		
		User = get_user_model()
		user = User.objects.filter(email=email).first()
		created = False
		if user is None:
			organization_name = serializer.validated_data.get("organization_name") or id_info.get(
				"hd"
			)
			if not organization_name:
				organization_name = f"{id_info.get('name') or email.split('@')[0]}'s Workspace"
			
			plan_key = serializer.validated_data.get("plan_key") or None
			result = provision_google_account(
				email=email,
				organization_name=organization_name,
				first_name=id_info.get("given_name", ""),
				last_name=id_info.get("family_name", ""),
				plan_key=plan_key,
			)
			user = result.user
			created = True
		else:
			if not user.is_active:
				raise ValidationError({"detail": _("User account is disabled.")})
			updated_fields: list[str] = []
			given_name = id_info.get("given_name")
			family_name = id_info.get("family_name")
			if given_name and not user.first_name:
				user.first_name = given_name
				updated_fields.append("first_name")
			if family_name and not user.last_name:
				user.last_name = family_name
				updated_fields.append("last_name")
			if updated_fields:
				user.save(update_fields=updated_fields)
		
		payload = ObtainAuthTokenView._build_auth_payload(user)
		status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
		return Response(payload, status=status_code)
