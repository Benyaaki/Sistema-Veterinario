def get_email_template(title: str, content: str, action_url: str = None, action_text: str = None, phone: str = "+56 9 4862 0501"):
    """
    Generates a professional, high-end responsive HTML email template with CalFer branding.
    """
    # Brand Colors & Styles
    primary_color = "#2EAfB0" # Professional Teal
    secondary_color = "#1D3557" # Deep Navy
    bg_color = "#F8FAFC"
    text_color = "#334155"
    light_text = "#64748B"
    
    button_html = ""
    if action_url and action_text:
        button_html = f"""
        <div style="margin: 32px 0; text-align: center;">
            <a href="{action_url}" target="_blank" style="background-color: {primary_color}; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.2s ease;">
                {action_text}
            </a>
        </div>
        """

    html = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{ margin: 0; padding: 0; background-color: {bg_color}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: {text_color}; -webkit-font-smoothing: antialiased; }}
        table {{ border-spacing: 0; width: 100%; }}
        td {{ padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
        .header {{ background-color: #ffffff; padding: 40px 20px; text-align: center; border-bottom: 1px solid #f1f5f9; }}
        .content {{ padding: 48px 40px; line-height: 1.6; }}
        .footer {{ background-color: {secondary_color}; padding: 40px 20px; text-align: center; color: #ffffff; }}
        h1 {{ margin: 0; color: {secondary_color}; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; }}
        p {{ margin: 0 0 16px; font-size: 16px; color: {text_color}; }}
        .preheader {{ display: none; max-width: 0; max-height: 0; opacity: 0; overflow: hidden; }}
        @media screen and (max-width: 600px) {{
            .content {{ padding: 32px 24px; }}
            h1 {{ font-size: 24px; }}
        }}
    </style>
</head>
<body>
    <span class="preheader">{title} - Información importante sobre tu atención en CalFer.</span>
    <table role="presentation">
        <tr>
            <td align="center">
                <table class="container" role="presentation">
                    <!-- HEADER -->
                    <tr>
                        <td class="header">
                            <h1 style="color: {primary_color}; margin: 0;">CALFER</h1>
                            <div style="font-size: 12px; color: {light_text}; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">Veterinaria Integral</div>
                        </td>
                    </tr>
                    <!-- MAIN CONTENT -->
                    <tr>
                        <td class="content">
                            <div style="margin-bottom: 32px;">
                                <h2 style="font-size: 22px; font-weight: 700; color: {secondary_color}; margin: 0 0 12px;">{title}</h2>
                                <div style="width: 40px; h-8 bg-{primary_color}; height: 4px; background-color: {primary_color}; border-radius: 2px;"></div>
                            </div>
                            
                            <div style="color: {text_color}; font-size: 16px;">
                                {content}
                            </div>
                            
                            {button_html}
                            
                            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: {light_text};">
                                <p style="margin: 0;">Si tienes alguna pregunta, no dudes en contactarnos vía WhatsApp o llamando al:</p>
                                <p style="font-weight: 600; color: {primary_color}; margin-top: 4px;">{phone}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td class="footer">
                            <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 8px;">&copy; {datetime.now().year} CalFer Veterinaria Integral</p>
                            <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                                Estás recibiendo este correo porque tienes una relación activa con CalFer.<br>
                                Rancagua • El Olivar • Viña del Mar • San Francisco de Mostazal
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    return html

from datetime import datetime
