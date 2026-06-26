"""Base interfaces for payment providers."""
from abc import ABC, abstractmethod

from app.services.payments.models import CheckoutResult


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_checkout(self, *, order_id: str, amount: int, plan: str, email: str) -> CheckoutResult:
        raise NotImplementedError

    @abstractmethod
    def fetch_status(self, order_id: str) -> dict:
        raise NotImplementedError

    @abstractmethod
    def verify_notification_signature(self, payload: dict) -> bool:
        raise NotImplementedError

    @abstractmethod
    def map_internal_status(self, payload: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def extract_order_id(self, payload: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def extract_gross_amount(self, payload: dict):
        raise NotImplementedError

    @abstractmethod
    def build_payment_update(self, payload: dict, *, new_status: str) -> dict:
        raise NotImplementedError

    def build_status_response(self, payload: dict) -> dict:
        return {}
