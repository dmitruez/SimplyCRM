"""Reusable validators for the catalog domain."""
from __future__ import annotations

import imghdr
from typing import Iterable

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile


_ALLOWED_IMAGE_TYPES: dict[str, Iterable[str]] = {
    "jpeg": {"image/jpeg", "image/jpg"},
    "png": {"image/png"},
    "gif": {"image/gif"},
    "bmp": {"image/bmp"},
    "tiff": {"image/tiff"},
    "webp": {"image/webp"},
}


def validate_image_mime(file_obj: UploadedFile) -> None:
    """Ensure uploaded product assets are recognizable images.

    The project cannot rely on Pillow at runtime inside the execution environment,
    therefore we lean on the standard library ``imghdr`` module as a lightweight
    format sniffer and cross-check the MIME type that clients provide. The
    validator raises ``ValidationError`` when the payload is either missing or
    identified as a non-image blob.
    """

    if not file_obj:
        return

    mime_type = getattr(file_obj, "content_type", "") or ""
    detected = None

    try:
        detected = imghdr.what(file_obj)
    finally:
        file_obj.seek(0)

    if not detected:
        raise ValidationError("Не удалось определить тип изображения. Загрузите корректный файл.")

    allowed_mimes = _ALLOWED_IMAGE_TYPES.get(detected)
    if allowed_mimes is None:
        raise ValidationError("Неподдерживаемый формат изображения. Допустимы JPEG, PNG, GIF, BMP, TIFF или WebP.")

    if mime_type and mime_type not in allowed_mimes:
        raise ValidationError("MIME-тип не соответствует содержимому файла изображения.")
