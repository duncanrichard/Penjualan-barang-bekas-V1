import React, { useEffect, useState } from "react";
import axios from "axios";

const initialForm = {
    code: "",
    name: "",
    description: "",
    is_active: true,
    sort_order: 0,
};

export default function DocumentTypeIndexPage() {
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const fetchData = async (page = 1) => {
        setLoading(true);

        try {
            const response = await axios.get(
                "/admin/master-data/document-types",
                {
                    params: {
                        page,
                        search,
                        status,
                        per_page: 10,
                    },
                },
            );

            setItems(response.data?.data?.data || []);
            setMeta(response.data?.data || null);
        } catch (error) {
            console.error(error);
            alert(
                error.response?.data?.message ||
                    "Gagal mengambil data jenis dokumen.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const resetForm = () => {
        setForm(initialForm);
        setEditingId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            ...form,
            sort_order: Number(form.sort_order || 0),
            is_active: Boolean(form.is_active),
        };

        try {
            if (editingId) {
                await axios.put(
                    `/admin/master-data/document-types/${editingId}`,
                    payload,
                );
                alert("Jenis dokumen berhasil diperbarui.");
            } else {
                await axios.post(
                    "/admin/master-data/document-types",
                    payload,
                );
                alert("Jenis dokumen berhasil ditambahkan.");
            }

            resetForm();
            fetchData(1);
        } catch (error) {
            console.error(error);

            const errors = error.response?.data?.errors;
            const firstError = errors
                ? Object.values(errors)?.[0]?.[0]
                : null;

            alert(
                firstError ||
                    error.response?.data?.message ||
                    "Gagal menyimpan jenis dokumen.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setForm({
            code: item.code || "",
            name: item.name || "",
            description: item.description || "",
            is_active: Boolean(item.is_active),
            sort_order: item.sort_order || 0,
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleToggle = async (item) => {
        setProcessingId(item.id);

        try {
            await axios.patch(
                `/admin/master-data/document-types/${item.id}/toggle`,
                { is_active: !item.is_active },
            );

            fetchData(meta?.current_page || 1);
        } catch (error) {
            console.error(error);
            alert(
                error.response?.data?.message ||
                    "Gagal mengubah status jenis dokumen.",
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Hapus jenis dokumen "${item.name}"?`)) {
            return;
        }

        setProcessingId(item.id);

        try {
            await axios.delete(
                `/admin/master-data/document-types/${item.id}`,
            );

            alert("Jenis dokumen berhasil dihapus.");
            fetchData(1);
        } catch (error) {
            console.error(error);
            alert(
                error.response?.data?.message ||
                    "Gagal menghapus jenis dokumen.",
            );
        } finally {
            setProcessingId(null);
        }
    };

    const resetFilter = () => {
        setSearch("");
        setStatus("");
        setTimeout(() => fetchData(1), 0);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-6 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                    Master Data
                </p>

                <h1 className="mt-2 text-3xl font-black">
                    Jenis Dokumen
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-100">
                    Kelola jenis dokumen reminder seperti Service
                    Kendaraan, STNK, PBB, Asuransi, Kontrak, dan lainnya.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            Form Jenis Dokumen
                        </p>
                        <h2 className="text-xl font-black text-slate-950">
                            {editingId
                                ? "Edit Jenis Dokumen"
                                : "Tambah Jenis Dokumen"}
                        </h2>
                    </div>

                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                            Batal Edit
                        </button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Kode">
                        <input
                            name="code"
                            value={form.code}
                            onChange={handleChange}
                            className="input"
                            placeholder="SERVICE_KENDARAAN"
                            required
                        />
                    </Field>

                    <Field label="Nama Jenis Dokumen">
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            className="input"
                            placeholder="Service Kendaraan"
                            required
                        />
                    </Field>

                    <Field label="Urutan">
                        <input
                            type="number"
                            name="sort_order"
                            value={form.sort_order}
                            onChange={handleChange}
                            className="input"
                            min="0"
                        />
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Deskripsi">
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            placeholder="Deskripsi jenis dokumen."
                        />
                    </Field>
                </div>

                <label className="mt-4 flex items-center gap-3 text-sm font-black text-slate-700">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={form.is_active}
                        onChange={handleChange}
                        className="h-5 w-5"
                    />
                    Aktif
                </label>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving
                            ? "Menyimpan..."
                            : editingId
                              ? "Update Jenis Dokumen"
                              : "Simpan Jenis Dokumen"}
                    </button>

                    <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                    >
                        Reset Form
                    </button>
                </div>
            </form>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 grid gap-3 md:grid-cols-4">
                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        className="input md:col-span-2"
                        placeholder="Cari kode, nama, atau deskripsi..."
                    />

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value)
                        }
                        className="input"
                    >
                        <option value="">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak Aktif</option>
                    </select>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fetchData(1)}
                            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                        >
                            Filter
                        </button>
                        <button
                            type="button"
                            onClick={resetFilter}
                            className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Nama</th>
                                <th className="px-4 py-3">Deskripsi</th>
                                <th className="px-4 py-3">Urutan</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Aksi</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center font-bold text-slate-400">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center font-bold text-slate-400">
                                        Belum ada jenis dokumen.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100">
                                        <td className="px-4 py-4">
                                            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                                                {item.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-black text-slate-950">
                                            {item.name}
                                        </td>
                                        <td className="max-w-sm px-4 py-4 font-semibold text-slate-500">
                                            {item.description || "-"}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-700">
                                            {item.sort_order}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                                                item.is_active
                                                    ? "bg-green-50 text-green-700 ring-green-100"
                                                    : "bg-red-50 text-red-700 ring-red-100"
                                            }`}>
                                                {item.is_active ? "Aktif" : "Tidak Aktif"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(item)}
                                                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={processingId === item.id}
                                                    onClick={() => handleToggle(item)}
                                                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                                                >
                                                    {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={processingId === item.id}
                                                    onClick={() => handleDelete(item)}
                                                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
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

                {meta && meta.last_page > 1 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {Array.from({ length: meta.last_page }).map((_, index) => {
                            const page = index + 1;
                            return (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => fetchData(page)}
                                    className={`rounded-xl px-4 py-2 text-sm font-black ${
                                        meta.current_page === page
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                .input {
                    width: 100%;
                    border-radius: 1rem;
                    border: 1px solid rgb(226 232 240);
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    outline: none;
                    background: white;
                }
                .input:focus {
                    border-color: rgb(59 130 246);
                    box-shadow: 0 0 0 4px rgb(219 234 254);
                }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>
            {children}
        </label>
    );
}
