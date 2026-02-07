from datetime import datetime
from app.models.sale import Sale
from app.models.tutor import Tutor
from app.models.branch import Branch
from app.services.templates import get_email_template

def generate_receipt_html(sale: Sale, tutor: Tutor, branch: Branch) -> str:
    """
    Generates an aesthetic HTML receipt content for inclusion in the email template.
    Using tables for maximum email client compatibility.
    """
    items_rows = ""
    for item in sale.items:
        items_rows += f"""
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">{item.name}</div>
                <div style="font-size: 13px; color: #64748b;">{item.quantity} x ${item.unit_price:,.0f}</div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #1e293b; vertical-align: top; font-size: 14px;">
                ${item.total:,.0f}
            </td>
        </tr>
        """

    content = f"""
    <p style="font-size: 16px;">Hola <strong>{tutor.first_name}</strong>,</p>
    <p style="font-size: 16px;">Gracias por tu compra en <strong>CalFer</strong>. Aquí tienes el resumen de tu comprobante:</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <!-- Header Table -->
        <table style="width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
            <tr>
                <td>
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Boleta N°</div>
                    <div style="font-weight: 700; color: #1e293b; font-size: 15px;">{str(sale.id)[-8:].upper()}</div>
                </td>
                <td style="text-align: right;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Fecha</div>
                    <div style="font-weight: 700; color: #1e293b; font-size: 15px;">{sale.created_at.strftime('%d/%m/%Y %H:%M')}</div>
                </td>
            </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Detalle</th>
                    <th style="text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
        </table>

        <!-- Totals Table -->
        <table style="width: 100%; margin-top: 20px;">
            <tr>
                <td style="color: #64748b; font-size: 14px; padding: 4px 0;">Subtotal</td>
                <td style="text-align: right; color: #1e293b; font-weight: 600; font-size: 14px; padding: 4px 0;">${sale.subtotal:,.0f}</td>
            </tr>
            {f'''<tr>
                <td style="color: #ef4444; font-size: 14px; padding: 4px 0;">Descuento</td>
                <td style="text-align: right; color: #ef4444; font-weight: 600; font-size: 14px; padding: 4px 0;">-${sale.discount_amount:,.0f}</td>
            </tr>''' if sale.discount_amount > 0 else ''}
            <tr>
                <td style="font-size: 18px; font-weight: 800; color: #1e293b; padding-top: 15px; border-top: 2px solid #e2e8f0;">TOTAL</td>
                <td style="text-align: right; font-size: 20px; font-weight: 800; color: #2eafb0; padding-top: 15px; border-top: 2px solid #e2e8f0;">${sale.total:,.0f}</td>
            </tr>
        </table>

        <!-- Info Table -->
        <table style="width: 100%; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
            <tr>
                <td style="font-size: 12px; color: #64748b;">
                    <span style="font-weight: 700; color: #475569;">Método de pago:</span> {get_payment_method_label(sale.payment_method)}<br>
                    <span style="font-weight: 700; color: #475569;">Sucursal:</span> {branch.name}
                </td>
            </tr>
        </table>
    </div>
    
    <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 32px; line-height: 1.5;">
        Este es un comprobante de venta electrónica generado automáticamente.<br>
        ¡Gracias por confiar en el equipo de CalFer!
    </p>
    """
    
    return get_email_template("Comprobante de Venta", content)

def get_payment_method_label(method: str) -> str:
    """Translates payment method keys to user-friendly Spanish labels."""
    labels = {
        "CASH": "Efectivo",
        "DEBIT": "Débito",
        "CREDIT": "Crédito",
        "TRANSFER": "Transferencia",
        "DEBT": "Crédito Interno (Deuda)"
    }
    return labels.get(method.upper(), method)
