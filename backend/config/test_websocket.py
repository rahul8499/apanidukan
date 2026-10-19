import asyncio
from unittest.mock import AsyncMock, patch

from asgiref.testing import ApplicationCommunicator
from django.test import SimpleTestCase

from config import websocket
from config.websocket import websocket_application


class WebSocketRoutingTests(SimpleTestCase):
    async def _connect(self, path, query_string=b''):
        communicator = ApplicationCommunicator(websocket_application, {
            'type': 'websocket',
            'path': path,
            'query_string': query_string,
        })
        await communicator.send_input({'type': 'websocket.connect'})
        return communicator

    async def test_customer_order_topic_is_accepted_after_authorization(self):
        with patch('config.websocket._can_access_order_topic', new=AsyncMock(return_value=True)):
            communicator = await self._connect('/ws/order/ORDER-123/', b'token=tracking-token')
            accepted = await communicator.receive_output(timeout=1)
            welcome = await communicator.receive_output(timeout=1)
            await asyncio.to_thread(
                websocket.broadcast_order_event_sync,
                'order_ORDER-123',
                {'type': 'order_status_updated', 'order': {'reference': 'ORDER-123', 'status': 'PACKED'}},
            )
            update = await communicator.receive_output(timeout=1)
            await communicator.send_input({'type': 'websocket.disconnect', 'code': 1000})
            await communicator.wait()

        self.assertEqual(accepted['type'], 'websocket.accept')
        self.assertIn('order_ORDER-123', welcome['text'])
        self.assertIn('order_status_updated', update['text'])
        self.assertIn('PACKED', update['text'])

    async def test_delivery_agent_topic_requires_authorization_and_accepts_agent(self):
        with patch('config.websocket._can_access_delivery_agent_topic', new=AsyncMock(return_value=True)) as authorize:
            communicator = await self._connect('/ws/delivery-agent/42/', b'token=agent-access-token')
            accepted = await communicator.receive_output(timeout=1)
            welcome = await communicator.receive_output(timeout=1)
            await asyncio.to_thread(
                websocket.broadcast_delivery_agent_event_sync,
                42,
                {'type': 'delivery_assignment_updated', 'assignment': {'assignment_id': 7}},
            )
            assignment = await communicator.receive_output(timeout=1)
            await communicator.send_input({'type': 'websocket.disconnect', 'code': 1000})
            await communicator.wait()

        authorize.assert_awaited_once_with('agent-access-token', '42')
        self.assertEqual(accepted['type'], 'websocket.accept')
        self.assertIn('delivery_agent_42', welcome['text'])
        self.assertIn('delivery_assignment_updated', assignment['text'])

    async def test_delivery_agent_topic_rejects_unauthorized_socket(self):
        with patch('config.websocket._can_access_delivery_agent_topic', new=AsyncMock(return_value=False)):
            communicator = await self._connect('/ws/delivery-agent/42/', b'token=other-agent-token')
            response = await communicator.receive_output(timeout=1)
            await communicator.wait()

        self.assertEqual(response['type'], 'websocket.close')
        self.assertEqual(response['code'], 4403)

    async def test_sync_broadcast_runs_on_websocket_event_loop(self):
        loop = asyncio.get_running_loop()
        previous_loop = websocket._websocket_loop
        websocket._websocket_loop = loop
        delivered = asyncio.Event()

        async def capture(topic, data):
            self.assertEqual(topic, 'delivery_agent_42')
            self.assertEqual(data['type'], 'delivery_assignment_updated')
            delivered.set()

        try:
            with patch('config.websocket.broadcast_to_topic', new=capture):
                await asyncio.to_thread(
                    websocket.broadcast_delivery_agent_event_sync,
                    42,
                    {'type': 'delivery_assignment_updated'},
                )
                await asyncio.wait_for(delivered.wait(), timeout=1)
        finally:
            websocket._websocket_loop = previous_loop
