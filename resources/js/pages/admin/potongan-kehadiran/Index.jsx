import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/potongan-kehadiran";

const emptyForm = {
    nama_kebijakan: "",
    jenis_potongan: "jam_masuk",
    toleransi_menit: "",
    nominal: "",
    keterangan: "",
    is_active: true,
};

export default function PotonganKehadiranIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const potonganKehadiransRef = useRef([]);

    const [potonganKehadirans, setPotonganKehadirans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPotonganKehadiran, setSelectedPotonganKehadiran] =
        useState(null);

    const fetchPotonganKehadiran = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal mengambil data potongan kehadiran."
                );
            }

            const data = result.data || [];

            setPotonganKehadirans(data);
            potonganKehadiransRef.current = data;
        } catch (error) {
            console.error("Error potongan kehadiran:", error);
            alert(error.message || "Gagal mengambil data potongan kehadiran.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPotonganKehadiran();
    }, []);

    useEffect(() => {
        potonganKehadiransRef.current = potonganKehadirans;
    }, [potonganKehadirans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: potonganKehadirans,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: "nama_kebijakan",
                    title: "Nama Kebijakan",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(
                            data || "-"
                        )}</span>`;
                    },
                },
                {
                    data: "jenis_potongan_label",
                    title: "Jenis",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(
                            data || "-"
                        )}</span>`;
                    },
                },
                {
                    data: "toleransi_menit",
                    title: "Toleransi",
                    render: function (data) {
                        return `<span class="font-black text-blue-700">${escapeHtml(
                            data || 0
                        )} menit</span>`;
                    },
                },
                {
                    data: "nominal",
                    title: "Nominal",
                    render: function (data, type, row) {
                        const nominal = row.nominal_format || formatRupiah(data);

                        return `<span class="font-black ${
                            row.jenis_potongan === "jam_keluar"
                                ? "text-green-700"
                                : "text-red-700"
                        }">${escapeHtml(nominal || "Rp 0")}</span>`;
                    },
                },
                {
                    data: "status_label",
                    title: "Status",
                    render: function (data, type, row) {
                        const isActive = Boolean(row.is_active);

                        return `
                            <span class="rounded-full px-3 py-1 text-xs font-black ${
                                isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                            }">
                                ${escapeHtml(data || "-")}
                            </span>
                        `;
                    },
                },
                {
                    data: "keterangan",
                    title: "Keterangan",
                    render: function (data) {
                        return `<span class="font-semibold">${escapeHtml(
                            data || "-"
                        )}</span>`;
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
                                class="btn-edit-potongan-kehadiran mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-potongan-kehadiran rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
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
    }, [potonganKehadirans]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const editButton = event.target.closest(
                ".btn-edit-potongan-kehadiran"
            );

            const deleteButton = event.target.closest(
                ".btn-delete-potongan-kehadiran"
            );

            if (!editButton && !deleteButton) return;

            const id = String((editButton || deleteButton).dataset.id || "");

            const potonganKehadiran = potonganKehadiransRef.current.find(
                (item) => String(item.id) === id
            );

            if (!potonganKehadiran) {
                alert(
                    "Data potongan kehadiran tidak ditemukan. Silakan refresh halaman."
                );
                return;
            }

            if (editButton) {
                handleOpenEditModal(potonganKehadiran);
            }

            if (deleteButton) {
                handleDelete(potonganKehadiran);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleOpenCreateModal = () => {
        setSelectedPotonganKehadiran(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (potonganKehadiran) => {
        setSelectedPotonganKehadiran(potonganKehadiran);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPotonganKehadiran(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchPotonganKehadiran();
    };

    const handleDelete = async (potonganKehadiran) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus kebijakan "${potonganKehadiran.nama_kebijakan}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `${endpoint}/${potonganKehadiran.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal menghapus potongan kehadiran."
                );
            }

            fetchPotonganKehadiran();
        } catch (error) {
            console.error("Error hapus potongan kehadiran:", error);
            alert(error.message || "Data potongan kehadiran gagal dihapus.");
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
                                    Payroll Attendance Rule
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Potongan Kehadiran
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Kelola nominal keterlambatan jam masuk dan
                                    nominal lembur karyawan berdasarkan aturan
                                    payroll perusahaan.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Kebijakan
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Kebijakan Kehadiran Payroll
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil:{" "}
                                    {potonganKehadirans.length} data.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchPotonganKehadiran}
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
                                            <th>Nama Kebijakan</th>
                                            <th>Jenis</th>
                                            <th>Toleransi</th>
                                            <th>Nominal</th>
                                            <th>Status</th>
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

            <PotonganKehadiranModal
                open={modalOpen}
                potonganKehadiran={selectedPotonganKehadiran}
                onClose={handleCloseModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function PotonganKehadiranModal({
    open,
    potonganKehadiran = null,
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(potonganKehadiran?.id);

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (potonganKehadiran) {
            setForm({
                nama_kebijakan: potonganKehadiran.nama_kebijakan || "",
                jenis_potongan:
                    potonganKehadiran.jenis_potongan || "jam_masuk",
                toleransi_menit: potonganKehadiran.toleransi_menit ?? "",
                nominal: potonganKehadiran.nominal ?? "",
                keterangan: potonganKehadiran.keterangan || "",
                is_active: Boolean(potonganKehadiran.is_active),
            });
        } else {
            setForm(emptyForm);
        }
    }, [open, potonganKehadiran]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setErrors({});

            const payload = {
                ...form,
                toleransi_menit: Number(form.toleransi_menit || 0),
                nominal: Number(form.nominal || 0),
                is_active: Boolean(form.is_active),
            };

            const url = isEdit
                ? `${endpoint}/${potonganKehadiran.id}`
                : endpoint;

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify(payload),
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
                        "Gagal menyimpan kebijakan kehadiran."
                );
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan potongan kehadiran:", error);
            alert(error.message || "Gagal menyimpan kebijakan kehadiran.");
        } finally {
            setSaving(false);
        }
    };

    const isLembur = form.jenis_potongan === "jam_keluar";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Form Kebijakan Payroll
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isEdit
                                ? "Edit Kebijakan Kehadiran"
                                : "Tambah Kebijakan Kehadiran"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Atur nominal keterlambatan jam masuk atau nominal
                            lembur karyawan.
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
                            label="Nama Kebijakan"
                            name="nama_kebijakan"
                            value={form.nama_kebijakan}
                            onChange={handleChange}
                            placeholder={
                                isLembur
                                    ? "Contoh: Nominal Lembur Per 30 Menit"
                                    : "Contoh: Nominal Keterlambatan Jam Masuk"
                            }
                            error={errors.nama_kebijakan?.[0]}
                        />

                        <Select
                            label="Jenis"
                            name="jenis_potongan"
                            value={form.jenis_potongan}
                            onChange={handleChange}
                            error={errors.jenis_potongan?.[0]}
                        >
                            <option value="jam_masuk">
                                Keterlambatan Jam Masuk
                            </option>
                            <option value="jam_keluar">Lembur</option>
                        </Select>

                        <Input
                            label="Toleransi Menit"
                            name="toleransi_menit"
                            type="number"
                            value={form.toleransi_menit}
                            onChange={handleChange}
                            placeholder="Contoh: 10"
                            error={errors.toleransi_menit?.[0]}
                        />

                        <Input
                            label="Nominal"
                            name="nominal"
                            type="number"
                            value={form.nominal}
                            onChange={handleChange}
                            placeholder="Contoh: 25000"
                            error={errors.nominal?.[0]}
                        />

                        <Textarea
                            label="Keterangan"
                            name="keterangan"
                            value={form.keterangan}
                            onChange={handleChange}
                            placeholder={
                                isLembur
                                    ? "Contoh: Berlaku untuk perhitungan lembur sesuai ketentuan payroll."
                                    : "Contoh: Berlaku setelah melewati batas toleransi keterlambatan."
                            }
                            error={errors.keterangan?.[0]}
                        />

                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={form.is_active}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-slate-300"
                            />

                            <span className="text-sm font-black text-slate-700">
                                Kebijakan Aktif
                            </span>
                        </label>
                    </div>

                    <div
                        className={`mt-6 rounded-2xl border p-4 ${
                            isLembur
                                ? "border-green-200 bg-green-50"
                                : "border-red-200 bg-red-50"
                        }`}
                    >
                        <p className="text-sm font-black text-slate-700">
                            Preview Nominal
                        </p>

                        <p
                            className={`mt-2 text-2xl font-black ${
                                isLembur ? "text-green-700" : "text-red-700"
                            }`}
                        >
                            {formatRupiah(form.nominal)}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {isLembur
                                ? `Nominal lembur berlaku setelah toleransi ${
                                      form.toleransi_menit || 0
                                  } menit.`
                                : `Nominal keterlambatan berlaku setelah toleransi ${
                                      form.toleransi_menit || 0
                                  } menit.`}
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
                                ? "Update Kebijakan"
                                : "Simpan Kebijakan"}
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
        zeroRecords: "Data kebijakan kehadiran tidak ditemukan",
        emptyTable: "Data kebijakan kehadiran masih kosong",
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
