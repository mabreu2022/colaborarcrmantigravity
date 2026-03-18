const nodemailer = require('nodemailer');
require('dotenv').config();

// Mock data similar to what DB would return
const data = {
    TICKETID: 'TK-2026-00001',
    DESCRICAO: 'Teste de abertura de chamado via script de verificação.',
    NUMERO_SERIE: 'ABC123456',
    EMPRESA_NOME: 'Empresa Teste LTDA',
    NOME_CONTATO: 'João Silva',
    EMAIL_CONTATO: 'mauricio.magosoft@gmail.com',
    CONTATO_FONE: '(11) 98888-7777',
    ATIVO_NOME: 'Servidor Dell PowerEdge'
};

async function testEmail() {
    console.log('--- Testando Envio de E-mail ---');
    console.log('Configurações:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.MAILER_EMAIL,
        to: process.env.MAIL_TECH_TEAM
    });

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT == 465, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/"/g, '') : null
            }
        });

        const techEmails = process.env.MAIL_TECH_TEAM || 'tecnica3@colaborar.com.br,lucas.silva@colaborar.com.br';
        const contactEmail = data.EMAIL_CONTATO;

        console.log(`[Teste] Destinatários Técnicos: ${techEmails}`);
        if (contactEmail) console.log(`[Teste] Cópia para contato: ${contactEmail}`);

        const mailOptions = {
            from: process.env.MAILER_EMAIL,
            to: techEmails,
            cc: contactEmail || undefined,
            subject: `[TESTE] ${data.TICKETID} - ${data.EMPRESA_NOME}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #004a99 0%, #0066cc 100%); color: #fff; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 1px;">Novo Chamado Aberto (TESTE)</h1>
                        <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">Sistema de Gestão de Chamados - Colaborar CRM</p>
                    </div>
                    
                    <div style="padding: 35px; background-color: #ffffff;">
                        <p style="font-size: 16px; margin-bottom: 25px;">Olá Equipe Técnica,</p>
                        <p style="font-size: 15px; color: #555; margin-bottom: 30px;">ESTE É UM TESTE DO SISTEMA DE NOTIFICAÇÃO.</p>
                        
                        <!-- Dados do Chamado -->
                        <div style="background-color: #f8fbff; border-left: 4px solid #004a99; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 15px; color: #004a99; font-size: 18px; border-bottom: 1px solid #e0e6ed; padding-bottom: 8px;">Detalhes do Ticket</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #666; width: 140px;"><strong>Ticket ID:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.TICKETID}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666; vertical-align: top;"><strong>Descrição:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.DESCRICAO}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;"><strong>Ativo:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.ATIVO_NOME}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;"><strong>Número de Série:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.NUMERO_SERIE}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Dados do Cliente -->
                        <div style="background-color: #fcfcfc; border: 1px solid #eeeeee; padding: 20px; border-radius: 8px;">
                            <h3 style="margin: 0 0 15px; color: #444; font-size: 18px; border-bottom: 1px solid #eeeeee; padding-bottom: 8px;">Informações de Contato</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #666; width: 140px;"><strong>Empresa:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.EMPRESA_NOME}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;"><strong>Nome do Contato:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.NOME_CONTATO}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;"><strong>E-mail:</strong></td>
                                    <td style="padding: 6px 0; color: #333;"><a href="mailto:${data.EMAIL_CONTATO}" style="color: #0066cc; text-decoration: none;">${data.EMAIL_CONTATO}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;"><strong>Telefone:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${data.CONTATO_FONE}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <div style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 13px; color: #7f8c8d; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0;">Este é um e-mail de teste enviado pelo <strong>Colaborar CRM</strong>.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail enviado com sucesso:', info.messageId);
    } catch (error) {
        console.error('Erro no teste de e-mail:', error);
    }
}

testEmail();
