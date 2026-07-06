const forgotForm = document.getElementById('forgotForm');
const resetForm = document.getElementById('resetForm');
const emailInput = document.getElementById('email');
const tokenInput = document.getElementById('token');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const pageDesc = document.getElementById('pageDesc');
const pageTitle = document.getElementById('pageTitle');

let userEmail = '';

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    userEmail = email;

    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    
    const btnSubmit = document.getElementById('btnSubmitForgot');
    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    try {
        const response = await fetch('api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            successMsg.textContent = 'Código enviado para o seu e-mail!';
            successMsg.style.display = 'block';
            
            // Show step 2
            forgotForm.style.display = 'none';
            resetForm.style.display = 'block';
            
            pageTitle.textContent = 'Redefinir Senha';
            pageDesc.textContent = 'Insira o código de 6 dígitos recebido e defina sua nova senha.';
        } else {
            errorMsg.textContent = data.error || 'Erro ao enviar código de recuperação.';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Erro ao se conectar ao servidor.';
        errorMsg.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
});

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = tokenInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    if (newPassword.length < 6) {
        errorMsg.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        errorMsg.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMsg.textContent = 'As senhas não coincidem.';
        errorMsg.style.display = 'block';
        return;
    }

    const btnSubmit = document.getElementById('btnSubmitReset');
    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Redefinindo...';

    try {
        const response = await fetch('api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail, token, newPassword })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            successMsg.textContent = 'Senha alterada com sucesso! Redirecionando...';
            successMsg.style.display = 'block';
            resetForm.style.display = 'none';
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2500);
        } else {
            errorMsg.textContent = data.error || 'Código incorreto ou expirado.';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Erro ao se conectar ao servidor.';
        errorMsg.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
});
