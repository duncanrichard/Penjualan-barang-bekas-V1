import React, { useEffect, useState } from "react";

const endpoint = "/company-profile";

const emptyForm = {
    nama_perusahaan: "",
    alamat: "",
    no_wa: "",
    fonnte_api_token: "",
    fonnte_enabled: false,
};

const emptyProfile = {
    id: null,
    nama_perusahaan: "",
    alamat: "",
    no_wa: "",
    has_fonnte_api_token: false,
    fonnte_api_token_masked: null,
    fonnte_enabled: false,
    fonnte_connection_status: "unchecked",
    fonnte_connection_message:
        "Profil perusahaan dan token Fonnte belum disimpan.",
    fonnte_last_checked_at: null,
};

export default function CompanyProfileIndexPage() {
    const [form, setForm] = useState(emptyForm);
    const [profile, setProfile] = useState(emptyProfile);
    const [errors, setErrors] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [removingToken, setRemovingToken] = useState(false);

    const [showToken, setShowToken] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setErrors({});

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message ||
                        "Gagal mengambil profil perusahaan.",
                );
            }

            applyProfile(result.data);
        } catch (error) {
            console.error("Error profil perusahaan:", error);

            showNotification(
                "error",
                error.message ||
                    "Gagal mengambil profil perusahaan.",
            );
        } finally {
            setLoading(false);
        }
    };

    const applyProfile = (data) => {
        const nextProfile = {
            ...emptyProfile,
            ...(data || {}),
        };

        setProfile(nextProfile);

        setForm({
            nama_perusahaan:
                nextProfile.nama_perusahaan || "",
            alamat: nextProfile.alamat || "",
            no_wa: nextProfile.no_wa || "",

            /*
             * Token asli tidak pernah dimasukkan kembali ke form.
             * Form kosong berarti mempertahankan token lama.
             */
            fonnte_api_token: "",
            fonnte_enabled: Boolean(
                nextProfile.fonnte_enabled,
            ),
        });
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errors[name]) {
            setErrors((previous) => ({
                ...previous,
                [name]: undefined,
            }));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        if (!form.nama_perusahaan.trim()) {
            setErrors({
                nama_perusahaan: [
                    "Nama perusahaan wajib diisi.",
                ],
            });

            showNotification(
                "error",
                "Nama perusahaan wajib diisi.",
            );

            return;
        }

        try {
            setSaving(true);
            setErrors({});

            const payload = {
                nama_perusahaan:
                    form.nama_perusahaan.trim(),
                alamat: form.alamat.trim(),
                no_wa: form.no_wa.trim(),
                fonnte_api_token:
                    form.fonnte_api_token.trim(),
                fonnte_enabled: Boolean(
                    form.fonnte_enabled,
                ),
            };

            const response = await fetch(endpoint, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});

                throw new Error(
                    buildValidationMessage(result),
                );
            }

            applyProfile(result.data);

            showNotification(
                "success",
                result.message ||
                    "Profil perusahaan berhasil disimpan.",
            );
        } catch (error) {
            console.error(
                "Error simpan profil perusahaan:",
                error,
            );

            showNotification(
                "error",
                error.message ||
                    "Profil perusahaan gagal disimpan.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (testing) return;

        /*
         * Token baru perlu disimpan sebelum dites.
         */
        if (form.fonnte_api_token.trim()) {
            const confirmed = window.confirm(
                "Anda memasukkan token baru. Simpan profil terlebih dahulu sebelum melakukan tes koneksi.",
            );

            if (confirmed) {
                showNotification(
                    "warning",
                    "Klik tombol Simpan Perubahan, kemudian lakukan tes koneksi.",
                );
            }

            return;
        }

        if (!profile.has_fonnte_api_token) {
            showNotification(
                "error",
                "Isi dan simpan API token Fonnte terlebih dahulu.",
            );

            return;
        }

        try {
            setTesting(true);

            const response = await fetch(
                `${endpoint}/fonnte/test-connection`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({}),
                },
            );

            const result = await safeJson(response);

            if (result.data) {
                applyProfile(result.data);
            }

            if (!response.ok) {
                throw new Error(
                    result.message ||
                        "Koneksi Fonnte gagal.",
                );
            }

            showNotification(
                "success",
                result.message ||
                    "Fonnte berhasil terhubung.",
            );
        } catch (error) {
            console.error(
                "Error tes koneksi Fonnte:",
                error,
            );

            showNotification(
                "error",
                error.message ||
                    "Koneksi Fonnte gagal diperiksa.",
            );
        } finally {
            setTesting(false);
        }
    };

    const handleToggleFonnte = async () => {
        if (toggling) return;

        if (!profile.id) {
            showNotification(
                "error",
                "Simpan profil perusahaan terlebih dahulu.",
            );

            return;
        }

        if (form.fonnte_api_token.trim()) {
            showNotification(
                "warning",
                "Simpan token baru terlebih dahulu.",
            );

            return;
        }

        const nextEnabled = !profile.fonnte_enabled;

        if (nextEnabled && !profile.has_fonnte_api_token) {
            showNotification(
                "error",
                "API token Fonnte belum tersedia.",
            );

            return;
        }

        const actionText = nextEnabled
            ? "mengaktifkan"
            : "menonaktifkan";

        const confirmed = window.confirm(
            `Yakin ingin ${actionText} integrasi Fonnte?`,
        );

        if (!confirmed) return;

        try {
            setToggling(true);

            const response = await fetch(
                `${endpoint}/fonnte/toggle`,
                {
                    method: "PATCH",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        enabled: nextEnabled,
                    }),
                },
            );

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});

                throw new Error(
                    buildValidationMessage(result),
                );
            }

            applyProfile(result.data);

            showNotification(
                "success",
                result.message ||
                    "Status integrasi berhasil diperbarui.",
            );
        } catch (error) {
            console.error(
                "Error toggle Fonnte:",
                error,
            );

            showNotification(
                "error",
                error.message ||
                    "Status integrasi gagal diperbarui.",
            );
        } finally {
            setToggling(false);
        }
    };

    const handleRemoveToken = async () => {
        if (removingToken) return;

        if (!profile.has_fonnte_api_token) {
            showNotification(
                "warning",
                "Tidak ada token Fonnte yang tersimpan.",
            );

            return;
        }

        const confirmed = window.confirm(
            "Yakin ingin menghapus API token Fonnte? Integrasi akan dinonaktifkan.",
        );

        if (!confirmed) return;

        try {
            setRemovingToken(true);

            const response = await fetch(
                `${endpoint}/fonnte/token`,
                {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    credentials: "same-origin",
                },
            );

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message ||
                        "API token gagal dihapus.",
                );
            }

            applyProfile(result.data);

            showNotification(
                "success",
                result.message ||
                    "API token berhasil dihapus.",
            );
        } catch (error) {
            console.error(
                "Error hapus token Fonnte:",
                error,
            );

            showNotification(
                "error",
                error.message ||
                    "API token gagal dihapus.",
            );
        } finally {
            setRemovingToken(false);
        }
    };

    const showNotification = (type, message) => {
        setNotification({
            type,
            message,
        });

        window.clearTimeout(
            window.companyProfileNotificationTimer,
        );

        window.companyProfileNotificationTimer =
            window.setTimeout(() => {
                setNotification(null);
            }, 5000);
    };

    const statusConfig = getStatusConfig(
        profile.fonnte_connection_status,
    );

    return (
        <div className="space-y-6">
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 text-white">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                                Pengaturan Sistem
                            </p>

                            <h3 className="mt-2 text-2xl font-black">
                                Profil Perusahaan
                            </h3>

                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                Kelola identitas perusahaan,
                                nomor WhatsApp, dan integrasi
                                notifikasi WhatsApp melalui
                                Fonnte.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={fetchProfile}
                            disabled={loading}
                            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Memuat..."
                                : "Refresh Data"}
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6"
                >
                    {loading ? (
                        <LoadingState />
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                            <div className="space-y-6">
                                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <SectionHeader
                                        icon="🏢"
                                        title="Identitas Perusahaan"
                                        description="Informasi ini dapat digunakan pada header laporan, nota, dan pesan WhatsApp."
                                    />

                                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                                        <Input
                                            label="Nama Perusahaan"
                                            name="nama_perusahaan"
                                            value={
                                                form.nama_perusahaan
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Contoh: Store Isma"
                                            required
                                            error={
                                                errors
                                                    .nama_perusahaan?.[0]
                                            }
                                        />

                                        <Input
                                            label="Nomor WhatsApp"
                                            name="no_wa"
                                            value={form.no_wa}
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Contoh: 6281234567890"
                                            inputMode="tel"
                                            error={
                                                errors.no_wa?.[0]
                                            }
                                        />

                                        <div className="md:col-span-2">
                                            <Textarea
                                                label="Alamat Perusahaan"
                                                name="alamat"
                                                value={form.alamat}
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="Masukkan alamat lengkap perusahaan"
                                                rows={5}
                                                error={
                                                    errors.alamat?.[0]
                                                }
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <SectionHeader
                                        icon="🔐"
                                        title="API Fonnte"
                                        description="Token disimpan terenkripsi dan tidak ditampilkan kembali setelah tersimpan."
                                    />

                                    <div className="mt-5">
                                        <label className="block">
                                            <span className="mb-2 block text-sm font-black text-slate-700">
                                                API Token Fonnte
                                            </span>

                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <div className="relative min-w-0 flex-1">
                                                    <input
                                                        type={
                                                            showToken
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        name="fonnte_api_token"
                                                        value={
                                                            form.fonnte_api_token
                                                        }
                                                        onChange={
                                                            handleChange
                                                        }
                                                        placeholder={
                                                            profile.has_fonnte_api_token
                                                                ? "Kosongkan jika tidak ingin mengganti token"
                                                                : "Masukkan API token Fonnte"
                                                        }
                                                        autoComplete="new-password"
                                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-24 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowToken(
                                                                (
                                                                    previous,
                                                                ) =>
                                                                    !previous,
                                                            )
                                                        }
                                                        className="absolute inset-y-1 right-1 rounded-xl bg-white px-3 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-100"
                                                    >
                                                        {showToken
                                                            ? "Sembunyikan"
                                                            : "Lihat"}
                                                    </button>
                                                </div>

                                                {profile.has_fonnte_api_token && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleRemoveToken
                                                        }
                                                        disabled={
                                                            removingToken
                                                        }
                                                        className="rounded-2xl bg-red-100 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {removingToken
                                                            ? "Menghapus..."
                                                            : "Hapus Token"}
                                                    </button>
                                                )}
                                            </div>

                                            {errors
                                                .fonnte_api_token?.[0] && (
                                                <p className="mt-2 text-xs font-bold text-red-600">
                                                    {
                                                        errors
                                                            .fonnte_api_token[0]
                                                    }
                                                </p>
                                            )}
                                        </label>

                                        {profile.has_fonnte_api_token && (
                                            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                                                    Token tersimpan
                                                </p>

                                                <p className="mt-2 break-all font-mono text-sm font-black text-emerald-900">
                                                    {profile.fonnte_api_token_masked ||
                                                        "••••••••••••"}
                                                </p>
                                            </div>
                                        )}

                                        <label className="mt-5 flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <input
                                                type="checkbox"
                                                name="fonnte_enabled"
                                                checked={
                                                    form.fonnte_enabled
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />

                                            <span>
                                                <span className="block text-sm font-black text-slate-800">
                                                    Aktifkan
                                                    penggunaan
                                                    Fonnte
                                                </span>

                                                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                                                    Saat aktif,
                                                    sistem dapat
                                                    menggunakan
                                                    token ini untuk
                                                    mengirim
                                                    notifikasi
                                                    WhatsApp.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                </section>

                                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={fetchProfile}
                                        disabled={
                                            loading || saving
                                        }
                                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Batalkan Perubahan
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving
                                            ? "Menyimpan..."
                                            : "Simpan Perubahan"}
                                    </button>
                                </div>
                            </div>

                            <aside className="space-y-6">
                                <section
                                    className={`overflow-hidden rounded-3xl border ${statusConfig.border} bg-white`}
                                >
                                    <div
                                        className={`${statusConfig.background} p-5`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p
                                                    className={`text-xs font-black uppercase tracking-[0.18em] ${statusConfig.text}`}
                                                >
                                                    Status Fonnte
                                                </p>

                                                <h4
                                                    className={`mt-2 text-2xl font-black ${statusConfig.title}`}
                                                >
                                                    {
                                                        statusConfig.label
                                                    }
                                                </h4>
                                            </div>

                                            <div
                                                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${statusConfig.iconBackground}`}
                                            >
                                                {
                                                    statusConfig.icon
                                                }
                                            </div>
                                        </div>

                                        <p
                                            className={`mt-4 text-sm font-semibold leading-6 ${statusConfig.text}`}
                                        >
                                            {profile.fonnte_connection_message ||
                                                statusConfig.description}
                                        </p>
                                    </div>

                                    <div className="space-y-4 p-5">
                                        <StatusRow
                                            label="Integrasi aplikasi"
                                            value={
                                                profile.fonnte_enabled
                                                    ? "Aktif"
                                                    : "Nonaktif"
                                            }
                                            valueClass={
                                                profile.fonnte_enabled
                                                    ? "text-emerald-700"
                                                    : "text-slate-500"
                                            }
                                        />

                                        <StatusRow
                                            label="API token"
                                            value={
                                                profile.has_fonnte_api_token
                                                    ? "Tersimpan"
                                                    : "Belum tersedia"
                                            }
                                            valueClass={
                                                profile.has_fonnte_api_token
                                                    ? "text-emerald-700"
                                                    : "text-red-600"
                                            }
                                        />

                                        <StatusRow
                                            label="Terakhir diperiksa"
                                            value={formatDateTime(
                                                profile.fonnte_last_checked_at,
                                            )}
                                        />

                                        <div className="grid gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={
                                                    handleTestConnection
                                                }
                                                disabled={
                                                    testing ||
                                                    !profile.has_fonnte_api_token
                                                }
                                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {testing
                                                    ? "Memeriksa Koneksi..."
                                                    : "Tes Koneksi Fonnte"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={
                                                    handleToggleFonnte
                                                }
                                                disabled={
                                                    toggling ||
                                                    !profile.id
                                                }
                                                className={`rounded-2xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    profile.fonnte_enabled
                                                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                }`}
                                            >
                                                {toggling
                                                    ? "Memproses..."
                                                    : profile.fonnte_enabled
                                                      ? "Nonaktifkan Integrasi"
                                                      : "Aktifkan Integrasi"}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                                    <p className="text-sm font-black text-blue-900">
                                        Cara menghubungkan
                                    </p>

                                    <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-blue-800">
                                        <Instruction
                                            number="1"
                                            text="Salin token perangkat dari dashboard Fonnte."
                                        />

                                        <Instruction
                                            number="2"
                                            text="Masukkan token pada form API Fonnte."
                                        />

                                        <Instruction
                                            number="3"
                                            text="Klik Simpan Perubahan."
                                        />

                                        <Instruction
                                            number="4"
                                            text="Klik Tes Koneksi Fonnte untuk memeriksa perangkat."
                                        />

                                        <Instruction
                                            number="5"
                                            text="Aktifkan integrasi apabila status sudah Connected."
                                        />
                                    </div>
                                </section>
                            </aside>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title, description }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl">
                {icon}
            </div>

            <div>
                <h4 className="text-lg font-black text-slate-950">
                    {title}
                </h4>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function Input({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder = "",
    inputMode,
    required = false,
    error,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
                {required && (
                    <span className="ml-1 text-red-600">
                        *
                    </span>
                )}
            </span>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                inputMode={inputMode}
                required={required}
                className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    error
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
            />

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">
                    {error}
                </p>
            )}
        </label>
    );
}

function Textarea({
    label,
    name,
    value,
    onChange,
    placeholder = "",
    rows = 4,
    error,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                className={`w-full resize-y rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    error
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
            />

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">
                    {error}
                </p>
            )}
        </label>
    );
}

function StatusRow({
    label,
    value,
    valueClass = "text-slate-800",
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <span className="text-sm font-semibold text-slate-500">
                {label}
            </span>

            <span
                className={`text-right text-sm font-black ${valueClass}`}
            >
                {value}
            </span>
        </div>
    );
}

function Instruction({ number, text }) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                {number}
            </span>

            <span>{text}</span>
        </div>
    );
}

function Notification({ type, message, onClose }) {
    const styles = {
        success:
            "border-emerald-200 bg-emerald-50 text-emerald-800",
        error: "border-red-200 bg-red-50 text-red-800",
        warning:
            "border-amber-200 bg-amber-50 text-amber-800",
        info: "border-blue-200 bg-blue-50 text-blue-800",
    };

    return (
        <div
            className={`fixed right-5 top-5 z-[100] flex max-w-md items-start gap-4 rounded-2xl border p-4 shadow-2xl ${
                styles[type] || styles.info
            }`}
        >
            <p className="min-w-0 flex-1 text-sm font-black leading-6">
                {message}
            </p>

            <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg font-black"
                aria-label="Tutup notifikasi"
            >
                ×
            </button>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-black text-slate-600">
                    Memuat profil perusahaan...
                </p>
            </div>
        </div>
    );
}

function getStatusConfig(status) {
    switch (String(status || "").toLowerCase()) {
        case "connected":
            return {
                label: "Connected",
                description:
                    "Token valid dan perangkat Fonnte terhubung.",
                icon: "✓",
                border: "border-emerald-200",
                background: "bg-emerald-50",
                iconBackground:
                    "bg-emerald-600 text-white",
                text: "text-emerald-700",
                title: "text-emerald-950",
            };

        case "disconnected":
            return {
                label: "Disconnected",
                description:
                    "Perangkat Fonnte belum terhubung atau integrasi dinonaktifkan.",
                icon: "×",
                border: "border-red-200",
                background: "bg-red-50",
                iconBackground: "bg-red-600 text-white",
                text: "text-red-700",
                title: "text-red-950",
            };

        default:
            return {
                label: "Belum Diperiksa",
                description:
                    "Simpan token kemudian lakukan tes koneksi.",
                icon: "?",
                border: "border-amber-200",
                background: "bg-amber-50",
                iconBackground:
                    "bg-amber-500 text-white",
                text: "text-amber-700",
                title: "text-amber-950",
            };
    }
}

function formatDateTime(value) {
    if (!value) {
        return "Belum pernah";
    }

    /*
     * Backend mengirim Y-m-d H:i:s.
     * Ubah menjadi bentuk yang dapat dibaca Date browser.
     */
    const normalized = String(value).replace(" ", "T");
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return {
            message: "Response server bukan JSON valid.",
            raw_error: error?.message,
        };
    }
}

function buildValidationMessage(result) {
    if (result?.errors) {
        return Object.entries(result.errors)
            .map(([field, messages]) => {
                const messageText = Array.isArray(messages)
                    ? messages.join(", ")
                    : String(messages);

                return `${field}: ${messageText}`;
            })
            .join("\n");
    }

    return result?.message || "Validasi gagal.";
}

function getCsrfToken() {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || ""
    );
}
