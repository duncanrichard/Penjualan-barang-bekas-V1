import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/kategori-barang";

const emptyForm = {
    nama: "",
    deskripsi: "",
    status: "Aktif",
};

export default function KategoriBarangIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const kategoriBarangsRef = useRef([]);

    const [kategoriBarangs, setKategoriBarangs] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedKategori, setSelectedKategori] = useState(null);

    const fetchKategoriBarang = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data.");
            }

            setKategoriBarangs(result.data || []);
            kategoriBarangsRef.current = result.data || [];
        } catch (error) {
            console.error("Error kategori barang:", error);
            alert(error.message || "Gagal mengambil data kategori barang.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKategoriBarang();
    }, []);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: kategoriBarangs,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "kode",
                    title: "Kode",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "nama",
                    title: "Kategori",
                    render: function (data) {
                        return `
                            <div>
                                <p class="font-black text-slate-950">${escapeHtml(data || "-")}</p>
                                <p class="mt-1 text-xs font-bold text-slate-400">Kategori Barang</p>
                            </div>
                        `;
                    },
                },
                {
                    data: "jumlah_barang",
                    title: "Jumlah Barang",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || 0)} barang</span>`;
                    },
                },
                {
                    data: "deskripsi",
                    title: "Deskripsi",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "status",
                    title: "Status",
                    render: function (data) {
                        const status = data || "Aktif";
                        const badgeClass =
                            status === "Nonaktif"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${badgeClass}">${escapeHtml(status)}</span>`;
                    },
                },
                {
                    data: null,
                    title: "Aksi",
                    orderable: false,
                    searchable: false,
                    render: function (data, type, row) {
                        return `
                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-edit-kategori mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-kategori rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                            >
                                Hapus
                            </button>
                        `;
                    },
                },
            ],
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                infoEmpty: "Tidak ada data",
                infoFiltered: "(difilter dari _MAX_ total data)",
                zeroRecords: "Data kategori barang tidak ditemukan",
                emptyTable: "Data kategori barang masih kosong",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Berikutnya",
                    previous: "Sebelumnya",
                },
            },
            createdRow: function (row) {
                row.classList.add(
                    "border-t",
                    "border-slate-100",
                    "text-slate-700",
                    "hover:bg-blue-50/40"
                );

                Array.from(row.children).forEach((cell) => {
                    cell.classList.add("whitespace-nowrap", "px-5", "py-4");
                });
            },
            headerCallback: function (thead) {
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
            },
        });

        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
                dataTableRef.current = null;
            }
        };
    }, [kategoriBarangs]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(".btn-edit-kategori");
            const deleteButton = event.target.closest(".btn-delete-kategori");

            if (editButton) {
                const id = editButton.dataset.id;
                const kategori = kategoriBarangsRef.current.find(
                    (item) => String(item.id) === String(id)
                );

                if (kategori) {
                    handleOpenEditModal(kategori);
                }
            }

            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const kategori = kategoriBarangsRef.current.find(
                    (item) => String(item.id) === String(id)
                );

                if (kategori) {
                    handleDelete(kategori);
                }
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedKategori(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (kategori) => {
        setSelectedKategori(kategori);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedKategori(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchKategoriBarang();
    };

    const handleDelete = async (kategori) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus kategori "${kategori.nama}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${kategori.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus data.");
            }

            fetchKategoriBarang();
        } catch (error) {
            console.error("Error hapus kategori barang:", error);
            alert(error.message || "Kategori barang gagal dihapus.");
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                                    Master Data
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Kategori Barang
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Kelola daftar kategori barang untuk memudahkan
                                    pengelompokan data barang.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Kategori
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Kategori Barang
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {kategoriBarangs.length} kategori.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchKategoriBarang}
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
                                            <th>Kode</th>
                                            <th>Kategori</th>
                                            <th>Jumlah Barang</th>
                                            <th>Deskripsi</th>
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

            <KategoriBarangModal
                open={modalOpen}
                kategori={selectedKategori}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function KategoriBarangModal({ open, kategori = null, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(kategori?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (kategori) {
            setForm({
                nama: kategori.nama || "",
                deskripsi: kategori.deskripsi || "",
                status: kategori.status || "Aktif",
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, kategori]);

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

            const url = isEdit ? `${endpoint}/${kategori.id}` : endpoint;

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
                throw new Error(result.message || "Gagal menyimpan data.");
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan kategori barang:", error);
            alert(error.message || "Gagal menyimpan kategori barang.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Form Input
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isEdit
                                ? "Edit Kategori Barang"
                                : "Tambah Kategori Barang"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Kode kategori akan dibuat otomatis oleh sistem.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                        aria-label="Tutup modal"
                    >
                        ×
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[78vh] overflow-y-auto p-6"
                >
                    {isEdit && (
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-black text-slate-700">
                                Kode Kategori
                            </p>

                            <p className="mt-2 text-lg font-black text-blue-700">
                                {kategori?.kode || "-"}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Nama Kategori"
                            name="nama"
                            value={form.nama}
                            onChange={handleChange}
                            placeholder="Contoh: Material"
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
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-black text-slate-700">
                            Deskripsi
                        </span>

                        <textarea
                            name="deskripsi"
                            rows="4"
                            value={form.deskripsi}
                            onChange={handleChange}
                            placeholder="Tambahkan deskripsi kategori barang..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />

                        {errors.deskripsi?.[0] && (
                            <p className="mt-2 text-xs font-bold text-red-600">
                                {errors.deskripsi[0]}
                            </p>
                        )}
                    </label>

                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
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
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Menyimpan..."
                                : isEdit
                                  ? "Update Kategori"
                                  : "Simpan Kategori"}
                        </button>
                    </div>
                </form>
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
    error,
}) {
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
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
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
