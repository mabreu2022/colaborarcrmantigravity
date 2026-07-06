const db = require('./db');
const nodemailer = require('nodemailer');
require('dotenv').config();

async function run() {
    console.log('--- Testing Forgot Password Logic ---');
    const email = 'conectsolutions@hotmail.com';
    
    try {
        // 1. Find User
        console.log(`Searching for user: ${email}...`);
        const query = 'SELECT ID_USUARIO FROM USUARIOS WHERE EMAIL = ?';
        const result = await db.query(query, [email]);
        if (result.length === 0) {
            console.error('User not found in DB!');
            process.exit(1);
        }
        const user = result[0];
        console.log(`User found! ID_USUARIO: ${user.ID_USUARIO}`);

        // 2. Generate and Update Token
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        console.log(`Generated token: ${resetToken}, Expiry: ${resetTokenExpiry}`);

        await db.query('UPDATE USUARIOS SET RESET_TOKEN = ?, RESET_TOKEN_EXPIRY = ? WHERE ID_USUARIO = ?',
            [resetToken, resetTokenExpiry, user.ID_USUARIO]);
        console.log('Database updated successfully with reset token and expiry.');

        // 3. Send Email
        console.log('Setting up email transporter...');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: 'dhrmtsymjouakufq'
            }
        });

        const fromEmail = process.env.MAILER_EMAIL || 'mauriciotask205@gmail.com';
        const mailOptions = {
            from: `"Colaborar CRM Test" <${fromEmail}>`,
            to: email,
            subject: 'Recuperação de Senha - Colaborar CRM Test',
            text: `Seu código de recuperação é: ${resetToken}`,
            html: `<b>Seu código de recuperação é: ${resetToken}</b>`
        };

        console.log(`Sending recovery email to: ${email}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent! MessageID: ${info.messageId}`);
        console.log('Forgot password test SUCCESSFUL.');

    } catch (e) {
        console.error('Test failed with error:', e);
    } finally {
        process.exit(0);
    }
}

run();
