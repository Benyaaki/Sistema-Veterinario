from beanie import Document, PydanticObjectId
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import Field

class CashSession(Document):
    branch_id: PydanticObjectId
    opened_by: PydanticObjectId
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    opening_balance: float = 0.0
    opening_denominations: Dict[str, int] = {} # e.g. {"20000": 1, "10000": 2 ...}
    
    closed_at: Optional[datetime] = None
    closed_by: Optional[PydanticObjectId] = None
    closing_balance_real: float = 0.0 # What they counted
    closing_balance_expected: float = 0.0 # What system says
    closing_denominations: Dict[str, int] = {}
    
    # Automatic totals from sales
    sales_cash: float = 0.0
    sales_transfer: float = 0.0
    sales_debit: float = 0.0
    sales_credit: float = 0.0
    sales_debt: float = 0.0 # Deudado
    
    # Manual fields from Task 7
    manual_transbank: float = 0.0
    manual_withdrawals: float = 0.0 # Retiros
    manual_expenses: float = 0.0 # Gastos
    manual_other_day_cash: float = 0.0
    manual_other_day_transbank: float = 0.0
    manual_debt: float = 0.0
    manual_transfer: float = 0.0
    manual_next_day_cash: float = 0.0
    handover_to_user_id: Optional[PydanticObjectId] = None
    handover_denominations: Dict[str, int] = {}
    handover_date: Optional[str] = None
    
    status: str = "OPEN" # OPEN, CLOSED
    
    class Settings:
        name = "cash_sessions"
