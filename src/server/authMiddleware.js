const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // Permitir acesso sem token se estivermos em modo de desenvolvimento ou se a rota for pública
    // Em produção real, este bypass deve ser removido
    if (process.env.NODE_ENV === 'development' || 
        req.originalUrl.includes('/api/login') || 
        req.originalUrl.includes('/api/portal/login') || 
        req.originalUrl.includes('/api/forgot-password') || 
        req.originalUrl.includes('/api/reset-password')) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Se não houver token, verificar se o utilizador está a aceder via localhost/127.0.0.1
        // (temporário para compatibilidade com a interface antiga que não envia tokens)
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
            req.user = { ID_USUARIO: 1, PERFIL: 'ADMIN' }; // Mock user for local testing without tokens
            return next();
        }
        return res.status(403).json({ error: "Token não fornecido. Acesso negado." });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production', (err, decoded) => {
        if (err) return res.status(401).json({ error: "Token inválido ou expirado." });
        req.user = decoded;
        next();
    });
}

function generateToken(user) {
    // Definir payload consoante se for utilizador interno ou contato do portal
    const payload = {
        id: user.ID_USUARIO || user.ID_CONTATO,
        email: user.EMAIL || user.EMAIL_CONTATO,
        perfil: user.PERFIL || 'PORTAL', // ou mapear o ID_PERFIL para um nome
        cliente_id: user.ID_CLIENTE // Relevante para IDOR/Multi-tenancy
    };
    
    // O JWT_SECRET deve estar no .env
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production', { expiresIn: '12h' });
}

module.exports = { verifyToken, generateToken };
