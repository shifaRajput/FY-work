// Toggle Password
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// Login Submit (Instant Redirect)
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const btn = document.querySelector('.login-btn');
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;

    btn.innerHTML = 'VERIFYING...';
    btn.disabled = true;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, password: passVal })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            window.location.href = "/admin/analytics";
        } else {
            alert(data.message);
            btn.innerHTML = 'LOGIN';
            btn.disabled = false;
        }
    })
    .catch(error => {
        alert("Server Error! Check if Flask is running.");
        btn.innerHTML = 'LOGIN';
        btn.disabled = false;
    });
});

// Forgot Password Modal
function openModal() { document.getElementById('forgotModal').style.display = 'flex'; }
function closeModal() { document.getElementById('forgotModal').style.display = 'none'; }

document.getElementById('forgotForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const pin = document.getElementById('forgotPin').value;
    const newPass = document.getElementById('forgotNewPass').value;

    fetch('/api/forgot_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, pin: pin, new_password: newPass })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            alert("Password reset successful! You can now log in.");
            closeModal();
            document.getElementById('password').value = ''; 
        } else {
            alert(data.message);
        }
    });
});