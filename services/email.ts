'use server';

import { Resend } from 'resend';

export interface PrizeWinnerEmailParams {
  toEmail: string;
  toName: string;
  eventTitle: string;
  prizeTitle: string;
  prizeAmount: number | null;
  prizeCurrency: string | null;
  awardedRank: number | null;
}

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no est\u00e1 configurada');
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL no est\u00e1 configurado');
  }
  return from;
}

export async function sendPrizeWinnerEmail(
  params: PrizeWinnerEmailParams,
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const subject = `\u00a1Ganaste un premio en ${params.eventTitle}!`;
  const text = buildPrizeEmailBody(params);

  console.info('[pickem:prize-email:queued]', {
    toName: params.toName,
    eventTitle: params.eventTitle,
    prizeTitle: params.prizeTitle,
  });

  console.info('[pickem:resend-config]', {
    hasApiKey: Boolean(process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL ?? null,
  });

  let resend: Resend;
  try {
    resend = getResend();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de configuraci\u00f3n';
    console.error('[pickem:prize-email:failed]', { code: 'config_error', message: msg });
    return { success: false, error: msg };
  }

  const from = getFromEmail();

  try {
    const html = buildPrizeWinnerEmailHtml(params);
    const { data, error } = await resend.emails.send({
      from,
      to: [params.toEmail],
      subject,
      text,
      html,
    });

    if (error) {
      const err = error as { name?: string; message?: string; statusCode?: number | null };
      const code = mapResendError(err);
      console.error('[pickem:prize-email:failed]', {
        code,
        message: err.message ?? 'Unknown error',
      });
      return { success: false, error: code };
    }

    if (!data?.id) {
      console.error('[pickem:prize-email:failed]', {
        code: 'missing_message_id',
        message: 'Resend no devolvi\u00f3 un identificador de mensaje',
      });
      return { success: false, error: 'missing_message_id' };
    }

    console.info('[pickem:prize-email:sent]', {
      toName: params.toName,
      eventTitle: params.eventTitle,
      prizeTitle: params.prizeTitle,
      providerMessageId: data.id,
    });

    return { success: true, messageId: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[pickem:prize-email:failed]', {
      code: 'provider_error',
      message,
    });
    return { success: false, error: 'provider_error' };
  }
}

/**
 * Maps common Resend error messages to stable error codes.
 */
function mapResendError(error: { name?: string; message?: string; statusCode?: number | null }): string {
  const msg = (error.message ?? '').toLowerCase();
  const status = error.statusCode ?? undefined;

  if (status === 401 || status === 403 || msg.includes('unauthorized')) return 'unauthorized';
  if (msg.includes('invalid_from') || msg.includes('invalid from')) return 'invalid_from_address';
  if (msg.includes('domain') && (msg.includes('verify') || msg.includes('not found'))) return 'domain_not_verified';
  if (msg.includes('rate limit') || msg.includes('rate_limit')) return 'rate_limited';

  return `provider_error`;
}

function buildPrizeEmailBody(params: PrizeWinnerEmailParams): string {
  const lines: string[] = [
    `Hola ${params.toName},`,
    '',
    `\u00a1Felicidades! Ganaste un premio en ${params.eventTitle}.`,
    '',
    `Premio: ${params.prizeTitle}`,
  ];

  if (params.awardedRank != null) {
    const ord = `${params.awardedRank}.${String.fromCharCode(186)}`;
    lines.push(`Posici\u00f3n: ${ord}`);
  }

  if (params.prizeAmount != null) {
    const fmt = params.prizeAmount.toLocaleString('es-ES');
    lines.push(`Valor: ${fmt} ${params.prizeCurrency ?? 'USD'}`);
  }

  lines.push(
    '',
    'El organizador se pondr\u00e1 en contacto contigo para coordinar la entrega.',
  );

  return lines.join('\n');
}

function buildPrizeWinnerEmailHtml(params: PrizeWinnerEmailParams): string {
  const { toName, eventTitle, prizeTitle, awardedRank, prizeAmount, prizeCurrency } = params;

  let innerRows = '';

  if (awardedRank != null) {
    innerRows += `<tr>
      <td style="color:#a1a1aa;font-size:12px;line-height:1.5;padding:0 0 4px 0;">Posici\u00f3n</td>
    </tr>
    <tr>
      <td style="color:#ffffff;font-size:16px;font-weight:600;line-height:1.5;padding:0 0 16px 0;">${awardedRank}.\u00ba</td>
    </tr>`;
  }

  if (prizeAmount != null) {
    const fmtAmount = prizeAmount.toLocaleString('es-ES');
    innerRows += `<tr>
      <td style="color:#a1a1aa;font-size:12px;line-height:1.5;padding:0 0 4px 0;">Valor</td>
    </tr>
    <tr>
      <td style="color:#ffffff;font-size:16px;font-weight:600;line-height:1.5;padding:0;">${fmtAmount} ${prizeCurrency ?? 'USD'}</td>
    </tr>`;
  }

  const prizePadding = innerRows ? '16px' : '0';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]><table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
        <tr>
          <td align="center" style="padding:32px 24px 0 24px;">
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;">PickHub</div>
            <div style="color:#a1a1aa;font-size:12px;line-height:1.5;margin-top:2px;">Din\u00e1micas que conectan a creadores y comunidades.</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 16px 0 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111113;border:1px solid #27272a;border-radius:12px;">
              <tr>
                <td align="center" style="padding:28px 24px 0 24px;">
                  <div style="color:#22c55e;font-size:14px;font-weight:600;line-height:1.5;">\u2713 Premio ganado</div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 24px 0 24px;">
                  <h1 style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;margin:0;letter-spacing:-0.3px;">\u00a1Ganaste un premio en ${eventTitle}!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px 0 24px;">
                  <p style="color:#ffffff;font-size:15px;line-height:1.5;margin:0;">Hola ${toName},</p>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 24px 0 24px;">
                  <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0;">\u00a1Felicidades! Ganaste un premio en ${eventTitle}.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:8px;">
                    <tr>
                      <td style="padding:16px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="color:#a1a1aa;font-size:12px;line-height:1.5;padding:0 0 4px 0;">Premio</td>
                          </tr>
                          <tr>
                            <td style="color:#ffffff;font-size:16px;font-weight:600;line-height:1.5;padding:0 0 ${prizePadding} 0;">${prizeTitle}</td>
                          </tr>
                          ${innerRows}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 28px 24px;">
                  <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0;">El organizador se pondr\u00e1 en contacto contigo para coordinar la entrega.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 24px 32px 24px;">
            <p style="color:#52525b;font-size:11px;line-height:1.5;margin:0;">Este correo fue enviado autom\u00e1ticamente por PickHub.</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}
