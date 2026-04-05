import { Link, useNavigate, useLocation } from "react-router-dom";
import { isAdmin, isLoggedIn } from "../api/client.js";

export default function Nav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const loggedIn  = isLoggedIn();
  const admin     = isAdmin();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const active = (path) =>
    `nav-link${location.pathname.startsWith(path) ? " nav-link--active" : ""}`;

  return (
    <nav className="navbar">
      <Link to={loggedIn ? "/tasks" : "/"} className="brand">
        <span className="brand-hex">⬡</span> AnnotChain
      </Link>

      <div className="nav-center">
        {loggedIn && (
          <>
            <Link to="/tasks"     className={active("/tasks")}>Tasks</Link>
            <Link to="/dashboard" className={active("/dashboard")}>My Work</Link>
            {admin && <Link to="/admin" className={active("/admin")}>Admin</Link>}
          </>
        )}
      </div>

      <div className="nav-right">
        {loggedIn ? (
          <>
            {admin && <span className="nav-role-badge">Admin</span>}
            <Link to="/profile" className={active("/profile")} style={{ fontSize: "0.875rem" }}>
              Profile
            </Link>
            <button className="nav-logout" onClick={logout}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="nav-link">Login</Link>
            <Link to="/register" className="btn-nav-cta">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
