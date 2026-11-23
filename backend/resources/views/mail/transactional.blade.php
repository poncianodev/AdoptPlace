<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
</head>
<body bgcolor="#fdfbf4" style="margin:0;padding:0;background:#fdfbf4;color:#141414;font-family:Manrope,Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fdfbf4">
    <tr>
        <td align="center" style="padding:24px 16px;">
            <!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                <tr>
                    <td style="padding:0 0 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding-right:12px;">
                                    <img src="{{ $logoUrl }}" width="44" height="44" alt="" style="display:block;border:0;">
                                </td>
                                <td style="font-family:Manrope,Arial,Helvetica,sans-serif;">
                                    <strong style="font-size:24px;line-height:28px;color:#141414;">adopt<span style="color:#0a6e1d;">place</span></strong><br>
                                    <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:10px;letter-spacing:1px;color:#54534a;">ENCONTROS QUE TRANSFORMAM</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td bgcolor="#ffffff" style="padding:24px;border:1px solid #e4decf;border-radius:20px;font-family:Manrope,Arial,Helvetica,sans-serif;">
                        <h1 style="margin:0 0 16px;font-size:28px;line-height:34px;color:#141414;">{{ $title }}</h1>
                        <p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#54534a;">{{ $intro }}</p>
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" bgcolor="#5be066" style="border-radius:12px;mso-padding-alt:12px 20px;">
                                    <a href="{{ $actionUrl }}" style="display:inline-block;padding:12px 20px;color:#141414;font-family:Manrope,Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:22px;text-decoration:none;mso-padding-alt:0;">{{ $actionText }}</a>
                                </td>
                            </tr>
                        </table>
                        @foreach ($notes as $note)
                            <p style="margin:16px 0 0;font-size:14px;line-height:22px;color:#54534a;">{{ $note }}</p>
                        @endforeach
                        @if ($showLink)
                            <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e4decf;font-size:13px;line-height:21px;color:#54534a;">
                                Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                                <a href="{{ $actionUrl }}" style="color:#0a6e1d;word-break:break-all;overflow-wrap:anywhere;">{{ $actionUrl }}</a>
                            </p>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0 0;font-family:Manrope,Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#54534a;">
                        AdoptPlace · Adoção responsável<br>
                        Esta é uma mensagem automática.
                    </td>
                </tr>
            </table>
            <!--[if mso]></td></tr></table><![endif]-->
        </td>
    </tr>
</table>
</body>
</html>
