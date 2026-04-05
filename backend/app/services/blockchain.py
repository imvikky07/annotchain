"""
Web3.py service — all blockchain interactions go through here.
The backend wallet signs every transaction; private keys never leave the server.
"""

import json
import os
from web3 import Web3
from web3.middleware import geth_poa_middleware
from app.config import settings

ABI_PATH = os.path.join(os.path.dirname(__file__), "../abi/AnnotationPlatform.json")


def _load_abi() -> list:
    if not os.path.exists(ABI_PATH):
        raise FileNotFoundError(
            f"ABI not found at {ABI_PATH}. "
            "Run: cp artifacts/contracts/AnnotationPlatform.sol/AnnotationPlatform.json "
            "../backend/app/abi/AnnotationPlatform.json"
        )
    with open(ABI_PATH) as f:
        return json.load(f)["abi"]


class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(settings.CONTRACT_ADDRESS),
            abi=_load_abi(),
        )
        self.account = self.w3.eth.account.from_key(settings.DEPLOYER_PRIVATE_KEY)

    # ─── Internal helpers ─────────────────────────────────────────────

    def _nonce(self) -> int:
        return self.w3.eth.get_transaction_count(self.account.address)

    def _gas_price(self) -> int:
        return self.w3.eth.gas_price

    def _build_and_send(self, fn, value: int = 0) -> dict:
        """Build, sign, broadcast, and wait for a transaction."""
        tx = fn.build_transaction({
            "from":     self.account.address,
            "nonce":    self._nonce(),
            "gas":      400_000,
            "gasPrice": self._gas_price(),
            "value":    value,
        })
        signed  = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        return receipt

    # ─── Public methods ───────────────────────────────────────────────

    def create_task(self, task_id: str, reward_wei: int) -> str:
        """Register a new task on-chain. Returns tx hash."""
        fn      = self.contract.functions.createTask(task_id, reward_wei)
        receipt = self._build_and_send(fn)
        return receipt.transactionHash.hex()

    def deposit_funds(self, task_id: str, amount_wei: int) -> str:
        """Deposit ETH into the contract for a task. Returns tx hash."""
        fn      = self.contract.functions.depositFunds(task_id)
        receipt = self._build_and_send(fn, value=amount_wei)
        return receipt.transactionHash.hex()

    def submit_annotation(
        self,
        task_id: str,
        item_id: str,
        label: str,
    ) -> tuple[str, str | None]:
        """
        Submit an annotation on-chain (signed by backend wallet).
        Returns (tx_hash, annotation_id_hex).
        """
        fn      = self.contract.functions.submitAnnotation(task_id, item_id, label)
        receipt = self._build_and_send(fn)

        # Parse AnnotationSubmitted event to extract the bytes32 annotation ID
        events = self.contract.events.AnnotationSubmitted().process_receipt(receipt)
        annotation_id_hex = None
        if events:
            annotation_id_hex = "0x" + events[0]["args"]["annotationId"].hex()

        return receipt.transactionHash.hex(), annotation_id_hex

    def pay_reward(self, annotator_address: str, annotation_id_hex: str) -> str:
        """
        Pay ETH reward to annotator for a validated annotation.
        Returns tx hash.
        """
        annotation_id_bytes32 = bytes.fromhex(annotation_id_hex.lstrip("0x"))
        fn      = self.contract.functions.payReward(
            Web3.to_checksum_address(annotator_address),
            annotation_id_bytes32,
        )
        receipt = self._build_and_send(fn)
        return receipt.transactionHash.hex()

    def get_annotator_stats(self, address: str) -> dict:
        """Fetch on-chain stats for an annotator."""
        total_annotations, total_reward = self.contract.functions.getAnnotatorStats(
            Web3.to_checksum_address(address)
        ).call()
        return {
            "total_annotations":   total_annotations,
            "total_reward_wei":    total_reward,
            "total_reward_eth":    self.w3.from_wei(total_reward, "ether"),
        }

    def get_contract_balance(self) -> dict:
        """Return current contract ETH balance."""
        wei = self.contract.functions.getContractBalance().call()
        return {"wei": wei, "eth": float(self.w3.from_wei(wei, "ether"))}

    def is_connected(self) -> bool:
        return self.w3.is_connected()
