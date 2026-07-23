import "./bootstrap";
import React from "react";
import { createRoot } from "react-dom/client";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import AdminIndex from "./pages/admin/index";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Halaman awal diarahkan ke login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Halaman login */}
                <Route path="/login" element={<LoginPage />} />

                {/* Setelah login masuk ke halaman admin/index.jsx */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <AdminIndex />
                        </ProtectedRoute>
                    }
                />

                {/* Kalau route tidak dikenal balik ke login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
