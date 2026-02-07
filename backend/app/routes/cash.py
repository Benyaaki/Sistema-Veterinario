from fastapi import APIRouter, HTTPException, Depends, Request
from beanie import PydanticObjectId
from typing import List, Optional
from app.models.cash_session import CashSession
from app.models.sale import Sale
from app.routes.auth import get_current_user
from app.models.user import User
from datetime import datetime, timezone

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

async def calculate_session_totals(session: CashSession):
    # Use PydanticObjectId to be safe with Beanie query
    session_id = session.id if isinstance(session.id, PydanticObjectId) else PydanticObjectId(str(session.id))
    
    # Sum all sales associated with this session
    # We also check for 'DEBT' which is used in the frontend/sales route
    sales = await Sale.find(Sale.cash_session_id == session_id, Sale.status == "COMPLETED").to_list()
    
    logger.info(f"Calculating totals for session {session_id}. Found {len(sales)} sales.")
    
    cash_total = 0.0
    transfer_total = 0.0
    debit_total = 0.0
    credit_total = 0.0
    debt_total = 0.0
    
    for s in sales:
        logger.debug(f"Processing sale {s.id} - Method: {s.payment_method} - Total: {s.total}")
        if s.payment_method == "CASH":
            cash_total += s.total
        elif s.payment_method == "TRANSFER":
            transfer_total += s.total
        elif s.payment_method == "DEBIT":
            debit_total += s.total
        elif s.payment_method == "CREDIT":
            credit_total += s.total
        elif s.payment_method in ["DUE", "DEBT"]:
            debt_total += s.total
            
    session.sales_cash = cash_total
    session.sales_transfer = transfer_total
    session.sales_debit = debit_total
    session.sales_credit = credit_total
    session.sales_debt = debt_total
    
    session.closing_balance_expected = session.opening_balance + cash_total
    return session

@router.get("/current", response_model=Optional[CashSession])
async def get_current_cash_session(branch_id: str, user: User = Depends(get_current_user)):
    # Find the latest open session for this user and branch
    session = await CashSession.find_one(
        CashSession.branch_id == PydanticObjectId(branch_id),
        CashSession.opened_by == user.id,
        CashSession.status == "OPEN"
    )
    if session:
        # Calculate real-time totals before returning
        await calculate_session_totals(session)
    return session

@router.post("/open", response_model=CashSession)
async def open_cash_session(data: dict, user: User = Depends(get_current_user)):
    branch_id = data.get("branch_id")
    opening_balance = data.get("opening_balance", 0.0)
    denominations = data.get("opening_denominations", {})
    
    if not branch_id:
        raise HTTPException(status_code=400, detail="branch_id required")
        
    # Check if a session is already open
    existing = await CashSession.find_one(
        CashSession.branch_id == PydanticObjectId(branch_id),
        CashSession.opened_by == user.id,
        CashSession.status == "OPEN"
    )
    if existing:
        return existing
        
    new_session = CashSession(
        branch_id=PydanticObjectId(branch_id),
        opened_by=user.id,
        opening_balance=float(opening_balance),
        opening_denominations=denominations,
        status="OPEN"
    )
    await new_session.insert()
    return new_session

@router.post("/close/{session_id}", response_model=CashSession)
async def close_cash_session(session_id: str, data: dict, user: User = Depends(get_current_user)):
    session = await CashSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status == "CLOSED":
        return session
        
    # Calculate final totals
    await calculate_session_totals(session)
    
    # Manual fields
    session.closing_balance_real = float(data.get("closing_balance_real", 0.0))
    session.closing_denominations = data.get("closing_denominations", {})
    session.manual_transbank = float(data.get("manual_transbank", 0.0))
    session.manual_withdrawals = float(data.get("manual_withdrawals", 0.0))
    session.manual_expenses = float(data.get("manual_expenses", 0.0))
    session.manual_other_day_cash = float(data.get("manual_other_day_cash", 0.0))
    session.manual_other_day_transbank = float(data.get("manual_other_day_transbank", 0.0))
    
    session.status = "CLOSED"
    session.closed_at = datetime.now(timezone.utc)
    session.closed_by = user.id
    
    await session.save()
    return session
