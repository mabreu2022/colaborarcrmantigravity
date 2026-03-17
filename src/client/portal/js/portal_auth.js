document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    const btn = e.target.querySelector('.btn-login');
    
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span>Verificando...</span>';

    try {
        const response = await fetch('../../api/portal/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store portal session
            localStorage.setItem('portalUser', JSON.stringify(data.user));
            // Redirect to portal home
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = data.error || 'Credenciais inválidas.';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<span>Entrar no Portal</span><i class="btn-icon">→</i>';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Erro de conexão com o servidor.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Entrar no Portal</span><i class="btn-icon">→</i>';
    }
});
