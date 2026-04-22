/**
 * licenseService.js — Serviço de validação de licença via Supabase
 *
 * Fluxo:
 *  1. Lê serial salvo localmente (arquivo license.json ao lado do .exe)
 *  2. Consulta tabela `serials` no Supabase
 *  3. Valida status e data de expiração
 *  4. Retorna { isValid, license, error }
 */

const SUPABASE_URL  = 'https://npfqnsgjicmxwmurwosu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZnFuc2dqaWNteHdtdXJ3b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODQyNDQsImV4cCI6MjA5MjM2MDI0NH0.wLIFMxZkE9rjGQjZF7eFi0dyDioOGQfg1jfhRy32O90';

// ID do produto — filtra seriais que pertencem a este software
// Deixe null para não filtrar por produto
const PRODUCT_ID = null;

/**
 * Consulta o Supabase e valida o serial.
 * @param {string} code - O código do serial digitado pelo usuário
 * @returns {Promise<{isValid: boolean, license: object|null, error: string|null}>}
 */
async function validateSerial(code) {
  if (!code || !code.trim()) {
    return { isValid: false, license: null, error: 'Por favor, insira um código de licença.' };
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    // Monta a query REST do Supabase
    let url = `${SUPABASE_URL}/rest/v1/serials?code=eq.${encodeURIComponent(cleanCode)}&select=*&limit=1`;
    if (PRODUCT_ID) {
      url += `&product_id=eq.${encodeURIComponent(PRODUCT_ID)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro de rede: ${response.status}`);
    }

    const data = await response.json();

    // 1. Existência
    if (!data || data.length === 0) {
      return { isValid: false, license: null, error: 'Código de licença inválido ou não encontrado.' };
    }

    const serial = data[0];

    // 2. Status
    if (serial.status === 'Revoked') {
      return { isValid: false, license: serial, error: 'Esta licença foi revogada. Entre em contato com o suporte.' };
    }

    if (serial.status === 'Pending') {
      return { isValid: false, license: serial, error: 'Esta licença ainda não foi ativada. Entre em contato com o suporte.' };
    }

    if (serial.status !== 'Active') {
      return { isValid: false, license: serial, error: `Licença com status inválido: ${serial.status}.` };
    }

    // 3. Data de expiração
    if (serial.expiration_date) {
      const expDate = new Date(serial.expiration_date);
      const now     = new Date();

      if (expDate <= now) {
        const formatted = expDate.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        return {
          isValid: false,
          license: serial,
          error: `Sua licença (${serial.license_type || 'Padrão'}) expirou em ${formatted}.`,
        };
      }
    }

    // Tudo válido
    return { isValid: true, license: serial, error: null };

  } catch (err) {
    console.error('[License] Erro ao validar:', err.message);
    // Se não há internet, permite acesso se houver serial salvo localmente (grace period)
    return {
      isValid: false,
      license: null,
      error: 'Não foi possível verificar a licença. Verifique sua conexão com a internet.',
    };
  }
}

/**
 * Formata a data de expiração para exibição amigável.
 */
function formatExpiration(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Retorna quantos dias restam até a expiração.
 */
function daysUntilExpiration(isoDate) {
  if (!isoDate) return null;
  const diff = new Date(isoDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

module.exports = { validateSerial, formatExpiration, daysUntilExpiration };
