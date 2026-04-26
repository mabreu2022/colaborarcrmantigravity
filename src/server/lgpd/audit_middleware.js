/**
 * ============================================================
 * PILAR 3 — Middleware Node.js: Interceptação de Acessos PII
 * Arquivo: src/server/lgpd/audit_middleware.js
 * ============================================================
 * Intercepta requisições que acessam dados sensíveis e registra
 * automaticamente na AUDITORIA_ACESSOS.
 *
 * USO no Express (index.js):
 *   const { auditarAcessoPII, auditarRotasSensiveis } = require('./lgpd/audit_middleware');
 *
 *   // Auditar rotas específicas:
 *   app.get('/api/clientes/:id', auditarAcessoPII('SELECT_PII', 'CLIENTES'), handler);
 *
 *   // Auditar automaticamente todas as rotas PII:
 *   app.use('/api/clientes', auditarRotasSensiveis('CLIENTES'));
 *   app.use('/api/leads',    auditarRotasSensiveis('LEADS'));
 * ============================================================
 */

'use strict';

const db = require('../db');

// ============================================================
// Constantes de ações auditáveis
// ============================================================
const ACOES = Object.freeze({
    SELECT_PII:          'SELECT_PII',
    UPDATE_PII:          'UPDATE_PII',
    DELETE_PII:          'DELETE_PII',
    LGPD_ANONIMIZACAO:   'LGPD_ANONIMIZACAO',
    EXPORT_DADOS:        'EXPORT_DADOS',
    LOGIN:               'LOGIN',
    LOGIN_FALHOU:        'LOGIN_FALHOU',
    ACESSO_NEGADO:       'ACESSO_NEGADO',
});

// ============================================================
// Helper: extração segura do IP real (considera proxies reversos)
// ============================================================
const _getIpReal = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for pode ter múltiplos IPs; o primeiro é o real
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '0.0.0.0';
};

// ============================================================
// Helper: extração do ID do usuário autenticado
// (adapte ao formato do seu JWT/session)
// ============================================================
const _getUsuarioInfo = (req) => {
    const user = req.user; // Populado pelo authMiddleware
    if (!user) return { id: null, str: 'ANONIMO' };
    return {
        id:  user.id   || user.USUARIO_ID || null,
        str: user.email || user.login     || String(user.id) || 'DESCONHECIDO'
    };
};

// ============================================================
// Helper: inserção assíncrona na auditoria (não bloqueia a resposta)
// Fire-and-forget com log de erro isolado.
// ============================================================
const _inserirAuditoria = async ({
    usuarioId,
    usuarioStr,
    acao,
    tabela,
    registroId,
    rotaHttp,
    metodoHttp,
    ipOrigem,
    httpStatus,
    sucesso,
    detalhes
}) => {
    try {
        await db.query(
            `INSERT INTO AUDITORIA_ACESSOS (
                USUARIO_ID, USUARIO_ID_STR, ACAO, TABELA_AFETADA, REGISTRO_ID,
                ROTA_HTTP, METODO_HTTP, IP_ORIGEM, HTTP_STATUS_CODE, SUCESSO, DETALHES
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuarioId  || null,
                usuarioStr || 'SISTEMA',
                acao,
                tabela     || null,
                registroId || null,
                rotaHttp   || null,
                metodoHttp || null,
                ipOrigem,
                httpStatus || null,
                sucesso ? 1 : 0,
                detalhes   || null
            ]
        );
    } catch (auditErr) {
        // Nunca deixe falha na auditoria quebrar a requisição principal
        console.error('[AUDIT] Falha ao inserir log de auditoria:', auditErr.message);
    }
};

// ============================================================
// MIDDLEWARE 1: Auditar uma rota específica com ação explícita
// Uso: router.get('/api/clientes/:id', auditarAcessoPII('SELECT_PII', 'CLIENTES'), handler)
// ============================================================
const auditarAcessoPII = (acao, tabela) => {
    return async (req, res, next) => {
        const ip      = _getIpReal(req);
        const usuario = _getUsuarioInfo(req);
        const rota    = `${req.method} ${req.originalUrl}`;
        const regId   = parseInt(req.params?.id, 10) || null;

        // Intercepta o fim da resposta para capturar o status HTTP
        const originalEnd = res.end.bind(res);
        res.end = function (...args) {
            // Registra APÓS a resposta ser enviada (não bloqueia o cliente)
            setImmediate(() => {
                _inserirAuditoria({
                    usuarioId:  usuario.id,
                    usuarioStr: usuario.str,
                    acao,
                    tabela,
                    registroId: regId,
                    rotaHttp:   rota,
                    metodoHttp: req.method,
                    ipOrigem:   ip,
                    httpStatus: res.statusCode,
                    sucesso:    res.statusCode < 400,
                    detalhes:   null
                });
            });
            return originalEnd(...args);
        };

        next();
    };
};

// ============================================================
// MIDDLEWARE 2: Auditar automaticamente rotas por método HTTP
// Uso: app.use('/api/clientes', auditarRotasSensiveis('CLIENTES'))
// ============================================================
const auditarRotasSensiveis = (tabela) => {
    const MAPA_METODO_ACAO = {
        'GET':    ACOES.SELECT_PII,
        'PUT':    ACOES.UPDATE_PII,
        'PATCH':  ACOES.UPDATE_PII,
        'DELETE': ACOES.DELETE_PII,
        'POST':   'INSERT_PII'
    };

    return auditarAcessoPII(
        // Ação resolvida dinamicamente no momento da execução
        (req) => MAPA_METODO_ACAO[req.method] || 'ACESSO_PII',
        tabela
    );
};

// ============================================================
// FUNÇÃO: Registrar evento de login (success/fail)
// Uso no handler de login do index.js
// ============================================================
const registrarEventoLogin = async (req, usuarioId, usuarioStr, sucesso) => {
    await _inserirAuditoria({
        usuarioId,
        usuarioStr,
        acao:       sucesso ? ACOES.LOGIN : ACOES.LOGIN_FALHOU,
        tabela:     'USUARIOS',
        registroId: usuarioId,
        rotaHttp:   `POST ${req.originalUrl}`,
        metodoHttp: 'POST',
        ipOrigem:   _getIpReal(req),
        httpStatus: sucesso ? 200 : 401,
        sucesso,
        detalhes:   sucesso ? null : 'Credenciais inválidas'
    });
};

// ============================================================
// FUNÇÃO: Registrar acesso negado (403)
// ============================================================
const registrarAcessoNegado = async (req, motivo = '') => {
    const usuario = _getUsuarioInfo(req);
    await _inserirAuditoria({
        usuarioId:  usuario.id,
        usuarioStr: usuario.str,
        acao:       ACOES.ACESSO_NEGADO,
        tabela:     null,
        registroId: null,
        rotaHttp:   `${req.method} ${req.originalUrl}`,
        metodoHttp: req.method,
        ipOrigem:   _getIpReal(req),
        httpStatus: 403,
        sucesso:    false,
        detalhes:   motivo
    });
};

module.exports = {
    ACOES,
    auditarAcessoPII,
    auditarRotasSensiveis,
    registrarEventoLogin,
    registrarAcessoNegado
};
