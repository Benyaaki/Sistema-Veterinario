def get_email_template(title: str, content: str, action_url: str = None, action_text: str = None):
    """
    Generates a responsive HTML email template with CalFer branding.
    """
    # Brand Colors
    primary_color = "#4FD1C5" # Teal/Mint
    bg_color = "#F7FAFC"
    text_color = "#2D3748"
    
    button_html = ""
    if action_url and action_text:
        button_html = f"""
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tbody>
                    <tr>
                      <td> <a href="{action_url}" target="_blank" style="background-color: {primary_color}; border: solid 1px {primary_color}; border-radius: 5px; box-sizing: border-box; color: #ffffff; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize;">{action_text}</a> </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        """

    html = f"""
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>{title}</title>
    <style>
      /* -------------------------------------
          GLOBAL RESETS
      ------------------------------------- */
      img {{
        border: none;
        -ms-interpolation-mode: bicubic;
        max-width: 100%; 
      }}
      body {{
        background-color: {bg_color};
        font-family: sans-serif;
        -webkit-font-smoothing: antialiased;
        font-size: 14px;
        line-height: 1.4;
        margin: 0;
        padding: 0;
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%; 
      }}
      table {{
        border-collapse: separate;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        width: 100%; }}
        table td {{
          font-family: sans-serif;
          font-size: 14px;
          vertical-align: top; 
      }}
      /* -------------------------------------
          BODY & CONTAINER
      ------------------------------------- */
      .body {{
        background-color: {bg_color};
        width: 100%; 
      }}
      .container {{
        display: block;
        margin: 0 auto !important;
        /* makes it centered */
        max-width: 580px;
        padding: 10px;
        width: 580px; 
      }}
      .content {{
        box-sizing: border-box;
        display: block;
        margin: 0 auto;
        max-width: 580px;
        padding: 10px; 
      }}
      /* -------------------------------------
          HEADER, FOOTER, MAIN
      ------------------------------------- */
      .main {{
        background: #ffffff;
        border-radius: 8px;
        width: 100%; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        overflow: hidden;
      }}
      .header {{
        background-color: {primary_color};
        padding: 20px;
        text-align: center;
        color: #ffffff;
      }}
      .header h1 {{
        margin: 0;
        font-size: 24px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
      }}
      .wrapper {{
        box-sizing: border-box;
        padding: 20px; 
      }}
      .footer {{
        clear: both;
        margin-top: 10px;
        text-align: center;
        width: 100%; 
      }}
      .footer td,
      .footer p,
      .footer span,
      .footer a {{
        color: #999999;
        font-size: 12px;
        text-align: center; 
      }}
      /* -------------------------------------
          TYPOGRAPHY
      ------------------------------------- */
      h1, h2, h3, h4 {{
        color: {text_color};
        font-family: sans-serif;
        font-weight: 400;
        line-height: 1.4;
        margin: 0;
        margin-bottom: 30px; 
      }}
      h1 {{ font-size: 35px; font-weight: 300; text-align: center; text-transform: capitalize; }}
      p, ul, ol {{
        font-family: sans-serif;
        font-size: 14px;
        font-weight: normal;
        margin: 0;
        margin-bottom: 15px; 
        color: {text_color};
      }}
      /* -------------------------------------
          BUTTONS
      ------------------------------------- */
      .btn {{
        box-sizing: border-box;
        width: 100%; }}
        .btn > tbody > tr > td {{
          padding-bottom: 15px; }}
        .btn table {{
          width: auto; 
      }}
      .btn-primary table td a {{
        background-color: {primary_color};
        border-color: {primary_color};
        color: #ffffff; 
      }}
    </style>
  </head>
  <body class="">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">
      <tr>
        <td>&nbsp;</td>
        <td class="container">
          <div class="content">

            <!-- START CENTERED WHITE CONTAINER -->
            <div class="main">
              <!-- HEADER -->
              <div class="header">
                 <h1>CalFer</h1>
              </div>

              <!-- BODY -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="wrapper">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          {content}
                          {button_html}
                          <p style="margin-top:20px; font-size:12px; color:#999;">Si tienes dudas, contáctanos al +56 9 9713 6180</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
            <!-- END CENTERED WHITE CONTAINER -->

            <!-- START FOOTER -->
            <div class="footer">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-block">
                    <span class="apple-link">CalFer Veterinaria Integral</span>
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          </div>
        </td>
        <td>&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
    """
    return html
