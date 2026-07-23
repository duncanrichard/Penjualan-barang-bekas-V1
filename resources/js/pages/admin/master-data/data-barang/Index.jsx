import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/data-barang";
const kategoriEndpoint = "/data-barang/kategori-options";

const emptyForm = {
    kategori_id: "",
    nama_barang: "",
};

export default function DataBarangIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const dataBarangsRef = useRef([]);

    const [dataBarangs, setDataBarangs] = useState([]);
    const [kategoriOptions, setKategoriOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBarang, setSelectedBarang] = useState(null);

    const fetchDataBarang = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data barang.");
            }

            const data = Array.isArray(result.data) ? result.data : [];
            setDataBarangs(data);
            dataBarangsRef.current = data;
        } catch (error) {
            console.error("Error data barang:", error);
            alert(error.message || "Gagal mengambil data barang.");
        } finally {
            setLoading(false);
        }
    };

    const fetchKategoriOptions = async () => {
        try {
            const response = await fetch(kategoriEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil kategori.");
            }

            setKategoriOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error kategori options:", error);
            alert(error.message || "Gagal mengambil kategori.");
        }
    };

    useEffect(() => {
        fetchDataBarang();
        fetchKategoriOptions();
    }, []);

    useEffect(() => {
        dataBarangsRef.current = dataBarangs;
    }, [dataBarangs]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: dataBarangs,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "kode",
                    title: "Kode",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "nama_barang",
                    title: "Nama Barang",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "kategori",
                    title: "Kategori",
                    render: (data) => `
                        <div>
                            <p class="font-black text-slate-950">${escapeHtml(data?.nama || "-")}</p>
                            <p class="mt-1 text-xs font-bold text-slate-400">${escapeHtml(data?.kode || "-")}</p>
                        </div>
                    `,
                },
                {
                    data: "stok_mentah",
                    title: "Stok Mentah",
                    render: (data) => `<span class="font-black text-blue-700">${formatQty(data)} KG</span>`,
                },
                {
                    data: "stok_jadi",
                    title: "Stok Jadi",
                    render: (data) => `<span class="font-black text-green-700">${formatQty(data)} KG</span>`,
                },
                {
                    data: "stok_total",
                    title: "Total Stok",
                    render: (data) => `<span class="font-black text-slate-950">${formatQty(data)} KG</span>`,
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
                            class="btn-edit-barang mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-delete-barang rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                            Hapus
                        </button>
                    `,
                },
            ],
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                infoEmpty: "Tidak ada data",
                infoFiltered: "(difilter dari _MAX_ total data)",
                zeroRecords: "Data barang tidak ditemukan",
                emptyTable: "Data barang masih kosong",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Berikutnya",
                    previous: "Sebelumnya",
                },
            },
            createdRow: (row) => {
                row.classList.add("border-t", "border-slate-100", "text-slate-700", "hover:bg-blue-50/40");

                Array.from(row.children).forEach((cell) => {
                    cell.classList.add("whitespace-nowrap", "px-5", "py-4");
                });
            },
            headerCallback: (thead) => {
                const headerRow = thead.querySelector("tr");

                if (headerRow) {
                    headerRow.classList.add("bg-slate-950", "text-white");

                    Array.from(headerRow.children).forEach((th) => {
                        th.classList.add("whitespace-nowrap", "px-5", "py-4", "font-black");
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
    }, [dataBarangs]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(".btn-edit-barang");
            const deleteButton = event.target.closest(".btn-delete-barang");
            const button = editButton || deleteButton;

            if (!button) return;

            const id = String(button.dataset.id || "");
            const barang = dataBarangsRef.current.find((item) => String(item.id) === id);

            if (!barang) {
                alert("Data barang tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (editButton) handleOpenEditModal(barang);
            if (deleteButton) handleDelete(barang);
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedBarang(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (barang) => {
        setSelectedBarang(barang);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedBarang(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchDataBarang();
    };

    const handleDelete = async (barang) => {
        const confirmed = window.confirm(`Yakin ingin menghapus barang "${barang.nama_barang}"?`);

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${barang.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus data barang.");
            }

            fetchDataBarang();
        } catch (error) {
            console.error("Error hapus data barang:", error);
            alert(error.message || "Data barang gagal dihapus.");
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

                                <h3 className="mt-2 text-2xl font-black">Data Barang</h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Master barang hanya menyimpan kategori dan nama. Stok mentah/jadi dihitung dari transaksi.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Barang
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">Daftar Barang</h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {dataBarangs.length} barang.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchDataBarang}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                            >
                                {loading ? "Memuat..." : "Refresh"}
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table ref={tableRef} className="display w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>Kode</th>
                                            <th>Nama Barang</th>
                                            <th>Kategori</th>
                                            <th>Stok Mentah</th>
                                            <th>Stok Jadi</th>
                                            <th>Total Stok</th>
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

            <DataBarangModal
                open={modalOpen}
                barang={selectedBarang}
                kategoriOptions={kategoriOptions}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function DataBarangModal({ open, barang = null, kategoriOptions = [], onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(barang?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (barang) {
            setForm({
                kategori_id: barang.kategori_id || "",
                nama_barang: barang.nama_barang || "",
            });
        } else {
            setForm({ ...emptyForm });
        }
    }, [open, barang]);

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

        if (saving) return;

        if (!form.kategori_id) {
            alert("Kategori wajib dipilih.");
            return;
        }

        if (!form.nama_barang.trim()) {
            alert("Nama barang wajib diisi.");
            return;
        }

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${barang.id}` : endpoint;

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({
                    kategori_id: form.kategori_id,
                    nama_barang: form.nama_barang,
                }),
            });

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});
                throw new Error(buildValidationMessage(result));
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan data barang:", error);
            alert(error.message || "Gagal menyimpan data barang.");
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
                            {isEdit ? "Edit Data Barang" : "Tambah Data Barang"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Kode barang dibuat otomatis. Jenis barang dan stok tidak diisi di master.
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

                <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto p-6">
                    {isEdit && (
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-black text-slate-700">Kode Barang</p>
                            <p className="mt-2 text-lg font-black text-blue-700">{barang?.kode || "-"}</p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Kategori"
                            name="kategori_id"
                            value={form.kategori_id}
                            onChange={handleChange}
                            error={errors.kategori_id?.[0]}
                        >
                            <option value="">Pilih kategori</option>
                            {kategoriOptions.map((kategori) => (
                                <option key={kategori.id} value={kategori.id}>
                                    {kategori.kode} - {kategori.nama}
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Nama Barang"
                            name="nama_barang"
                            value={form.nama_barang}
                            onChange={handleChange}
                            placeholder="Contoh: Ember Proyek"
                            error={errors.nama_barang?.[0]}
                        />
                    </div>

                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-black text-blue-800">Catatan stok</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-blue-700">
                            Stok mentah berasal dari pembelian. Stok jadi berasal dari hasil borongan.
                            Master barang tidak perlu field jenis barang, harga, atau stok manual.
                        </p>
                    </div>

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
                            {saving ? "Menyimpan..." : isEdit ? "Update Barang" : "Simpan Barang"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Input({ label, name, type = "text", value, onChange, placeholder = "", error }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
        </label>
    );
}

function Select({ label, name, value, onChange, children, error }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
                {children}
            </select>

            {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
        </label>
    );
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
                const messageText = Array.isArray(messages) ? messages.join(", ") : String(messages);
                return `${field}: ${messageText}`;
            })
            .join("\n");
    }

    return result?.message || "Validasi gagal.";
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function toDecimal(value) {
    if (value === "" || value === null || value === undefined) return 0;

    if (typeof value === "number") {
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
    }

    let cleaned = String(value)
        .trim()
        .replace(/Rp|rp|IDR|idr/g, "")
        .replace(/\s/g, "");

    if (cleaned.includes(",") && cleaned.includes(".")) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
        cleaned = cleaned.replace(",", ".");
    }

    const number = Number(cleaned);

    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function formatQty(value) {
    return toDecimal(value).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}
