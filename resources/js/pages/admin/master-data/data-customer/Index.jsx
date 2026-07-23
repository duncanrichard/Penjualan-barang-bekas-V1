import React, { useEffect, useMemo, useState } from "react";

const endpoint = "/data-customer";

const emptyForm = {
    nama_customer: "",
    no_wa: "",
    alamat: "",
};

export default function DataCustomerIndexPage() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    const isEdit = Boolean(selectedCustomer?.id);

    const filteredCustomers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) return customers;

        return customers.filter((customer) =>
            [customer.nama_customer, customer.no_wa, customer.alamat]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword)),
        );
    }, [customers, search]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data customer.");
            }

            setCustomers(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Fetch customer error:", error);
            alert(error.message || "Gagal mengambil data customer.");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setSelectedCustomer(null);
        setForm({ ...emptyForm });
        setErrors({});
        setModalOpen(true);
    };

    const openEditModal = (customer) => {
        setSelectedCustomer(customer);
        setForm({
            nama_customer: customer.nama_customer || "",
            no_wa: customer.no_wa || "",
            alamat: customer.alamat || "",
        });
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setSelectedCustomer(null);
        setForm({ ...emptyForm });
        setErrors({});
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
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

        const payload = {
            nama_customer: form.nama_customer.trim(),
            no_wa: form.no_wa.trim(),
            alamat: form.alamat.trim(),
        };

        const clientErrors = {};

        if (!payload.nama_customer) {
            clientErrors.nama_customer = ["Nama customer wajib diisi."];
        }

        if (!payload.no_wa) {
            clientErrors.no_wa = ["Nomor WhatsApp wajib diisi."];
        }

        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit
                ? `${endpoint}/${selectedCustomer.id}`
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

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});
                throw new Error(buildValidationMessage(result));
            }

            alert(
                result.message ||
                    (isEdit
                        ? "Data customer berhasil diperbarui."
                        : "Data customer berhasil ditambahkan."),
            );

            closeModal();
            await fetchCustomers();
        } catch (error) {
            console.error("Save customer error:", error);
            alert(error.message || "Data customer gagal disimpan.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (customer) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus customer "${customer.nama_customer}"?`,
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${customer.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Data customer gagal dihapus.");
            }

            alert(result.message || "Data customer berhasil dihapus.");
            await fetchCustomers();
        } catch (error) {
            console.error("Delete customer error:", error);
            alert(error.message || "Data customer gagal dihapus.");
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
                                    Data Customer
                                </h3>
                                <p className="mt-2 text-sm font-semibold text-slate-300">
                                    Kelola nama customer, nomor WhatsApp, dan alamat.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50"
                            >
                                + Tambah Customer
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Customer
                                </h4>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data: {filteredCustomers.length} customer.
                                </p>
                            </div>

                            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari nama, WA, atau alamat..."
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-80"
                                />

                                <button
                                    type="button"
                                    onClick={fetchCustomers}
                                    disabled={loading}
                                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {loading ? "Memuat..." : "Refresh"}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-950 text-white">
                                            <th className="whitespace-nowrap px-5 py-4 font-black">No</th>
                                            <th className="min-w-60 px-5 py-4 font-black">Nama Customer</th>
                                            <th className="min-w-48 px-5 py-4 font-black">No. WhatsApp</th>
                                            <th className="min-w-80 px-5 py-4 font-black">Alamat</th>
                                            <th className="whitespace-nowrap px-5 py-4 text-center font-black">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="px-5 py-10 text-center font-bold text-slate-500">
                                                    Memuat data customer...
                                                </td>
                                            </tr>
                                        ) : filteredCustomers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-5 py-10 text-center font-bold text-slate-500">
                                                    Data customer belum tersedia.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCustomers.map((customer, index) => (
                                                <tr key={customer.id} className="border-t border-slate-100 hover:bg-blue-50/40">
                                                    <td className="px-5 py-4 font-black text-slate-700">{index + 1}</td>
                                                    <td className="px-5 py-4 font-black text-slate-950">{customer.nama_customer}</td>
                                                    <td className="px-5 py-4 font-semibold text-slate-700">{customer.no_wa || "-"}</td>
                                                    <td className="px-5 py-4 font-semibold text-slate-600">{customer.alamat || "-"}</td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(customer)}
                                                                className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(customer)}
                                                                className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <CustomerModal
                    form={form}
                    errors={errors}
                    saving={saving}
                    isEdit={isEdit}
                    onChange={handleChange}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                />
            )}
        </>
    );
}

function CustomerModal({ form, errors, saving, isEdit, onChange, onClose, onSubmit }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Data Customer</p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isEdit ? "Edit Customer" : "Tambah Customer"}
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-60"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5 p-6">
                    <FormInput
                        label="Nama Customer"
                        name="nama_customer"
                        value={form.nama_customer}
                        onChange={onChange}
                        placeholder="Contoh: Richard"
                        error={errors.nama_customer?.[0]}
                        required
                    />

                    <FormInput
                        label="No. WhatsApp"
                        name="no_wa"
                        value={form.no_wa}
                        onChange={onChange}
                        placeholder="Contoh: 081234567890"
                        error={errors.no_wa?.[0]}
                        required
                    />

                    <label className="block">
                        <span className="mb-2 block text-sm font-black text-slate-700">Alamat</span>
                        <textarea
                            name="alamat"
                            rows="4"
                            value={form.alamat}
                            onChange={onChange}
                            placeholder="Masukkan alamat customer..."
                            className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:bg-white focus:ring-4 ${
                                errors.alamat?.[0]
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                            }`}
                        />
                        {errors.alamat?.[0] && (
                            <p className="mt-2 text-xs font-bold text-red-600">{errors.alamat[0]}</p>
                        )}
                    </label>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "Menyimpan..." : isEdit ? "Update Customer" : "Simpan Customer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FormInput({ label, name, value, onChange, placeholder, error, required = false }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
                {required && <span className="ml-1 text-red-600">*</span>}
            </span>
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:bg-white focus:ring-4 ${
                    error
                        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
            />
            {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
        </label>
    );
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

async function safeJson(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

function buildValidationMessage(result) {
    if (result?.errors && typeof result.errors === "object") {
        const messages = Object.values(result.errors)
            .flat()
            .filter(Boolean);

        if (messages.length > 0) return messages.join("\n");
    }

    return result?.message || "Validasi data gagal.";
}
