import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/penggajian-karyawan";
const dataKaryawanEndpoint = "/data-karyawan";
const kategoriPenggajianEndpoint = "/kategori-penggajian";

const emptyForm = {
    data_karyawan_id: "",
    kategori_penggajian_id: "",
    nominal: "",
    keterangan: "",
};

export default function PenggajianKaryawanIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const penggajianKaryawansRef = useRef([]);

    const [penggajianKaryawans, setPenggajianKaryawans] = useState([]);
    const [dataKaryawans, setDataKaryawans] = useState([]);
    const [kategoriPenggajians, setKategoriPenggajians] = useState([]);

    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPenggajianKaryawan, setSelectedPenggajianKaryawan] = useState(null);

    const fetchPenggajianKaryawan = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data penggajian karyawan.");
            }

            const data = result.data || [];

            setPenggajianKaryawans(data);
            penggajianKaryawansRef.current = data;
        } catch (error) {
            console.error("Error penggajian karyawan:", error);
            alert(error.message || "Gagal mengambil data penggajian karyawan.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDataKaryawan = async () => {
        try {
            const response = await fetch(dataKaryawanEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data karyawan.");
            }

            setDataKaryawans(result.data || []);
        } catch (error) {
            console.error("Error data karyawan:", error);
            alert(error.message || "Gagal mengambil data karyawan.");
        }
    };

    const fetchKategoriPenggajian = async () => {
        try {
            const response = await fetch(kategoriPenggajianEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil kategori penggajian.");
            }

            setKategoriPenggajians(result.data || []);
        } catch (error) {
            console.error("Error kategori penggajian:", error);
            alert(error.message || "Gagal mengambil kategori penggajian.");
        }
    };

    useEffect(() => {
        fetchPenggajianKaryawan();
        fetchDataKaryawan();
        fetchKategoriPenggajian();
    }, []);

    useEffect(() => {
        penggajianKaryawansRef.current = penggajianKaryawans;
    }, [penggajianKaryawans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: penggajianKaryawans,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "nama_karyawan",
                    title: "Nama Karyawan",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "nama_kategori",
                    title: "Kategori Penggajian",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
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
                    data: "keterangan",
                    title: "Keterangan",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
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
                                class="btn-edit-penggajian-karyawan mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-penggajian-karyawan rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
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
    }, [penggajianKaryawans]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(".btn-edit-penggajian-karyawan");
            const deleteButton = event.target.closest(".btn-delete-penggajian-karyawan");

            if (!editButton && !deleteButton) return;

            const id = String((editButton || deleteButton).dataset.id || "");

            const penggajianKaryawan = penggajianKaryawansRef.current.find(
                (item) => String(item.id) === id
            );

            if (!penggajianKaryawan) {
                alert("Data penggajian tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (editButton) {
                handleOpenEditModal(penggajianKaryawan);
            }

            if (deleteButton) {
                handleDelete(penggajianKaryawan);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedPenggajianKaryawan(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (penggajianKaryawan) => {
        setSelectedPenggajianKaryawan(penggajianKaryawan);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPenggajianKaryawan(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchPenggajianKaryawan();
        fetchKategoriPenggajian();
        fetchDataKaryawan();
    };

    const handleDelete = async (penggajianKaryawan) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus penggajian "${penggajianKaryawan.nama_karyawan}" - "${penggajianKaryawan.nama_kategori}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${penggajianKaryawan.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus data penggajian karyawan.");
            }

            fetchPenggajianKaryawan();
        } catch (error) {
            console.error("Error hapus penggajian karyawan:", error);
            alert(error.message || "Data penggajian karyawan gagal dihapus.");
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
                                    Penggajian Karyawan
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Penggajian Karyawan
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Kelola data karyawan dan kategori penggajian yang diterima karyawan.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Penggajian
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Penggajian Karyawan
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {penggajianKaryawans.length} data.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchPenggajianKaryawan}
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
                                            <th>Nama Karyawan</th>
                                            <th>Kategori Penggajian</th>
                                            <th>Nominal</th>
                                            <th>Keterangan</th>
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

            <PenggajianKaryawanModal
                open={modalOpen}
                penggajianKaryawan={selectedPenggajianKaryawan}
                dataKaryawans={dataKaryawans}
                kategoriPenggajians={kategoriPenggajians}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function PenggajianKaryawanModal({
    open,
    penggajianKaryawan = null,
    dataKaryawans = [],
    kategoriPenggajians = [],
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(penggajianKaryawan?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (penggajianKaryawan) {
            setForm({
                data_karyawan_id: penggajianKaryawan.data_karyawan_id || "",
                kategori_penggajian_id: penggajianKaryawan.kategori_penggajian_id || "",
                nominal: penggajianKaryawan.nominal ?? "",
                keterangan: penggajianKaryawan.keterangan || "",
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, penggajianKaryawan]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleKategoriChange = (event) => {
        const kategoriId = event.target.value;

        const kategori = kategoriPenggajians.find(
            (item) => String(item.id) === String(kategoriId)
        );

        setForm((prev) => ({
            ...prev,
            kategori_penggajian_id: kategoriId,
            nominal: kategori ? kategori.nominal : prev.nominal,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit
                ? `${endpoint}/${penggajianKaryawan.id}`
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
                        "Gagal menyimpan data penggajian karyawan."
                );
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan penggajian karyawan:", error);
            alert(error.message || "Gagal menyimpan data penggajian karyawan.");
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
                                ? "Edit Penggajian Karyawan"
                                : "Tambah Penggajian Karyawan"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Pilih karyawan dan kategori penggajian.
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
                        <Select
                            label="Nama Karyawan"
                            name="data_karyawan_id"
                            value={form.data_karyawan_id}
                            onChange={handleChange}
                            error={errors.data_karyawan_id?.[0]}
                        >
                            <option value="">Pilih karyawan</option>
                            {dataKaryawans.map((karyawan) => (
                                <option key={karyawan.id} value={karyawan.id}>
                                    {karyawan.nama}
                                </option>
                            ))}
                        </Select>

                        <Select
                            label="Kategori Penggajian"
                            name="kategori_penggajian_id"
                            value={form.kategori_penggajian_id}
                            onChange={handleKategoriChange}
                            error={errors.kategori_penggajian_id?.[0]}
                        >
                            <option value="">Pilih kategori</option>
                            {kategoriPenggajians.map((kategori) => (
                                <option key={kategori.id} value={kategori.id}>
                                    {kategori.nama_kategori} - {kategori.nominal_format || formatRupiah(kategori.nominal)}
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Nominal"
                            name="nominal"
                            type="number"
                            value={form.nominal}
                            onChange={handleChange}
                            placeholder="Contoh: 2500000"
                            error={errors.nominal?.[0]}
                        />

                        <Textarea
                            label="Keterangan"
                            name="keterangan"
                            value={form.keterangan}
                            onChange={handleChange}
                            placeholder="Opsional"
                            error={errors.keterangan?.[0]}
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
                                ? "Update Penggajian"
                                : "Simpan Penggajian"}
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

function Select({ label, name, value, onChange, error, children }) {
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

function Textarea({
    label,
    name,
    value,
    onChange,
    placeholder = "",
    error,
}) {
    return (
        <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <textarea
                name={name}
                rows="4"
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
        zeroRecords: "Data penggajian karyawan tidak ditemukan",
        emptyTable: "Data penggajian karyawan masih kosong",
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
