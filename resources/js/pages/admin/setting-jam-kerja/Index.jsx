import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/setting-jam-kerja";

const emptyForm = {
    nama: "Jam Kerja Utama",
    jam_masuk: "08:00",
    jam_pulang: "17:00",
    status: "Aktif",
};

export default function SettingJamKerjaIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const settingsRef = useRef([]);

    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSetting, setSelectedSetting] = useState(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil setting jam kerja.");
            }

            const data = result.data || [];

            setSettings(data);
            settingsRef.current = data;
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal mengambil setting jam kerja.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: settings,
            pageLength: 10,
            order: [[0, "asc"]],
            columns: [
                {
                    data: "nama",
                    title: "Nama Setting",
                    render: (data) =>
                        `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "jam_masuk",
                    title: "Jam Masuk",
                    render: (data) =>
                        `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "jam_pulang",
                    title: "Jam Pulang",
                    render: (data) =>
                        `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "status",
                    title: "Status",
                    render: (data) => {
                        const cls =
                            data === "Aktif"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${cls}">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: null,
                    title: "Aksi",
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => `
                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-edit-setting mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-delete-setting rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                            Hapus
                        </button>
                    `,
                },
            ],
            language: dataTableLanguage(),
            createdRow: styleTableRow,
            headerCallback: styleTableHeader,
        });

        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, [settings]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleClick = (event) => {
            const editButton = event.target.closest(".btn-edit-setting");
            const deleteButton = event.target.closest(".btn-delete-setting");

            if (!editButton && !deleteButton) return;

            const id = String((editButton || deleteButton).dataset.id || "");

            const setting = settingsRef.current.find(
                (item) => String(item.id) === id
            );

            if (!setting) {
                alert("Data setting tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (editButton) {
                setSelectedSetting(setting);
                setModalOpen(true);
            }

            if (deleteButton) {
                handleDelete(setting);
            }
        };

        tableElement.addEventListener("click", handleClick);

        return () => {
            tableElement.removeEventListener("click", handleClick);
        };
    }, []);

    const handleDelete = async (setting) => {
        if (!window.confirm(`Hapus setting "${setting.nama}"?`)) return;

        try {
            const response = await fetch(`${endpoint}/${setting.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus setting.");
            }

            fetchSettings();
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal menghapus setting.");
        }
    };

    const handleOpenCreateModal = () => {
        setSelectedSetting(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedSetting(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchSettings();
    };

    return (
        <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                                    Setting
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Setting Jam Kerja
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Atur jam masuk dan jam pulang untuk menentukan
                                    keterangan telat, tepat waktu, dan lembur.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Setting
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex justify-end">
                            <button
                                type="button"
                                onClick={fetchSettings}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                            >
                                {loading ? "Memuat..." : "Refresh"}
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table
                                    ref={tableRef}
                                    className="display w-full text-left text-sm"
                                >
                                    <thead>
                                        <tr>
                                            <th>Nama Setting</th>
                                            <th>Jam Masuk</th>
                                            <th>Jam Pulang</th>
                                            <th>Status</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody />
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SettingModal
                open={modalOpen}
                setting={selectedSetting}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function SettingModal({ open, setting, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(setting?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (setting) {
            setForm({
                nama: setting.nama || "",
                jam_masuk: normalizeTime(setting.jam_masuk) || "08:00",
                jam_pulang: normalizeTime(setting.jam_pulang) || "17:00",
                status: setting.status || "Aktif",
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, setting]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${setting.id}` : endpoint;

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify(form),
            });

            const result = await response.json();

            if (!response.ok) {
                setErrors(result.errors || {});

                const validationMessage = result.errors
                    ? Object.values(result.errors).flat().join("\n")
                    : null;

                throw new Error(
                    validationMessage ||
                        result.message ||
                        "Gagal menyimpan setting."
                );
            }

            onSaved();
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal menyimpan setting.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Form Input
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isEdit
                                ? "Edit Setting Jam Kerja"
                                : "Tambah Setting Jam Kerja"}
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Nama Setting"
                            name="nama"
                            value={form.nama}
                            onChange={handleChange}
                            error={errors.nama?.[0]}
                        />

                        <Select
                            label="Status"
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            error={errors.status?.[0]}
                        >
                            <option value="Aktif">Aktif</option>
                            <option value="Nonaktif">Nonaktif</option>
                        </Select>

                        <Input
                            label="Jam Masuk"
                            name="jam_masuk"
                            type="time"
                            value={form.jam_masuk}
                            onChange={handleChange}
                            error={errors.jam_masuk?.[0]}
                        />

                        <Input
                            label="Jam Pulang"
                            name="jam_pulang"
                            type="time"
                            value={form.jam_pulang}
                            onChange={handleChange}
                            error={errors.jam_pulang?.[0]}
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Menyimpan..."
                                : isEdit
                                ? "Update Setting"
                                : "Simpan Setting"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Input({ label, name, type = "text", value, onChange, error }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">{error}</p>
            )}
        </label>
    );
}

function Select({ label, name, value, onChange, children, error }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
                {children}
            </select>

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">{error}</p>
            )}
        </label>
    );
}

function getCsrfToken() {
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeTime(value) {
    if (!value) return "";
    return String(value).slice(0, 5);
}

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data tidak ditemukan",
        emptyTable: "Data masih kosong",
        paginate: {
            first: "Pertama",
            last: "Terakhir",
            next: "Berikutnya",
            previous: "Sebelumnya",
        },
    };
}

function styleTableRow(row) {
    row.classList.add(
        "border-t",
        "border-slate-100",
        "text-slate-700",
        "hover:bg-blue-50/40"
    );

    Array.from(row.children).forEach((cell) => {
        cell.classList.add("whitespace-nowrap", "px-5", "py-4");
    });
}

function styleTableHeader(thead) {
    const headerRow = thead.querySelector("tr");

    if (headerRow) {
        headerRow.classList.add("bg-slate-950", "text-white");

        Array.from(headerRow.children).forEach((th) => {
            th.classList.add(
                "whitespace-nowrap",
                "px-5",
                "py-4",
                "font-black"
            );
        });
    }
}
