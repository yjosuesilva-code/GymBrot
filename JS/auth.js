const auth = {
  login(username, password) {
    if (username === "admin" && password === "admin") {
      const session = {
        usuario: username,
        nombre: "Administrador",
        tenantId: "t1",
        rol: "ADMIN",
      };
      localStorage.setItem("gymbrot_session", JSON.stringify(session));
      return session;
    }
    return null;
  },

  current() {
    const raw = localStorage.getItem("gymbrot_session");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    localStorage.removeItem("gymbrot_session");
    window.location.href = "login.html";
  },

  requireAuth() {
    if (!this.current()) window.location.href = "login.html";
  },
};