from fastapi import APIRouter, HTTPException, Depends, Request
from beanie import PydanticObjectId
from typing import List, Optional
from app.models.cash_session import CashSession
from app.models.sale import Sale
from app.models.branch import Branch
from app.routes.auth import get_current_user
from app.models.user import User
from app.services.activity_service import log_activity
from datetime import datetime, timezone
import io
import traceback
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from fastapi.responses import Response

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
    session.closing_balance_real = float(data.get("closing_balance_real") or data.get("balance_real") or 0.0)
    session.closing_denominations = data.get("closing_denominations", {})
    session.manual_transbank = float(data.get("manual_transbank", 0.0))
    session.manual_withdrawals = float(data.get("manual_withdrawals", 0.0))
    session.manual_expenses = float(data.get("manual_expenses", 0.0))
    session.manual_other_day_cash = float(data.get("manual_other_day_cash", 0.0))
    session.manual_other_day_transbank = float(data.get("manual_other_day_transbank", 0.0))
    session.manual_debt = float(data.get("manual_debt", 0.0))
    session.manual_transfer = float(data.get("manual_transfer", 0.0))
    session.manual_next_day_cash = float(data.get("manual_next_day_cash", 0.0))
    session.handover_to_user_id = data.get("handover_to_user_id")
    session.handover_denominations = data.get("handover_denominations", {})
    session.handover_date = data.get("handover_date")
    
    session.status = "CLOSED"
    session.closed_at = datetime.now(timezone.utc)
    session.closed_by = user.id
    
    await session.save()

    # Calculate final totals
    total_declared = (session.closing_balance_real + session.manual_debt + 
                      session.manual_transbank + session.manual_transfer - 
                      session.manual_withdrawals - session.manual_expenses +
                      session.manual_other_day_cash + session.manual_other_day_transbank)

    # Log Activity
    await log_activity(
        user=user,
        action_type="CASH_CLOSE",
        description=f"Cierre de caja. Inicial: ${session.opening_balance:,.0f} | Total declarado: ${total_declared:,.0f}",
        branch_id=session.branch_id,
        reference_id=str(session.id)
    )

    return session

@router.post("/handover/{session_id}", response_model=CashSession)
async def update_handover_details(session_id: str, data: dict, user: User = Depends(get_current_user)):
    session = await CashSession.get(PydanticObjectId(session_id) if isinstance(session_id, str) else session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.handover_to_user_id = data.get("handover_to_user_id")
    session.handover_denominations = data.get("handover_denominations", {})
    session.handover_date = data.get("handover_date")
    session.manual_next_day_cash = float(data.get("manual_next_day_cash", 0.0))
    
    await session.save()
    
    # Log Activity
    await log_activity(
        user=user,
        action_type="CASH_HANDOVER",
        description=f"Preparación de entrega de caja (Dejar Caja) por ${session.manual_next_day_cash:,.0f}",
        branch_id=session.branch_id,
        reference_id=str(session.id)
    )
    
    return session

@router.get("/report/{session_id}")
async def get_session_report_pdf(session_id: str, user: User = Depends(get_current_user)):
    try:
        session = await CashSession.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Branch name
        branch = await Branch.get(session.branch_id)
        branch_name = branch.name if branch else "Desconocida"
        
        # User name
        opened_by_user = await User.get(session.opened_by)
        user_name = opened_by_user.name if opened_by_user else "Desconocido"

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        title = "REPORTE DE CIERRE DE CAJA" if session.status == "CLOSED" else "REPORTE DE APERTURA DE CAJA"
        c.drawCentredString(width/2, height - 50, title)
        
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 80, f"Sucursal: {branch_name}")
        c.drawString(50, height - 95, f"Cajero/a: {user_name}")
        c.drawString(50, height - 110, f"Fecha Apertura: {session.opened_at.astimezone().strftime('%d/%m/%Y %H:%M')}")
        if session.status == "CLOSED" and session.closed_at:
             c.drawString(50, height - 125, f"Fecha Cierre: {session.closed_at.astimezone().strftime('%d/%m/%Y %H:%M')}")

        y = height - 160
        
        def draw_section_title(text, py):
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(colors.HexColor("#1e293b"))
            c.drawString(50, py, text.upper())
            c.line(50, py - 5, width - 50, py - 5)
            return py - 25

        def draw_row(label, value, py, is_bold=False):
            c.setFont("Helvetica-Bold" if is_bold else "Helvetica", 10)
            c.setFillColor(colors.black)
            c.drawString(70, py, label)
            c.drawRightString(width - 70, py, f"${value:,.0f}")
            return py - 20

        # Section: Denominations (Opening)
        y = draw_section_title("Detalle Efectivo (Apertura)", y)
        denoms = session.opening_denominations or {}
        for d in ["20000", "10000", "5000", "2000", "1000", "500", "100", "50", "10"]:
            qty = denoms.get(d, 0)
            if qty > 0:
                y = draw_row(f"{qty} x ${int(d):,.0f}", int(d) * qty, y)
        
        y = draw_row("TOTAL EFECTIVO APERTURA", session.opening_balance, y, True)
        y -= 20

        if session.status == "CLOSED":
            # Section: Sales of the Day
            y = draw_section_title("Ventas del Día", y)
            y = draw_row("Vtas. Efectivo", session.closing_balance_real, y)
            y = draw_row("Deudado", session.manual_debt, y)
            y = draw_row("Transbank", session.manual_transbank, y)
            y = draw_row("Transferencias", session.manual_transfer, y)
            y = draw_row("Retiros", -session.manual_withdrawals, y)
            y = draw_row("Gastos", -session.manual_expenses, y)
            
            day_total = (session.closing_balance_real + session.manual_debt + 
                         session.manual_transbank + session.manual_transfer - 
                         session.manual_withdrawals - session.manual_expenses)
            y = draw_row("TOTAL VENTAS DÍA", day_total, y, True)
            y -= 20
            
            # Section: Others
            y = draw_section_title("Pagos de Otros Días", y)
            y = draw_row("Efectivo (Días anteriores)", session.manual_other_day_cash, y)
            y = draw_row("Transbank (Días anteriores)", session.manual_other_day_transbank, y)
            y -= 10
            
            # Final Total
            final_total = day_total + session.manual_other_day_cash + session.manual_other_day_transbank
            c.setStrokeColor(colors.black)
            c.rect(50, y - 10, width - 100, 35, stroke=1, fill=0)
            c.setFont("Helvetica-Bold", 14)
            c.drawString(70, y, "TOTAL DECLARADO")
            c.drawRightString(width - 70, y, f"${final_total:,.0f}")
            y -= 60

            if session.handover_to_user_id:
                # Handover Details Section
                y = draw_section_title("Detalle de Entrega (Traspaso)", y)
                target_user = await User.get(session.handover_to_user_id)
                target_name = target_user.name if target_user else "Desconocido"
                
                c.setFont("Helvetica", 10)
                c.drawString(70, y, f"Entregado a: {target_name}")
                y -= 15
                c.drawString(70, y, f"Para el día: {session.handover_date or 'N/A'}")
                y -= 25
                
                h_denoms = session.handover_denominations or {}
                for d in ["20000", "10000", "5000", "2000", "1000", "500", "100", "50", "10"]:
                    qty = h_denoms.get(d, 0)
                    if qty > 0:
                        y = draw_row(f"{qty} x ${int(d):,.0f}", int(d) * qty, y)
                
                y = draw_row("TOTAL ENTREGADO", session.manual_next_day_cash, y, True)

        c.showPage()
        c.save()
        buffer.seek(0)
        
        filename = f"cierre_caja_{session_id[:8]}.pdf"
        return Response(buffer.getvalue(), media_type="application/pdf", headers={
            "Content-Disposition": f"attachment; filename={filename}"
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_cash_history(
    branch_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    query = {}
    if branch_id:
        query["branch_id"] = PydanticObjectId(branch_id)
    
    if start_date and end_date:
        start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        query["opened_at"] = {"$gte": start, "$lte": end}
    
    sessions = await CashSession.find(query).sort("-opened_at").to_list()
    
    # Enrich with user names
    enriched_sessions = []
    for s in sessions:
        opened_by = await User.get(s.opened_by)
        closed_by = await User.get(s.closed_by) if s.closed_by else None
        
        # User who received the handover
        handover_to = await User.get(s.handover_to_user_id) if s.handover_to_user_id else None
        
        session_dict = s.dict()
        session_dict["opened_by_name"] = opened_by.name if opened_by else "Desconocido"
        session_dict["closed_by_name"] = closed_by.name if closed_by else "N/A"
        session_dict["handover_to_name"] = handover_to.name if handover_to else "N/A"
        
        # Calculate full declared total for the reports table
        session_dict["total_declared"] = (
            (s.closing_balance_real or 0) +
            (s.manual_debt or 0) +
            (s.manual_transbank or 0) +
            (s.manual_transfer or 0) -
            (s.manual_withdrawals or 0) -
            (s.manual_expenses or 0) +
            (s.manual_other_day_cash or 0) +
            (s.manual_other_day_transbank or 0)
        )
        
        enriched_sessions.append(session_dict)
        
    return enriched_sessions

@router.get("/handover-pdf/{session_id}")
async def get_handover_report_pdf(session_id: str, user: User = Depends(get_current_user)):
    try:
        session = await CashSession.get(PydanticObjectId(session_id))
        if not session or not session.handover_to_user_id:
            raise HTTPException(status_code=404, detail="Handover data not found")
        
        from app.models.branch import Branch
        branch = await Branch.get(session.branch_id)
        branch_name = branch.name if branch else "Desconocida"
        
        opened_by_user = await User.get(session.opened_by)
        user_name = opened_by_user.name if opened_by_user else "Desconocido"
        
        target_user = await User.get(session.handover_to_user_id)
        target_name = target_user.name if target_user else "Desconocido"

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header - focused on handover
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width/2, height - 60, "COMPROBANTE DE ENTREGA DE CAJA")
        c.setFont("Helvetica", 10)
        c.drawCentredString(width/2, height - 75, "(PARA DEJAR DENTRO DE LA CAJA)")
        
        y = height - 120
        c.setFont("Helvetica-Bold", 11)
        c.drawString(70, y, "INFORMACIÓN GENERAL")
        c.line(70, y - 5, width - 70, y - 5)
        y -= 25
        
        c.setFont("Helvetica", 10)
        c.drawString(70, y, f"Sucursal: {branch_name}")
        c.drawRightString(width - 70, y, f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        y -= 20
        c.drawString(70, y, f"Entregado por: {user_name}")
        y -= 20
        c.setFont("Helvetica-Bold", 10)
        c.drawString(70, y, f"RECIBE / ASIGNADO A: {target_name}")
        y -= 20
        c.drawString(70, y, f"FECHA EFECTIVA (MAÑANA): {session.handover_date or 'N/A'}")
        y -= 40
        
        # Section: Denominations
        c.setFont("Helvetica-Bold", 11)
        c.drawString(70, y, "DETALLE DE EFECTIVO")
        c.line(70, y - 5, width - 70, y - 5)
        y -= 25
        
        h_denoms = session.handover_denominations or {}
        for d in ["20000", "10000", "5000", "2000", "1000", "500", "100", "50", "10"]:
            qty = h_denoms.get(d, 0)
            if qty > 0:
                c.setFont("Helvetica", 10)
                c.drawString(90, y, f"{qty} billetes/monedas de ${int(d):,.0f}")
                c.drawRightString(width - 90, y, f"${int(d) * qty:,.0f}")
                y -= 20
        
        y -= 10
        c.setStrokeColor(colors.black)
        c.rect(70, y - 10, width - 140, 35, stroke=1, fill=0)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(90, y, "TOTAL A ENTREGAR")
        c.drawRightString(width - 90, y, f"${session.manual_next_day_cash:,.0f}")
        
        y -= 80
        # Signatures
        c.setFont("Helvetica", 9)
        c.line(100, y, 220, y)
        c.drawCentredString(160, y - 15, "Firma Entrega")
        
        c.line(width - 220, y, width - 100, y)
        c.drawCentredString(width - 160, y - 15, "Firma Recepción")

        c.showPage()
        c.save()
        buffer.seek(0)
        
        filename = f"entrega_caja_{session_id[:8]}.pdf"
        return Response(buffer.getvalue(), media_type="application/pdf", headers={
            "Content-Disposition": f"attachment; filename={filename}"
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
