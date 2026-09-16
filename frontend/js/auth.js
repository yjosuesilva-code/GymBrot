
const auth = {
 
  login(usuario, clave) {
    if (usuario === 'admin' && clave === 'admin') {
      localStorage.setItem('gymbrot_sesion', JSON.stringify({ usuario: 'admin', rol: 'ADMIN' }));
      return true;
    }
    return false;
  },
 
  // Devuelve la sesión actual (o null si no hay)
  current() {
    const s = localStorage.getItem('gymbrot_sesion');
    return s ? JSON.parse(s) : null;
  },
 
  // Cierra la sesión y vuelve al login
  logout() {
    localStorage.removeItem('gymbrot_sesion');
    window.location.href = 'login.html';
  },
 
  // Protege una página: si no hay sesión, manda al login
  requireAuth() {
    if (!auth.current()) window.location.href = 'login.html';
  }
};
 

