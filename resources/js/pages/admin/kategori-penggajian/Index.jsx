import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/kategori-penggajian";

const emptyForm = {
    nama_kategori: "",
    nominal: "",
};

export default function KategoriPenggajianIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const kategoriPenggajiansRef = useRef([]);

    const [kategoriPenggajians, setKategoriPenggajians] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedKategoriPenggajian, setSelectedKategoriPenggajian] = useState(null);

    const fetchKategoriPenggajian = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil kategori penggajian.");
            }

            const data = result.data || [];

            setKategoriPenggajians(data);
            kategoriPenggajiansRef.current = data;
        } catch (error) {
            console.error("Error kategori penggajian:", error);
            alert(error.message || "Gagal mengambil kategori penggajian.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKategoriPenggajian();
    }, []);

    useEffect(() => {
        kategoriPenggajiansRef.current = kategoriPenggajians;
    }, [kategoriPenggajians]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: kategoriPenggajians,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "nama_kategori",
                    title: "Nama Kategori",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "nominal",
                    title: "Nominal",
                    render: function (data, type, row) {
                        const nominal = row.nominal_format || formatRupiah(data);

                        return `<span class="font-black text-green-700">${escapeHtml(nominal || "Rp 0")}</span>`;
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
                                class="btn-edit-kategori-penggajian mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-kategori-penggajian rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                            >
                                Hapus
                            </button>
                        `;
                    },
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
    }, [kategoriPenggajians]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(".btn-edit-kategori-penggajian");
            const deleteButton = event.target.closest(".btn-delete-kategori-penggajian");

            if (!editButton && !deleteButton) return;

            const id = String((editButton || deleteButton).dataset.id || "");

            const kategoriPenggajian = kategoriPenggajiansRef.current.find(
                (item) => String(item.id) === id
            );

            if (!kategoriPenggajian) {
                alert("Data kategori tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (editButton) {
                handleOpenEditModal(kategoriPenggajian);
            }

            if (deleteButton) {
                handleDelete(kategoriPenggajian);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedKategoriPenggajian(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (kategoriPenggajian) => {
        setSelectedKategoriPenggajian(kategoriPenggajian);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedKategoriPenggajian(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchKategoriPenggajian();
    };

    const handleDelete = async (kategoriPenggajian) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus kategori "${kategoriPenggajian.nama_kategori}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${kategoriPenggajian.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus kategori penggajian.");
            }

            fetchKategoriPenggajian();
        } catch (error) {
            console.error("Error hapus kategori penggajian:", error);
            alert(error.message || "Kategori penggajian gagal dihapus.");
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
                                    Kategori Penggajian
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Kategori Penggajian
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Kelola kategori penggajian seperti nama kategori dan nominal gaji.
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
                                    Daftar Kategori Penggajian
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {kategoriPenggajians.length} kategori.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchKategoriPenggajian}
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
                                            <th>Nama Kategori</th>
                                            <th>Nominal</th>
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

            <KategoriPenggajianModal
                open={modalOpen}
                kategoriPenggajian={selectedKategoriPenggajian}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function KategoriPenggajianModal({
    open,
    kategoriPenggajian = null,
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(kategoriPenggajian?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (kategoriPenggajian) {
            setForm({
                nama_kategori: kategoriPenggajian.nama_kategori || "",
                nominal: kategoriPenggajian.nominal ?? "",
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, kategoriPenggajian]);

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

            const url = isEdit
                ? `${endpoint}/${kategoriPenggajian.id}`
                : endpoint;

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
                        "Gagal menyimpan kategori penggajian."
                );
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan kategori penggajian:", error);
            alert(error.message || "Gagal menyimpan kategori penggajian.");
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
                                ? "Edit Kategori Penggajian"
                                : "Tambah Kategori Penggajian"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Lengkapi form berikut untuk menyimpan kategori penggajian.
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
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Nama Kategori"
                            name="nama_kategori"
                            value={form.nama_kategori}
                            onChange={handleChange}
                            placeholder="Contoh: Gaji Pokok"
                            error={errors.nama_kategori?.[0]}
                        />

                        <Input
                            label="Nominal"
                            name="nominal"
                            type="number"
                            value={form.nominal}
                            onChange={handleChange}
                            placeholder="Contoh: 2500000"
                            error={errors.nominal?.[0]}
                        />
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-700">
                            Preview Nominal
                        </p>

                        <p className="mt-2 text-2xl font-black text-green-700">
                            {formatRupiah(form.nominal)}
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
                step={type === "number" ? "0.01" : undefined}
                min={type === "number" ? "0" : undefined}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

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

function formatRupiah(value) {
    const number = Number(value || 0);

    if (Number.isNaN(number)) {
        return "Rp 0";
    }

    return number.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Kategori penggajian tidak ditemukan",
        emptyTable: "Kategori penggajian masih kosong",
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
