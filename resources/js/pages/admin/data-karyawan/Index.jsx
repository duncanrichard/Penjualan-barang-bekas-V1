import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/data-karyawan";

const emptyForm = {
    nama: "",
    no_wa: "",
    alamat_ktp: "",
    alamat_domisili: "",
    tanggal_masuk: "",
};

export default function DataKaryawanIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const dataKaryawansRef = useRef([]);

    const [dataKaryawans, setDataKaryawans] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedKaryawan, setSelectedKaryawan] = useState(null);

    const fetchDataKaryawan = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data karyawan.");
            }

            const data = result.data || [];

            setDataKaryawans(data);
            dataKaryawansRef.current = data;
        } catch (error) {
            console.error("Error data karyawan:", error);
            alert(error.message || "Gagal mengambil data karyawan.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataKaryawan();
    }, []);

    useEffect(() => {
        dataKaryawansRef.current = dataKaryawans;
    }, [dataKaryawans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: dataKaryawans,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "nama",
                    title: "Nama",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "no_wa",
                    title: "No WA",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "alamat_ktp",
                    title: "Alamat KTP",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "alamat_domisili",
                    title: "Alamat Domisili",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "tanggal_masuk",
                    title: "Tanggal Masuk",
                    render: function (data) {
                        return `<span class="font-semibold">${formatDateIndonesia(data)}</span>`;
                    },
                },
                {
                    data: "lama_bekerja",
                    title: "Lama Bekerja",
                    render: function (data, type, row) {
                        const lamaBekerja = data || hitungLamaBekerja(row.tanggal_masuk);

                        return `<span class="font-black text-slate-950">${escapeHtml(lamaBekerja || "-")}</span>`;
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
                                class="btn-edit-karyawan mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-karyawan rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
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
                zeroRecords: "Data karyawan tidak ditemukan",
                emptyTable: "Data karyawan masih kosong",
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
    }, [dataKaryawans]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(".btn-edit-karyawan");
            const deleteButton = event.target.closest(".btn-delete-karyawan");

            if (editButton) {
                const id = editButton.dataset.id;

                const karyawan = dataKaryawansRef.current.find(
                    (item) => String(item.id) === String(id)
                );

                if (karyawan) {
                    handleOpenEditModal(karyawan);
                } else {
                    alert("Data karyawan tidak ditemukan.");
                }
            }

            if (deleteButton) {
                const id = deleteButton.dataset.id;

                const karyawan = dataKaryawansRef.current.find(
                    (item) => String(item.id) === String(id)
                );

                if (karyawan) {
                    handleDelete(karyawan);
                } else {
                    alert("Data karyawan tidak ditemukan.");
                }
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedKaryawan(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (karyawan) => {
        setSelectedKaryawan(karyawan);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedKaryawan(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchDataKaryawan();
    };

    const handleDelete = async (karyawan) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus karyawan "${karyawan.nama}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${karyawan.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus data karyawan.");
            }

            fetchDataKaryawan();
        } catch (error) {
            console.error("Error hapus data karyawan:", error);
            alert(error.message || "Data karyawan gagal dihapus.");
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
                                    Data Karyawan
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Data Karyawan
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Kelola data karyawan, nomor WhatsApp, alamat KTP,
                                    alamat domisili, tanggal masuk, dan lama bekerja.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Karyawan
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Karyawan
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {dataKaryawans.length} karyawan.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchDataKaryawan}
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
                                            <th>Nama</th>
                                            <th>No WA</th>
                                            <th>Alamat KTP</th>
                                            <th>Alamat Domisili</th>
                                            <th>Tanggal Masuk</th>
                                            <th>Lama Bekerja</th>
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

            <DataKaryawanModal
                open={modalOpen}
                karyawan={selectedKaryawan}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function DataKaryawanModal({ open, karyawan = null, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(karyawan?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (karyawan) {
            setForm({
                nama: karyawan.nama || "",
                no_wa: karyawan.no_wa || "",
                alamat_ktp: karyawan.alamat_ktp || "",
                alamat_domisili: karyawan.alamat_domisili || "",
                tanggal_masuk: karyawan.tanggal_masuk || "",
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, karyawan]);

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

            const url = isEdit ? `${endpoint}/${karyawan.id}` : endpoint;

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
                throw new Error(result.message || "Gagal menyimpan data karyawan.");
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan data karyawan:", error);
            alert(error.message || "Gagal menyimpan data karyawan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Form Input
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isEdit ? "Edit Data Karyawan" : "Tambah Data Karyawan"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Lengkapi form berikut untuk menyimpan data karyawan.
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
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Input
                            label="Nama"
                            name="nama"
                            value={form.nama}
                            onChange={handleChange}
                            placeholder="Nama karyawan"
                            error={errors.nama?.[0]}
                        />

                        <Input
                            label="No WA"
                            name="no_wa"
                            type="text"
                            value={form.no_wa}
                            onChange={handleChange}
                            placeholder="08xxxxxxxxxx"
                            error={errors.no_wa?.[0]}
                        />

                        <Input
                            label="Tanggal Masuk"
                            name="tanggal_masuk"
                            type="date"
                            value={form.tanggal_masuk}
                            onChange={handleChange}
                            error={errors.tanggal_masuk?.[0]}
                        />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Textarea
                            label="Alamat KTP"
                            name="alamat_ktp"
                            value={form.alamat_ktp}
                            onChange={handleChange}
                            placeholder="Alamat sesuai KTP"
                            error={errors.alamat_ktp?.[0]}
                        />

                        <Textarea
                            label="Alamat Domisili"
                            name="alamat_domisili"
                            value={form.alamat_domisili}
                            onChange={handleChange}
                            placeholder="Alamat domisili sekarang"
                            error={errors.alamat_domisili?.[0]}
                        />
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
                                ? "Update Karyawan"
                                : "Simpan Karyawan"}
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

function Textarea({
    label,
    name,
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

function formatDateIndonesia(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function hitungLamaBekerja(tanggalMasuk) {
    if (!tanggalMasuk) return "-";

    const masuk = new Date(tanggalMasuk);
    const sekarang = new Date();

    if (Number.isNaN(masuk.getTime()) || masuk > sekarang) {
        return "-";
    }

    let tahun = sekarang.getFullYear() - masuk.getFullYear();
    let bulan = sekarang.getMonth() - masuk.getMonth();
    let hari = sekarang.getDate() - masuk.getDate();

    if (hari < 0) {
        bulan -= 1;

        const bulanSebelumnya = new Date(
            sekarang.getFullYear(),
            sekarang.getMonth(),
            0
        );

        hari += bulanSebelumnya.getDate();
    }

    if (bulan < 0) {
        tahun -= 1;
        bulan += 12;
    }

    if (tahun > 0) {
        return `${tahun} tahun ${bulan} bulan`;
    }

    if (bulan > 0) {
        return `${bulan} bulan ${hari} hari`;
    }

    return `${hari} hari`;
}
