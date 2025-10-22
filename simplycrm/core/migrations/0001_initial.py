from __future__ import annotations

import django.contrib.auth.models
import django.contrib.auth.validators
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Organization",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255, unique=True)),
                ("slug", models.SlugField(max_length=255, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(choices=[("free", "Free"), ("pro", "Pro"), ("enterprise", "Enterprise")], max_length=32, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "price_per_month",
                    models.DecimalField(decimal_places=2, max_digits=9, validators=[MinValueValidator(0)]),
                ),
                ("max_users", models.PositiveIntegerField(default=5)),
                ("max_deals", models.PositiveIntegerField(default=500)),
                ("max_api_calls_per_minute", models.PositiveIntegerField(default=120)),
            ],
        ),
        migrations.CreateModel(
            name="FeatureFlag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(blank=True)),
                (
                    "plans",
                    models.ManyToManyField(blank=True, related_name="feature_flags", to="core.subscriptionplan"),
                ),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("started_at", models.DateField()),
                ("expires_at", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "organization",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to="core.organization"),
                ),
                (
                    "plan",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriptions", to="core.subscriptionplan"),
                ),
            ],
            options={"ordering": ["-started_at"]},
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, help_text="Designates that this user has all permissions without explicitly assigning them.", verbose_name="superuser status")),
                (
                    "username",
                    models.CharField(
                        error_messages={"unique": "A user with that username already exists."},
                        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                        max_length=150,
                        unique=True,
                        validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                        verbose_name="username",
                    ),
                ),
                ("first_name", models.CharField(blank=True, max_length=150, verbose_name="first name")),
                ("last_name", models.CharField(blank=True, max_length=150, verbose_name="last name")),
                ("email", models.EmailField(blank=True, max_length=254, verbose_name="email address")),
                ("is_staff", models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.", verbose_name="staff status")),
                ("is_active", models.BooleanField(default=True, help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.", verbose_name="active")),
                ("date_joined", models.DateTimeField(default=timezone.now, verbose_name="date joined")),
                ("title", models.CharField(blank=True, max_length=255)),
                ("timezone", models.CharField(default="UTC", max_length=64)),
                ("locale", models.CharField(default="en-US", max_length=16)),
                (
                    "organization",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="users", to="core.organization"),
                ),
                (
                    "groups",
                    models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups"),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions"),
                ),
            ],
            options={"verbose_name": "user", "verbose_name_plural": "users"},
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=255)),
                ("entity", models.CharField(max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organization",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="audit_logs", to="core.organization"),
                ),
                (
                    "user",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="UserRole",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("admin", "Admin"), ("manager", "Manager"), ("analyst", "Analyst"), ("marketer", "Marketer")], max_length=32)),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roles", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"unique_together": {("user", "role")}},
        ),
    ]
