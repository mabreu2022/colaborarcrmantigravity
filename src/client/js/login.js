
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.style.display = 'none';

    try {
        const response = await fetch('api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.token) localStorage.setItem('token', data.token); // Guardar o Token JWT
            window.location.href = 'index.html';
        } else {
            errorMsg.textContent = data.message || 'Erro ao fazer login';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Erro de conexão com o servidor';
        errorMsg.style.display = 'block';
    }
});
