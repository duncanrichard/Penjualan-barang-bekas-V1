import React, { useState } from "react";
import axios from "axios";

export default function LoginPage() {
    const [form, setForm] = useState({
        username: "",
        password: "",
        remember: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!form.username.trim()) {
            setError("Username wajib diisi.");
            return;
        }

        if (!form.password.trim()) {
            setError("Password wajib diisi.");
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post("/login", {
                username: form.username,
                password: form.password,
                remember: form.remember,
            });

            if (response.data.success) {
                window.location.href = response.data.redirect || "/dashboard";
            } else {
                setError(response.data.message || "Login gagal.");
            }
        } catch (err) {
            if (err.response?.status === 419) {
                setError("Session kadaluarsa. Silakan refresh halaman lalu login lagi.");
            } else if (err.response?.data?.errors?.username) {
                setError(err.response.data.errors.username[0]);
            } else if (err.response?.data?.errors?.password) {
                setError(err.response.data.errors.password[0]);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Terjadi kesalahan saat login.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.leftPanel}>
                <div style={styles.brand}>
                    <div style={styles.brandLogo}>POS</div>
                    <div>
                        <div style={styles.brandSmall}>SISTEM ADMIN</div>
                        <div style={styles.brandTitle}>Store Isma</div>
                    </div>
                </div>

                <h1 style={styles.heroTitle}>
                    Kelola penjualan, stok, dan data operasional dengan mudah.
                </h1>

                <p style={styles.heroText}>
                    Masuk ke dashboard untuk mengelola master data, karyawan,
                    pembelian, penjualan, penggajian, dan laporan stok barang.
                </p>

                <div style={styles.featureList}>
                    <div style={styles.featureItem}>✓ Dashboard monitoring</div>
                    <div style={styles.featureItem}>✓ Manajemen stok barang</div>
                    <div style={styles.featureItem}>✓ Data transaksi lengkap</div>
                </div>
            </div>

            <div style={styles.rightPanel}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <div style={styles.mobileLogo}>POS</div>
                        <h2 style={styles.title}>Login Sistem</h2>
                        <p style={styles.subtitle}>
                            Masukkan username dan password untuk melanjutkan.
                        </p>
                    </div>

                    {error && <div style={styles.alert}>{error}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.group}>
                            <label style={styles.label}>Username</label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="Masukkan username"
                                style={styles.input}
                                autoComplete="username"
                                autoFocus
                                disabled={loading}
                            />
                        </div>

                        <div style={styles.group}>
                            <label style={styles.label}>Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Masukkan password"
                                style={styles.input}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                        </div>

                        <div style={styles.optionRow}>
                            <label style={styles.remember}>
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={form.remember}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <span>Ingat saya</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...styles.button,
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            {loading ? "Memproses..." : "Masuk ke Dashboard"}
                        </button>
                    </form>

                    <div style={styles.infoBox}>
                        <strong>Akun default:</strong>
                        <br />
                        Username: admin
                        <br />
                        Password: admin123456
                    </div>

                    <div style={styles.footer}>
                        © 2026 Sistem POS
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        background: "#0f172a",
        fontFamily: "Inter, Arial, sans-serif",
    },

    leftPanel: {
        padding: "56px",
        color: "#ffffff",
        background:
            "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
    },

    brand: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "56px",
    },

    brandLogo: {
        width: "64px",
        height: "64px",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "20px",
        letterSpacing: "1px",
    },

    brandSmall: {
        fontSize: "13px",
        letterSpacing: "3px",
        fontWeight: "800",
        opacity: 0.85,
    },

    brandTitle: {
        fontSize: "28px",
        fontWeight: "900",
        marginTop: "4px",
    },

    heroTitle: {
        margin: 0,
        maxWidth: "720px",
        fontSize: "48px",
        lineHeight: "1.12",
        fontWeight: "900",
        letterSpacing: "-1px",
    },

    heroText: {
        marginTop: "24px",
        maxWidth: "620px",
        color: "#dbeafe",
        fontSize: "17px",
        lineHeight: "1.8",
        fontWeight: "500",
    },

    featureList: {
        marginTop: "36px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        fontSize: "16px",
        fontWeight: "700",
        color: "#eff6ff",
    },

    featureItem: {
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "14px",
        padding: "14px 18px",
        maxWidth: "360px",
    },

    rightPanel: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "32px",
        boxSizing: "border-box",
    },

    card: {
        width: "100%",
        maxWidth: "440px",
        background: "#ffffff",
        borderRadius: "24px",
        padding: "34px",
        boxShadow: "0 25px 70px rgba(15, 23, 42, 0.16)",
        border: "1px solid #e2e8f0",
        boxSizing: "border-box",
    },

    header: {
        marginBottom: "24px",
    },

    mobileLogo: {
        width: "58px",
        height: "58px",
        borderRadius: "16px",
        background: "#2563eb",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "900",
        fontSize: "18px",
        marginBottom: "18px",
    },

    title: {
        margin: 0,
        fontSize: "30px",
        color: "#0f172a",
        fontWeight: "900",
    },

    subtitle: {
        marginTop: "8px",
        marginBottom: 0,
        color: "#64748b",
        fontSize: "14px",
        lineHeight: "1.6",
    },

    alert: {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fecaca",
        borderRadius: "12px",
        padding: "12px 14px",
        marginBottom: "18px",
        fontSize: "14px",
        fontWeight: "700",
    },

    form: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },

    group: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },

    label: {
        fontSize: "14px",
        fontWeight: "800",
        color: "#334155",
    },

    input: {
        height: "48px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        padding: "0 14px",
        fontSize: "14px",
        outline: "none",
        color: "#0f172a",
        background: "#ffffff",
        boxSizing: "border-box",
    },

    optionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    remember: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        color: "#475569",
        fontWeight: "600",
    },

    button: {
        height: "50px",
        border: "none",
        borderRadius: "12px",
        background: "#2563eb",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "900",
        boxShadow: "0 12px 24px rgba(37, 99, 235, 0.25)",
    },

    infoBox: {
        marginTop: "20px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "14px",
        color: "#475569",
        fontSize: "13px",
        lineHeight: "1.7",
    },

    footer: {
        marginTop: "22px",
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: "600",
    },
};
