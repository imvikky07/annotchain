import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Nav        from "./components/Nav.jsx";
import Home       from "./pages/Home.jsx";
import Login      from "./pages/Login.jsx";
import Register   from "./pages/Register.jsx";
import Tasks      from "./pages/Tasks.jsx";
import Annotate   from "./pages/Annotate.jsx";
import Dashboard  from "./pages/Dashboard.jsx";
import Admin      from "./pages/Admin.jsx";
import Profile    from "./pages/Profile.jsx";
import { isLoggedIn, isAdmin } from "./api/client.js";

function Require({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}
function RequireAdmin({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login"  replace />;
  if (!isAdmin())    return <Navigate to="/tasks"  replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="main-content">
        <Routes>
          <Route path="/"                 element={<Home />} />
          <Route path="/login"            element={<Login />} />
          <Route path="/register"         element={<Register />} />
          <Route path="/tasks"            element={<Require><Tasks /></Require>} />
          <Route path="/annotate/:taskId" element={<Require><Annotate /></Require>} />
          <Route path="/dashboard"        element={<Require><Dashboard /></Require>} />
          <Route path="/profile"          element={<Require><Profile /></Require>} />
          <Route path="/admin"            element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
