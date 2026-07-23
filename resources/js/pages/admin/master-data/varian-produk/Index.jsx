import React, { useEffect, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import Select from "react-select";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/barang-variants";
const barangOptionsEndpoint = "/barang-variants/barang-options";

const emptyForm = {
    id: "",
    data_barang_id: "",
    nama: "",
    kode: "",
    is_active: true,
};

export default function VarianProdukIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const variantsRef = useRef([]);

    const [variants, setVariants] = useState([]);
    const [barangOptions, setBarangOptions] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");

    const isEdit = modalMode === "edit";
    const isDetail = modalMode === "detail";

    const fetchVariants = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data varian produk.");
            }

            const data = Array.isArray(result.data) ? result.data : [];

            setVariants(data);
            variantsRef.current = data;
        } catch (error) {
            console.error("Error varian produk:", error);
            alert(error.message || "Gagal mengambil data varian produk.");
        } finally {
            setLoading(false);
        }
    };

    const fetchBarangOptions = async () => {
        try {
            const response = await fetch(barangOptionsEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data barang.");
            }

            setBarangOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error barang options:", error);
            alert(error.message || "Gagal mengambil data barang.");
        }
    };

    useEffect(() => {
        fetchVariants();
        fetchBarangOptions();
    }, []);

    useEffect(() => {
        variantsRef.current = variants;
    }, [variants]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: variants,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                {
                    data: null,
                    title: "Barang",
                    render: function (data, type, row) {
                        return `
                            <div>
                                <div class="font-black text-slate-950">${escapeHtml(row.nama_barang || "-")}</div>
                                <div class="text-xs font-bold text-slate-500">${escapeHtml(row.kode_barang || "-")}</div>
                            </div>
                        `;
                    },
                },
                {
                    data: "nama",
                    title: "Nama Varian",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "kode",
                    title: "Kode",
                    render: function (data) {
                        return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "is_active",
                    title: "Status",
                    render: function (data) {
                        const active = Boolean(data);
                        const cls = active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700";
                        const label = active ? "Aktif" : "Nonaktif";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${cls}">${label}</span>`;
                    },
                },
                {
                    data: "created_at",
                    title: "Dibuat",
                    render: function (data) {
                        return `<span class="font-semibold text-slate-600">${escapeHtml(data || "-")}</span>`;
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
                                class="btn-detail-varian mr-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                            >
                                Detail
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-edit-varian mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.id)}"
                                class="btn-delete-varian rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
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
    }, [variants]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const detailButton = event.target.closest(".btn-detail-varian");
            const editButton = event.target.closest(".btn-edit-varian");
            const deleteButton = event.target.closest(".btn-delete-varian");

            const button = detailButton || editButton || deleteButton;

            if (!button) return;

            const id = String(button.dataset.id || "");
            const variant = variantsRef.current.find((item) => String(item.id) === id);

            if (!variant) {
                alert("Data varian tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (detailButton) {
                openDetailModal(variant);
            }

            if (editButton) {
                openEditModal(variant);
            }

            if (deleteButton) {
                handleDelete(variant);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const barangSelectOptions = barangOptions.map((barang) => ({
        value: barang.id,
        label: `${barang.kode_barang || barang.kode || "-"} - ${barang.nama_barang}`,
        barang,
    }));

    const selectedBarangOption =
        barangSelectOptions.find((option) => String(option.value) === String(form.data_barang_id)) || null;

    const openCreateModal = () => {
        setForm(emptyForm);
        setErrors({});
        setModalMode("create");
        setModalOpen(true);
    };

    const openEditModal = (variant) => {
        setForm({
            id: variant.id || "",
            data_barang_id: variant.data_barang_id || "",
            nama: variant.nama || "",
            kode: variant.kode || "",
            is_active: Boolean(variant.is_active),
        });
        setErrors({});
        setModalMode("edit");
        setModalOpen(true);
    };

    const openDetailModal = (variant) => {
        setForm({
            id: variant.id || "",
            data_barang_id: variant.data_barang_id || "",
            nama: variant.nama || "",
            kode: variant.kode || "",
            is_active: Boolean(variant.is_active),
        });
        setErrors({});
        setModalMode("detail");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setForm(emptyForm);
        setErrors({});
        setModalMode("create");
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleBarangChange = (selectedOption) => {
        setForm((prev) => ({
            ...prev,
            data_barang_id: selectedOption?.value || "",
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isDetail || saving) return;

        if (!form.data_barang_id) {
            alert("Barang wajib dipilih.");
            return;
        }

        if (!form.nama.trim()) {
            alert("Nama varian wajib diisi.");
            return;
        }

        const payload = {
            data_barang_id: form.data_barang_id,
            nama: form.nama.trim(),
            kode: form.kode.trim(),
            is_active: Boolean(form.is_active),
        };

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${form.id}` : endpoint;

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});
                throw new Error(buildValidationMessage(result));
            }

            closeModal();
            await fetchVariants();
            await fetchBarangOptions();
        } catch (error) {
            console.error("Error simpan varian:", error);
            alert(error.message || "Gagal menyimpan varian produk.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (variant) => {
        const confirmed = window.confirm(
            `Hapus varian "${variant.nama}" dari barang "${variant.nama_barang}"?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${variant.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus varian produk.");
            }

            await fetchVariants();
            await fetchBarangOptions();
        } catch (error) {
            console.error("Error hapus varian:", error);
            alert(error.message || "Gagal menghapus varian produk.");
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
                                    Varian Produk
                                </h3>

                                <p className="mt-1 text-sm font-semibold text-blue-100">
                                    Kelola varian produk seperti merah, kuning, hijau, grade A, dan lainnya.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Varian
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Varian Produk
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {variants.length} varian.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchVariants}
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
                                            <th>Barang</th>
                                            <th>Nama Varian</th>
                                            <th>Kode</th>
                                            <th>Status</th>
                                            <th>Dibuat</th>
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

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                                    Varian Produk
                                </p>

                                <h3 className="mt-1 text-2xl font-black text-slate-950">
                                    {isDetail
                                        ? "Detail Varian"
                                        : isEdit
                                          ? "Edit Varian"
                                          : "Tambah Varian"}
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block md:col-span-2">
                                    <span className="mb-2 block text-sm font-black text-slate-700">
                                        Barang
                                    </span>

                                    <Select
                                        value={selectedBarangOption}
                                        onChange={handleBarangChange}
                                        options={barangSelectOptions}
                                        isDisabled={isDetail}
                                        isClearable
                                        placeholder="Pilih barang..."
                                        noOptionsMessage={() => "Data barang tidak ditemukan"}
                                        className="text-sm font-semibold"
                                        classNamePrefix="react-select"
                                        menuPortalTarget={document.body}
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                            control: (base) => ({
                                                ...base,
                                                minHeight: "48px",
                                                borderRadius: "1rem",
                                                borderColor: "#e2e8f0",
                                                backgroundColor: "#f8fafc",
                                            }),
                                        }}
                                    />

                                    {errors.data_barang_id?.[0] && (
                                        <p className="mt-2 text-xs font-bold text-red-600">
                                            {errors.data_barang_id[0]}
                                        </p>
                                    )}
                                </label>

                                <Input
                                    label="Nama Varian"
                                    name="nama"
                                    value={form.nama}
                                    onChange={handleChange}
                                    placeholder="Contoh: Merah / Kuning / Hijau"
                                    error={errors.nama?.[0]}
                                    disabled={isDetail}
                                />

                                <Input
                                    label="Kode"
                                    name="kode"
                                    value={form.kode}
                                    onChange={handleChange}
                                    placeholder="Opsional, contoh: merah"
                                    error={errors.kode?.[0]}
                                    disabled={isDetail}
                                />

                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={Boolean(form.is_active)}
                                        onChange={handleChange}
                                        disabled={isDetail}
                                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />

                                    <span className="text-sm font-black text-slate-700">
                                        Varian Aktif
                                    </span>
                                </label>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                                >
                                    {isDetail ? "Tutup" : "Batal"}
                                </button>

                                {!isDetail && (
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving
                                            ? "Menyimpan..."
                                            : isEdit
                                              ? "Update Varian"
                                              : "Simpan Varian"}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
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
    disabled = false,
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
                disabled={disabled}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
            />

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">
                    {error}
                </p>
            )}
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
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data varian tidak ditemukan",
        emptyTable: "Data varian masih kosong",
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
