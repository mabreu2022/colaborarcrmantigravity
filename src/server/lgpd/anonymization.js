/**
 * ============================================================
 * PILAR 2 — Backend Node.js: Soft Delete com Anonimização LGPD
 * Arquivo: src/server/lgpd/anonymization.js
 * ============================================================
 * Este módulo oferece duas abordagens:
 *   1. Via Stored Procedure Firebird (recomendado — atômico)
 *   2. Via lógica Node.js direta (fallback ou testes)
 * ============================================================
 */

'use strict';

const crypto = require('crypto');
const db = require('../db');

// ============================================================
// Helper: geração de hash SHA-256 truncado (não reversível)
// Usado apenas como fallback na abordagem JS pura.
// ============================================================
const _hashIrreversivel = (valor, salt) => {
    return crypto
        .createHash('sha256')
        .update(`${salt}::${valor}::LGPD_ANON_${process.env.ANON_SALT || 'CHANGE_ME'}`)
        .digest('hex')
        .substring(0, 16);  // 16 chars — suficiente para unicidade sem ser reversível
};

// ============================================================
// ABORDAGEM 1: Via Stored Procedure (RECOMENDADA)
// Garante atomicidade e log de auditoria dentro da transação.
// ============================================================

/**
 * Anonimiza um cliente chamando a SP do Firebird.
 * @param {number} clienteId - ID do cliente a ser anonimizado
 * @param {string} usuarioSolicitante - Identificador do usuário/sistema que solicitou
 * @returns {Promise<{status: string, mensagem: string}>}
 */
async function anonimizarClienteViaSP(clienteId, usuarioSolicitante = 'SISTEMA') {
    if (!clienteId || isNaN(clienteId)) {
        throw new Error('clienteId inválido');
    }

    const resultado = await db.query(
        `EXECUTE PROCEDURE SP_LGPD_ANONIMIZAR_CLIENTE(?, ?)`,
        [parseInt(clienteId, 10), usuarioSolicitante]
    );

    return {
        status: resultado?.[0]?.R_STATUS || 'ERRO',
        mensagem: resultado?.[0]?.R_MENSAGEM || 'Sem resposta da SP'
    };
}

/**
 * Anonimiza um lead chamando a SP do Firebird.
 */
async function anonimizarLeadViaSP(leadId, usuarioSolicitante = 'SISTEMA') {
    if (!leadId || isNaN(leadId)) {
        throw new Error('leadId inválido');
    }

    const resultado = await db.query(
        `EXECUTE PROCEDURE SP_LGPD_ANONIMIZAR_CONTATO(?, ?)`,
        [parseInt(leadId, 10), usuarioSolicitante]
    );

    return {
        status: resultado?.[0]?.R_STATUS || 'ERRO',
        mensagem: resultado?.[0]?.R_MENSAGEM || 'Sem resposta da SP'
    };
}

// ============================================================
// ABORDAGEM 2: Lógica Node.js direta (fallback / testes)
// Útil quando a SP ainda não foi deployada no banco.
// ============================================================

/**
 * Anonimiza cliente diretamente via UPDATE com lógica Node.js.
 * @param {number} clienteId
 * @param {string} usuarioSolicitante
 */
async function anonimizarClienteJS(clienteId, usuarioSolicitante = 'SISTEMA') {
    const id = parseInt(clienteId, 10);
    if (isNaN(id)) throw new Error('clienteId deve ser um número inteiro');

    // Verifica se já foi anonimizado
    const check = await db.query(
        `SELECT LGPD_ANONIMIZADO FROM CLIENTES WHERE ID_CLIENTE = ?`,
        [id]
    );

    if (!check || check.length === 0) {
        return { status: 'ERRO', mensagem: `Cliente ${id} não encontrado` };
    }

    if (check[0].LGPD_ANONIMIZADO === 1) {
        return { status: 'SKIP', mensagem: 'Registro já anonimizado' };
    }

    // Gera pseudônimos irreversíveis
    const salt = String(id);
    const nomeAnon  = `TITULAR_REMOVIDO_${id}`;
    const cpfAnon   = `000.000.000-${String(id % 99).padStart(2, '0')}`;
    const emailAnon = `removido_${id}@dados.invalid`;
    const telAnon   = `(00) 00000-${String(id % 9999).padStart(4, '0')}`;

    await db.query(
        `UPDATE CLIENTES SET
            NOME                   = ?,
            CPF                    = ?,
            EMAIL                  = ?,
            TELEFONE               = ?,
            CELULAR                = ?,
            ENDERECO               = 'ENDEREÇO REMOVIDO',
            CEP                    = '00000-000',
            CIDADE                 = 'CIDADE REMOVIDA',
            OBSERVACOES            = 'Registro anonimizado conforme LGPD Art. 18.',
            LGPD_ANONIMIZADO       = 1,
            DATA_LGPD_ANONIMIZACAO = CURRENT_TIMESTAMP
         WHERE ID = ?
           AND LGPD_ANONIMIZADO = 0`,
        [nomeAnon, cpfAnon, emailAnon, telAnon, telAnon, id]
    );

    // Log de auditoria
    await db.query(
        `INSERT INTO AUDITORIA_ACESSOS
            (USUARIO_ID_STR, ACAO, TABELA_AFETADA, REGISTRO_ID, IP_ORIGEM, TIMESTAMP_EVENTO, DETALHES)
         VALUES (?, 'LGPD_ANONIMIZACAO', 'CLIENTES', ?, '0.0.0.0', CURRENT_TIMESTAMP, ?)`,
        [
            usuarioSolicitante,
            id,
            'Dados PII removidos via Node.js conforme LGPD Art. 18. Histórico financeiro preservado.'
        ]
    );

    return { status: 'OK', mensagem: `Cliente ${id} anonimizado com sucesso` };
}

module.exports = {
    anonimizarClienteViaSP,
    anonimizarLeadViaSP,
    anonimizarClienteJS
};

/* ============================================================
 * USO NO ROUTER Express (exemplo):
 *
 *   const { anonimizarClienteViaSP } = require('./lgpd/anonymization');
 *
 *   router.delete('/api/lgpd/clientes/:id', authMiddleware, async (req, res) => {
 *       try {
 *           const solicitante = req.user?.email || req.user?.id || 'DESCONHECIDO';
 *           const result = await anonimizarClienteViaSP(req.params.id, solicitante);
 *           res.json(result);
 *       } catch (err) {
 *           console.error('[LGPD] Erro na anonimização:', err);
 *           res.status(500).json({ erro: 'Falha ao processar solicitação LGPD' });
 *       }
 *   });
 * ============================================================ */
