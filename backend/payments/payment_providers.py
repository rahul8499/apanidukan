from abc import ABC, abstractmethod
from typing import Dict


class PaymentProvider(ABC):
    @abstractmethod
    def create_payment(self, order_id: int, amount: str, currency: str) -> Dict:
        pass

    @abstractmethod
    def verify_payment(self, data: Dict) -> Dict:
        pass


class DummyProvider(PaymentProvider):
    def create_payment(self, order_id: int, amount: str, currency: str) -> Dict:
        # returns a dummy transaction id and a redirect url placeholder
        tx = f"dummy-{order_id}-{int(float(amount)*100)}"
        return {'transaction_id': tx, 'payment_url': f'https://example.com/pay/{tx}'}

    def verify_payment(self, data: Dict) -> Dict:
        # Accept any transaction starting with dummy-
        tx = data.get('transaction_id')
        if tx and str(tx).startswith('dummy-'):
            return {'status': 'success', 'transaction_id': tx}
        return {'status': 'failed'}
