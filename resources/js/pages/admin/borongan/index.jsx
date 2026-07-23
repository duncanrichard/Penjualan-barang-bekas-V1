import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import Select from "react-select";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/borongan";
const barangEndpoint = "/borongan/barang-options";
const paymentOptionsEndpoint = "/pengeluaran/payment-options";
const customerEndpoint = "/borongan/customer-options";

const today = () => new Date().toISOString().slice(0, 10);

const emptyOutput = {
    barang_variant_id: "",
    nama_varian: "",
    qty: 0,
    harga: 0,
};

const emptyItem = {
    data_barang_id: "",
    input_jenis_barang: "mentah",
    qty: 1,
    output_qty: 0,
    stok_tersedia: 0,
    stok_mentah: 0,
    outputs: [{ ...emptyOutput }],
};

const emptyForm = {
    nomor_nota: "",
    customer_id: "",
    tanggal: today(),
    jenis_pembayaran_id: "",
    metode_pembayaran: "",
    penyesuaian: 0,
    catatan: "",
    kota: "Kendal",
    tanggal_ttd: today(),
    nama_ttd: "",
    items: [{ ...emptyItem, outputs: [{ ...emptyOutput }] }],
};

export default function BoronganIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const borongansRef = useRef([]);

    const [borongans, setBorongans] = useState([]);
    const [barangOptions, setBarangOptions] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBorongan, setSelectedBorongan] = useState(null);
    const [filters, setFilters] = useState({
        start_date: today(),
        end_date: today(),
    });

    const buildFilterQuery = (filterValues = filters) => {
        const params = new URLSearchParams();

        if (filterValues.start_date) {
            params.append("start_date", filterValues.start_date);
        }

        if (filterValues.end_date) {
            params.append("end_date", filterValues.end_date);
        }

        const queryString = params.toString();

        return queryString ? `${endpoint}?${queryString}` : endpoint;
    };

    const fetchBorongan = async (filterValues = filters) => {
        try {
            setLoading(true);

            const response = await fetch(buildFilterQuery(filterValues), {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data borongan.");
            }

            const data = Array.isArray(result.data) ? result.data : [];

            setBorongans(data);
            borongansRef.current = data;
        } catch (error) {
            console.error("Error borongan:", error);
            alert(error.message || "Gagal mengambil data borongan.");
        } finally {
            setLoading(false);
        }
    };


    const fetchPaymentOptions = async () => {
        try {
            const response = await fetch(paymentOptionsEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil jenis pembayaran.");
            }

            setPaymentOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error jenis pembayaran:", error);
            alert(error.message || "Gagal mengambil jenis pembayaran.");
        }
    };

    const fetchCustomerOptions = async () => {
        try {
            const response = await fetch(customerEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal mengambil data customer."
                );
            }

            setCustomerOptions(
                Array.isArray(result.data) ? result.data : []
            );
        } catch (error) {
            console.error("Error customer options:", error);
            alert(error.message || "Gagal mengambil data customer.");
        }
    };


    const fetchBarangOptions = async () => {
        try {
            const response = await fetch(barangEndpoint, {
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
        fetchBorongan(filters);
        fetchBarangOptions();
        fetchPaymentOptions();
        fetchCustomerOptions();
    }, []);

    useEffect(() => {
        borongansRef.current = borongans;
    }, [borongans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: borongans,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[3, "desc"]],
            columns: [
                {
                    data: "nomor_nota",
                    title: "No Nota",
                    render: (data) =>
                        `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "nama_pelanggan",
                    title: "Pelanggan",
                    render: (data) =>
                        `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "no_wa_pelanggan",
                    title: "No WA",
                    render: (data) =>
                        `<span class="font-semibold text-slate-700">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "tanggal",
                    title: "Tanggal",
                    render: (data) =>
                        `<span class="font-semibold">${formatDateIndonesia(data)}</span>`,
                },
                {
                    data: "jenis_pembayaran_label",
                    title: "Pembayaran",
                    render: (data, type, row) => `<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">${escapeHtml(data || row.metode_pembayaran || "-")}</span>`,
                },
                {
                    data: "items",
                    title: "Produksi",
                    orderable: false,
                    render: (data) => {
                        const items = Array.isArray(data) ? data : [];
                        const totalInput = sumBy(items, "qty");
                        const totalOutput = sumBy(items, "output_qty");

                        return `
                            <div class="space-y-1">
                                <div class="font-black text-slate-950">${items.length} input</div>
                                <div class="text-xs font-bold text-slate-500">
                                    Input ${formatQty(totalInput)} KG → Output jadi ${formatQty(totalOutput)} KG
                                </div>
                            </div>
                        `;
                    },
                },
                {
                    data: "subtotal",
                    title: "Subtotal",
                    render: (data) =>
                        `<span class="font-black text-slate-950">Rp ${formatRupiah(data || 0)}</span>`,
                },
                {
                    data: "total_akhir",
                    title: "Total Akhir",
                    render: (data) =>
                        `<span class="font-black text-slate-950">Rp ${formatRupiah(data || 0)}</span>`,
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
                            class="btn-detail-borongan mr-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                        >
                            Detail
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-edit-borongan mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-delete-borongan rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
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
    }, [borongans]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const detailButton = event.target.closest(".btn-detail-borongan");
            const editButton = event.target.closest(".btn-edit-borongan");
            const deleteButton = event.target.closest(".btn-delete-borongan");

            const button = detailButton || editButton || deleteButton;

            if (!button) return;

            const id = String(button.dataset.id || "");
            const borongan = borongansRef.current.find((item) => String(item.id) === id);

            if (!borongan) {
                alert("Data borongan tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (detailButton) {
                setSelectedBorongan({ ...borongan, mode: "detail" });
                setModalOpen(true);
            }

            if (editButton) {
                setSelectedBorongan({ ...borongan, mode: "edit" });
                setModalOpen(true);
            }

            if (deleteButton) {
                handleDelete(borongan);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleApplyFilter = () => {
        if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
            alert("Tanggal dari tidak boleh lebih besar dari tanggal sampai.");
            return;
        }

        fetchBorongan(filters);
    };

    const handleTodayFilter = () => {
        const currentDate = today();
        const todayFilters = {
            start_date: currentDate,
            end_date: currentDate,
        };

        setFilters(todayFilters);
        fetchBorongan(todayFilters);
    };

    const handleResetFilter = () => {
        const resetFilters = {
            start_date: "",
            end_date: "",
        };

        setFilters(resetFilters);
        fetchBorongan(resetFilters);
    };

    const handleDelete = async (borongan) => {
        const confirmed = window.confirm(`Yakin ingin menghapus nota "${borongan.nomor_nota}"?`);

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${borongan.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus borongan.");
            }

            await fetchBorongan(filters);
            await fetchBarangOptions();
        } catch (error) {
            console.error("Error hapus borongan:", error);
            alert(error.message || "Borongan gagal dihapus.");
        }
    };

    const openCreateModal = () => {
        setSelectedBorongan(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedBorongan(null);
    };

    const handleSaved = async () => {
        closeModal();
        await fetchBorongan(filters);
        await fetchBarangOptions();
    };

    return (
        <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                                    Transaksi
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Borongan
                                </h3>

                                <p className="mt-1 text-sm font-semibold text-blue-100">
                                    Input bahan mentah, isi total output jadi, lalu pisahkan output ke varian produk.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Borongan
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 space-y-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h4 className="text-xl font-black text-slate-950">
                                        Daftar Borongan
                                    </h4>

                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Total data tampil: {borongans.length} nota. Default menampilkan data hari ini.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => fetchBorongan(filters)}
                                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                                >
                                    {loading ? "Memuat..." : "Refresh"}
                                </button>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Tanggal Dari
                                        </span>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={filters.start_date}
                                            onChange={handleFilterChange}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Tanggal Sampai
                                        </span>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={filters.end_date}
                                            onChange={handleFilterChange}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleApplyFilter}
                                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                                    >
                                        Terapkan Filter
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleTodayFilter}
                                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                                    >
                                        Hari Ini
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleResetFilter}
                                        className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        Semua Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table ref={tableRef} className="display w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>No Nota</th>
                                            <th>Pelanggan</th>
                                            <th>No WA</th>
                                            <th>Tanggal</th>
                                            <th>Pembayaran</th>
                                            <th>Produksi</th>
                                            <th>Subtotal</th>
                                            <th>Total Akhir</th>
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

            <BoronganModal
                open={modalOpen}
                borongan={selectedBorongan}
                barangOptions={barangOptions}
                paymentOptions={paymentOptions}
                customerOptions={customerOptions}
                reloadBarangOptions={fetchBarangOptions}
                onClose={closeModal}
                onSaved={handleSaved}
            />
        </>
    );
}

function BoronganModal({
    open,
    borongan = null,
    barangOptions = [],
    paymentOptions = [],
    customerOptions = [],
    reloadBarangOptions,
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(borongan?.id) && borongan?.mode !== "detail";
    const isDetail = borongan?.mode === "detail";

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (borongan) {
            setForm({
                nomor_nota: borongan.nomor_nota || "",
                customer_id: borongan.customer_id || borongan.customer?.id || "",
                tanggal: normalizeDateInput(borongan.tanggal),
                jenis_pembayaran_id: borongan.jenis_pembayaran_id || "",
                metode_pembayaran: borongan.metode_pembayaran || "",
                penyesuaian: toDecimal(borongan.penyesuaian),
                catatan: borongan.catatan || "",
                kota: borongan.kota || "Kendal",
                tanggal_ttd: normalizeDateInput(borongan.tanggal_ttd || borongan.tanggal),
                nama_ttd: borongan.nama_ttd || "",
                items:
                    Array.isArray(borongan.items) && borongan.items.length > 0
                        ? borongan.items.map((item) => ({
                              data_barang_id: item.data_barang_id || "",
                              input_jenis_barang: item.input_jenis_barang || "mentah",
                              qty: Math.max(0.01, toDecimal(item.qty)),
                              output_qty: Math.max(0.01, toDecimal(item.output_qty)),
                              stok_tersedia: 0,
                              stok_mentah: 0,
                              outputs:
                                  Array.isArray(item.outputs) && item.outputs.length > 0
                                      ? item.outputs.map((output) => ({
                                            barang_variant_id: output.barang_variant_id || "",
                                            nama_varian: output.nama_varian || "",
                                            qty: Math.max(0.01, toDecimal(output.qty)),
                                            harga: Math.max(0, toInteger(output.harga)),
                                        }))
                                      : [{ ...emptyOutput }],
                          }))
                        : [{ ...emptyItem, outputs: [{ ...emptyOutput }] }],
            });
        } else {
            setForm({
                ...emptyForm,
                nomor_nota: "",
                customer_id: "",
                tanggal: today(),
                jenis_pembayaran_id: "",
                metode_pembayaran: "",
                tanggal_ttd: today(),
                items: [{ ...emptyItem, outputs: [{ ...emptyOutput }] }],
            });
        }
    }, [open, borongan]);

    const barangSelectOptions = useMemo(() => {
        return barangOptions.map((barang) => {
            const stokMentah = getStokMentah(barang);

            return {
                value: barang.id,
                label: `${barang.kode_barang || barang.kode || "-"} - ${barang.nama_barang} | Mentah ${formatQty(stokMentah)} KG`,
                barang: {
                    ...barang,
                    stok_mentah: stokMentah,
                    stok_tersedia: stokMentah,
                },
            };
        });
    }, [barangOptions]);


    const customerSelectOptions = useMemo(() => {
        return customerOptions.map((customer) => ({
            value: String(customer.id),
            label: customer.no_wa
                ? `${customer.nama_customer || "-"} - ${customer.no_wa}`
                : customer.nama_customer || "-",
            customer,
        }));
    }, [customerOptions]);

    const selectedCustomerOption =
        customerSelectOptions.find(
            (option) =>
                String(option.value) ===
                String(form.customer_id || "")
        ) || null;

    const selectedCustomer =
        selectedCustomerOption?.customer || null;


    const paymentSelectOptions = useMemo(() => {
        return paymentOptions.map((payment) => ({
            value: payment.id,
            label: `${payment.nama}${payment.kode ? ` (${payment.kode})` : ""}`,
            payment,
        }));
    }, [paymentOptions]);

    const selectedPaymentOption = useMemo(() => {
        return paymentSelectOptions.find((option) => String(option.value) === String(form.jenis_pembayaran_id)) || null;
    }, [paymentSelectOptions, form.jenis_pembayaran_id]);

    if (!open) return null;

    const subtotal = roundMoney(
        form.items.reduce((sum, item) => {
            return sum + (item.outputs || []).reduce((outputSum, output) => {
                return outputSum + toDecimal(output.qty) * toInteger(output.harga);
            }, 0);
        }, 0)
    );

    const totalAkhir = roundMoney(subtotal + toDecimal(form.penyesuaian));

    const handleChange = (event) => {
        const { name, value, type } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "number" ? decimalInputValue(value) : value,
        }));
    };


    const handlePaymentChange = (selectedOption) => {
        setForm((prev) => ({
            ...prev,
            jenis_pembayaran_id: selectedOption?.value || "",
            metode_pembayaran: selectedOption?.payment?.kode || "",
        }));
    };

    const handleItemChange = (index, field, value) => {
        setForm((prev) => {
            const items = [...prev.items];

            items[index] = {
                ...items[index],
                [field]:
                    field === "qty" || field === "output_qty"
                        ? decimalInputValue(value)
                        : field === "harga"
                          ? integerInputValue(value)
                          : value,
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const handleBarangChange = (index, selectedOption) => {
        const barang = selectedOption?.barang || null;

        setForm((prev) => {
            const items = [...prev.items];
            const stokMentah = getStokMentah(barang);
            const oldQty = toDecimal(items[index]?.qty || 1);

            items[index] = {
                ...items[index],
                data_barang_id: barang?.id || "",
                input_jenis_barang: "mentah",
                stok_mentah: stokMentah,
                stok_tersedia: stokMentah,
                qty: barang
                    ? Math.min(Math.max(oldQty, 0.01), stokMentah || oldQty || 1)
                    : 1,
                output_qty: items[index]?.output_qty || 0,
                outputs: [{ ...emptyOutput }],
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const handleOutputChange = (itemIndex, outputIndex, field, value) => {
        setForm((prev) => {
            const items = [...prev.items];
            const outputs = [...(items[itemIndex].outputs || [])];

            outputs[outputIndex] = {
                ...outputs[outputIndex],
                [field]: field === "qty"
                    ? decimalInputValue(value)
                    : field === "harga"
                      ? integerInputValue(value)
                      : value,
            };

            items[itemIndex] = {
                ...items[itemIndex],
                outputs,
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const handleVariantChange = (itemIndex, outputIndex, selectedOption) => {
        setForm((prev) => {
            const items = [...prev.items];
            const outputs = [...(items[itemIndex].outputs || [])];

            outputs[outputIndex] = {
                ...outputs[outputIndex],
                barang_variant_id: selectedOption?.value || "",
                nama_varian: selectedOption?.variant?.nama || "",
            };

            items[itemIndex] = {
                ...items[itemIndex],
                outputs,
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const addItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { ...emptyItem, outputs: [{ ...emptyOutput }] }],
        }));
    };

    const removeItem = (index) => {
        setForm((prev) => ({
            ...prev,
            items:
                prev.items.length > 1
                    ? prev.items.filter((_, itemIndex) => itemIndex !== index)
                    : prev.items,
        }));
    };

    const addOutput = (itemIndex) => {
        setForm((prev) => {
            const items = [...prev.items];

            items[itemIndex] = {
                ...items[itemIndex],
                outputs: [...(items[itemIndex].outputs || []), { ...emptyOutput }],
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const removeOutput = (itemIndex, outputIndex) => {
        setForm((prev) => {
            const items = [...prev.items];
            const outputs = (items[itemIndex].outputs || []).filter((_, index) => index !== outputIndex);

            items[itemIndex] = {
                ...items[itemIndex],
                outputs: outputs.length > 0 ? outputs : [{ ...emptyOutput }],
            };

            return {
                ...prev,
                items,
            };
        });
    };

    const addVariant = async (itemIndex) => {
        const item = form.items[itemIndex];

        if (!item?.data_barang_id) {
            alert("Pilih barang input dulu.");
            return;
        }

        const nama = window.prompt("Nama varian baru. Contoh: Merah / Kuning / Hijau");

        if (!nama || !nama.trim()) return;

        try {
            const response = await fetch(`/borongan/barang/${item.data_barang_id}/variants`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({
                    nama: nama.trim(),
                }),
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(buildValidationMessage(result));
            }

            await reloadBarangOptions();

            alert("Varian berhasil ditambahkan. Silakan pilih varian pada kolom split.");
        } catch (error) {
            console.error("Error tambah varian:", error);
            alert(error.message || "Gagal menambah varian.");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isDetail || saving) return;

        const cleanItems = form.items.map((item) => ({
            data_barang_id: item.data_barang_id || "",
            input_jenis_barang: item.input_jenis_barang || "mentah",
            qty: Math.max(0.01, toDecimal(item.qty)),
            output_qty: Math.max(0.01, toDecimal(item.output_qty)),
            outputs: (item.outputs || []).map((output) => ({
                barang_variant_id: output.barang_variant_id || "",
                qty: Math.max(0, toDecimal(output.qty)),
                harga: Math.max(0, toInteger(output.harga)),
            })),
        }));

        if (!form.customer_id) {
            setErrors((prev) => ({
                ...prev,
                customer_id: ["Data customer wajib dipilih."],
            }));
            alert("Data customer wajib dipilih.");
            return;
        }

        if (!form.tanggal) {
            alert("Tanggal wajib diisi.");
            return;
        }

        if (!form.jenis_pembayaran_id) {
            alert("Jenis pembayaran wajib dipilih. Buka deposit/mutasi kasir terlebih dahulu jika pilihan pembayaran belum ada.");
            return;
        }

        if (!String(form.nama_ttd || "").trim()) {
            setErrors((prev) => ({
                ...prev,
                nama_ttd: ["Nama TTD wajib diisi."],
            }));
            alert("Nama TTD wajib diisi.");
            return;
        }

        if (cleanItems.some((item) => !item.data_barang_id)) {
            alert("Pilih barang input pada semua baris.");
            return;
        }

        if (cleanItems.some((item) => item.qty <= 0)) {
            alert("Qty input wajib lebih dari 0.");
            return;
        }

        if (cleanItems.some((item) => item.output_qty <= 0)) {
            alert("Total output jadi wajib lebih dari 0.");
            return;
        }

        for (const [index, item] of cleanItems.entries()) {
            const validOutputs = item.outputs.filter((output) => {
                return output.barang_variant_id && output.qty > 0;
            });

            if (validOutputs.length === 0) {
                alert(`Input nomor ${index + 1}: minimal satu varian output wajib diisi.`);
                return;
            }

            if (validOutputs.some((output) => toInteger(output.harga) < 0)) {
                alert(`Input nomor ${index + 1}: harga varian tidak valid.`);
                return;
            }

            const totalSplit = sumBy(validOutputs, "qty");

            if (roundMoney(totalSplit) !== roundMoney(item.output_qty)) {
                alert(
                    `Input nomor ${index + 1}: total split varian harus sama dengan total output jadi.\n\n` +
                        `Total output jadi: ${formatQty(item.output_qty)} KG\n` +
                        `Total split varian: ${formatQty(totalSplit)} KG`
                );
                return;
            }

            const variantIds = validOutputs.map((output) => String(output.barang_variant_id));
            const uniqueVariantIds = Array.from(new Set(variantIds));

            if (variantIds.length !== uniqueVariantIds.length) {
                alert(`Input nomor ${index + 1}: varian tidak boleh duplikat.`);
                return;
            }
        }

        const invalidStock = form.items.some((item) => {
            const selectedOption = barangSelectOptions.find((option) => String(option.value) === String(item.data_barang_id));
            const stokMentah = toDecimal(selectedOption?.barang?.stok_mentah ?? item.stok_mentah ?? item.stok_tersedia ?? 0);

            if (isEdit) return false;

            return stokMentah > 0 && toDecimal(item.qty) > stokMentah;
        });

        if (invalidStock) {
            alert("Qty bahan mentah melebihi stok tersedia.");
            return;
        }

        const payload = {
            customer_id: form.customer_id,
            tanggal: normalizeDateInput(form.tanggal),
            jenis_pembayaran_id: form.jenis_pembayaran_id,
            penyesuaian: toDecimal(form.penyesuaian),
            catatan: form.catatan || "",
            kota: form.kota || "Kendal",
            tanggal_ttd: normalizeDateInput(form.tanggal_ttd || form.tanggal),
            nama_ttd: String(form.nama_ttd || "").trim(),
            items: cleanItems,
        };

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${borongan.id}` : endpoint;

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
                console.log("STATUS ERROR:", response.status);
                console.log("RESPONSE ERROR:", result);
                console.log("PAYLOAD DIKIRIM:", payload);

                throw new Error(buildValidationMessage(result));
            }

            onSaved();
        } catch (error) {
            console.error("Error simpan borongan:", error);
            alert(error.message || "Gagal menyimpan borongan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Nota Borongan
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isDetail ? "Detail Borongan" : isEdit ? "Edit Borongan" : "Tambah Borongan"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Alur: input mentah → total output jadi → split output jadi ke varian.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <Input
                            label="Nomor Nota"
                            value={form.nomor_nota || "Otomatis dari sistem"}
                            onChange={() => {}}
                            disabled
                        />

                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Nama Customer
                                <span className="ml-1 text-red-600">*</span>
                            </span>

                            <Select
                                value={selectedCustomerOption}
                                onChange={(selectedOption) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        customer_id: selectedOption?.value || "",
                                    }))
                                }
                                options={customerSelectOptions}
                                isClearable
                                isSearchable
                                isDisabled={isDetail}
                                placeholder="Cari nama customer / No WA..."
                                noOptionsMessage={() => "Customer tidak ditemukan"}
                                className="text-sm font-semibold"
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                styles={selectStyles(isDetail, Boolean(errors.customer_id?.[0]))}
                            />

                            {errors.customer_id?.[0] && (
                                <p className="mt-2 text-xs font-bold text-red-600">
                                    {errors.customer_id[0]}
                                </p>
                            )}
                        </label>

                        <Input
                            label="No WA Customer"
                            value={selectedCustomer?.no_wa || ""}
                            onChange={() => {}}
                            placeholder="Otomatis dari customer"
                            disabled
                        />

                        <Input
                            label="Tanggal"
                            name="tanggal"
                            type="date"
                            value={form.tanggal}
                            onChange={handleChange}
                            error={errors.tanggal?.[0]}
                            disabled={isDetail}
                        />

                        <label className="block">
                            <Label text="Jenis Pembayaran" />

                            <Select
                                value={selectedPaymentOption}
                                onChange={handlePaymentChange}
                                options={paymentSelectOptions}
                                isDisabled={isDetail}
                                isClearable
                                placeholder="Pilih jenis pembayaran..."
                                noOptionsMessage={() => "Buka deposit/mutasi kasir dulu"}
                                className="text-sm font-semibold"
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                styles={selectStyles()}
                            />

                            {errors.jenis_pembayaran_id?.[0] && <ErrorText text={errors.jenis_pembayaran_id[0]} />}
                        </label>


                        <Input
                            label="Kota"
                            name="kota"
                            value={form.kota}
                            onChange={handleChange}
                            error={errors.kota?.[0]}
                            disabled={isDetail}
                        />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                            <div>
                                <h4 className="font-black">Produksi Borongan</h4>
                                <p className="mt-1 text-xs font-semibold text-slate-300">
                                    Contoh: Dus mentah 50 KG → output jadi 45 KG → Merah 10 KG, Kuning 20 KG, Hijau 15 KG.
                                </p>
                            </div>

                            {!isDetail && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-blue-50"
                                >
                                    + Tambah Input
                                </button>
                            )}
                        </div>

                        <div className="space-y-5 p-5">
                            {form.items.map((item, itemIndex) => {
                                const selectedInput =
                                    barangSelectOptions.find((option) => String(option.value) === String(item.data_barang_id)) || null;

                                const selectedBarang = selectedInput?.barang || null;
                                const stokMentah = getStokMentah(selectedBarang) || toDecimal(item.stok_mentah);

                                const variantOptions = Array.isArray(selectedBarang?.variants)
                                    ? selectedBarang.variants
                                          .filter((variant) => variant.is_active !== false)
                                          .map((variant) => ({
                                              value: variant.id,
                                              label: `${variant.nama} | Stok ${formatQty(variant.stok_jadi || 0)} KG`,
                                              variant,
                                          }))
                                    : [];

                                const totalSplit = sumBy(item.outputs || [], "qty");
                                const totalHarga = roundMoney(
                                    (item.outputs || []).reduce((sum, output) => {
                                        return sum + toDecimal(output.qty) * toInteger(output.harga);
                                    }, 0)
                                );
                                const splitMatch = roundMoney(totalSplit) === roundMoney(item.output_qty);

                                return (
                                    <div key={itemIndex} className="rounded-3xl border border-slate-200 bg-white p-5">
                                        <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                                            <label className="block">
                                                <Label text="Barang Input" />

                                                <Select
                                                    value={selectedInput}
                                                    onChange={(option) => handleBarangChange(itemIndex, option)}
                                                    options={barangSelectOptions}
                                                    isDisabled={isDetail}
                                                    isClearable
                                                    placeholder="Pilih barang mentah..."
                                                    noOptionsMessage={() => "Data barang tidak ditemukan"}
                                                    className="text-sm font-semibold"
                                                    classNamePrefix="react-select"
                                                    menuPortalTarget={document.body}
                                                    styles={selectStyles()}
                                                />

                                                {errors[`items.${itemIndex}.data_barang_id`]?.[0] && (
                                                    <ErrorText text={errors[`items.${itemIndex}.data_barang_id`][0]} />
                                                )}
                                            </label>

                                            <Input
                                                label="Jenis Input"
                                                value={item.input_jenis_barang}
                                                onChange={() => {}}
                                                disabled
                                            />

                                            <Input
                                                label="Stok Mentah"
                                                value={`${formatQty(stokMentah)} KG`}
                                                onChange={() => {}}
                                                disabled
                                            />

                                            <Input
                                                label="Qty Input"
                                                type="number"
                                                value={item.qty}
                                                onChange={(event) => handleItemChange(itemIndex, "qty", event.target.value)}
                                                error={errors[`items.${itemIndex}.qty`]?.[0]}
                                                disabled={isDetail}
                                            />

                                            <Input
                                                label="Total Output Jadi"
                                                type="number"
                                                value={item.output_qty}
                                                onChange={(event) => handleItemChange(itemIndex, "output_qty", event.target.value)}
                                                error={errors[`items.${itemIndex}.output_qty`]?.[0]}
                                                disabled={isDetail}
                                            />

                                            {!isDetail && (
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(itemIndex)}
                                                        className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-200"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                                            <Input
                                                label="Total Harga Varian"
                                                value={`Rp ${formatRupiah(totalHarga)}`}
                                                onChange={() => {}}
                                                disabled
                                            />

                                            <Input
                                                label="Total Split Varian"
                                                value={`${formatQty(totalSplit)} KG`}
                                                onChange={() => {}}
                                                disabled
                                            />

                                            <Input
                                                label="Status Split"
                                                value={splitMatch ? "Sesuai" : "Belum sesuai"}
                                                onChange={() => {}}
                                                disabled
                                            />
                                        </div>

                                        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                                            <div className="flex flex-col gap-3 bg-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <h5 className="font-black text-slate-950">
                                                        Split Output Jadi Ke Varian
                                                    </h5>

                                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                                        Varian hanya muncul sesuai barang input yang dipilih.
                                                    </p>
                                                </div>

                                                {!isDetail && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => addVariant(itemIndex)}
                                                            className="rounded-2xl bg-blue-100 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                                                        >
                                                            + Buat Varian
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => addOutput(itemIndex)}
                                                            className="rounded-2xl bg-green-100 px-4 py-2 text-xs font-black text-green-700 hover:bg-green-200"
                                                        >
                                                            + Tambah Split
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-700">
                                                            <th className="whitespace-nowrap px-4 py-3 font-black">No</th>
                                                            <th className="min-w-80 px-4 py-3 font-black">Varian</th>
                                                            <th className="whitespace-nowrap px-4 py-3 font-black">Qty</th>
                                                            <th className="whitespace-nowrap px-4 py-3 font-black">Harga / KG</th>
                                                            <th className="whitespace-nowrap px-4 py-3 font-black">Total</th>
                                                            <th className="whitespace-nowrap px-4 py-3 font-black">Stok Varian</th>
                                                            {!isDetail && (
                                                                <th className="whitespace-nowrap px-4 py-3 font-black">Aksi</th>
                                                            )}
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {(item.outputs || []).map((output, outputIndex) => {
                                                            const selectedVariant =
                                                                variantOptions.find((option) => String(option.value) === String(output.barang_variant_id)) || null;

                                                            const stokVarian = toDecimal(selectedVariant?.variant?.stok_jadi || 0);
                                                            const totalOutputJadi = toDecimal(item.output_qty);
                                                            const qtySelainBarisIni = roundMoney(
                                                                (item.outputs || []).reduce((sum, currentOutput, currentIndex) => {
                                                                    return currentIndex === outputIndex ? sum : sum + toDecimal(currentOutput.qty);
                                                                }, 0)
                                                            );
                                                            const maxQtyVarian = Math.max(0, roundMoney(totalOutputJadi - qtySelainBarisIni));
                                                            const totalOutputHarga = roundMoney(toDecimal(output.qty) * toInteger(output.harga));

                                                            return (
                                                                <tr key={outputIndex} className="border-t border-slate-100">
                                                                    <td className="px-4 py-3 font-black">
                                                                        {outputIndex + 1}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        <Select
                                                                            value={selectedVariant}
                                                                            onChange={(option) => handleVariantChange(itemIndex, outputIndex, option)}
                                                                            options={variantOptions}
                                                                            isDisabled={isDetail || !item.data_barang_id}
                                                                            isClearable
                                                                            placeholder="Pilih varian..."
                                                                            noOptionsMessage={() => "Belum ada varian. Klik + Buat Varian."}
                                                                            className="text-sm font-semibold"
                                                                            classNamePrefix="react-select"
                                                                            menuPortalTarget={document.body}
                                                                            styles={selectStyles()}
                                                                        />

                                                                        {errors[`items.${itemIndex}.outputs.${outputIndex}.barang_variant_id`]?.[0] && (
                                                                            <ErrorText
                                                                                text={
                                                                                    errors[
                                                                                        `items.${itemIndex}.outputs.${outputIndex}.barang_variant_id`
                                                                                    ][0]
                                                                                }
                                                                            />
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="number"
                                                                            min="0.01"
                                                                            max={maxQtyVarian || undefined}
                                                                            step="0.01"
                                                                            inputMode="decimal"
                                                                            value={output.qty}
                                                                            onChange={(event) =>
                                                                                handleOutputChange(
                                                                                    itemIndex,
                                                                                    outputIndex,
                                                                                    "qty",
                                                                                    event.target.value
                                                                                )
                                                                            }
                                                                            disabled={isDetail}
                                                                            className="w-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                                        />

                                                                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                                                                            Maks: {formatQty(maxQtyVarian)} KG
                                                                        </p>

                                                                        {errors[`items.${itemIndex}.outputs.${outputIndex}.qty`]?.[0] && (
                                                                            <ErrorText
                                                                                text={
                                                                                    errors[
                                                                                        `items.${itemIndex}.outputs.${outputIndex}.qty`
                                                                                    ][0]
                                                                                }
                                                                            />
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="1"
                                                                            inputMode="numeric"
                                                                            value={output.harga}
                                                                            onChange={(event) =>
                                                                                handleOutputChange(
                                                                                    itemIndex,
                                                                                    outputIndex,
                                                                                    "harga",
                                                                                    event.target.value
                                                                                )
                                                                            }
                                                                            disabled={isDetail}
                                                                            className="w-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                                        />

                                                                        {errors[`items.${itemIndex}.outputs.${outputIndex}.harga`]?.[0] && (
                                                                            <ErrorText
                                                                                text={
                                                                                    errors[
                                                                                        `items.${itemIndex}.outputs.${outputIndex}.harga`
                                                                                    ][0]
                                                                                }
                                                                            />
                                                                        )}
                                                                    </td>

                                                                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-950">
                                                                        Rp {formatRupiah(totalOutputHarga)}
                                                                    </td>

                                                                    <td className="whitespace-nowrap px-4 py-3 font-black text-green-700">
                                                                        {formatQty(stokVarian)} KG
                                                                    </td>

                                                                    {!isDetail && (
                                                                        <td className="px-4 py-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeOutput(itemIndex, outputIndex)}
                                                                                className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                                                                            >
                                                                                Hapus
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Input
                            label="Penyesuaian"
                            name="penyesuaian"
                            type="number"
                            value={form.penyesuaian}
                            onChange={handleChange}
                            error={errors.penyesuaian?.[0]}
                            disabled={isDetail}
                        />

                        <Input
                            label="Tanggal TTD"
                            name="tanggal_ttd"
                            type="date"
                            value={form.tanggal_ttd}
                            onChange={handleChange}
                            error={errors.tanggal_ttd?.[0]}
                            disabled={isDetail}
                        />

                        <Input
                            label="Nama TTD"
                            name="nama_ttd"
                            value={form.nama_ttd}
                            onChange={handleChange}
                            error={errors.nama_ttd?.[0]}
                            disabled={isDetail}
                            required
                        />
                    </div>

                    <label className="mt-4 block">
                        <Label text="Catatan" />

                        <textarea
                            name="catatan"
                            rows="4"
                            value={form.catatan}
                            onChange={handleChange}
                            disabled={isDetail}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                        />

                        {errors.catatan?.[0] && <ErrorText text={errors.catatan[0]} />}
                    </label>

                    <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                        <div className="grid gap-4 lg:grid-cols-3">
                            <TotalInfo label="Sub Total" value={subtotal} />
                            <TotalInfo label="Penyesuaian" value={toDecimal(form.penyesuaian)} />
                            <TotalInfo label="Total Akhir" value={totalAkhir} />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
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
                                {saving ? "Menyimpan..." : isEdit ? "Update Borongan" : "Simpan Borongan"}
                            </button>
                        )}
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
    disabled = false,
    required = false,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
                {required && (
                    <span className="ml-1 text-red-600">*</span>
                )}
            </span>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required && !disabled}
                step={type === "number" ? "0.01" : undefined}
                inputMode={type === "number" ? "decimal" : undefined}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
            />

            {error && <ErrorText text={error} />}
        </label>
    );
}

function Label({ text }) {
    return (
        <span className="mb-2 block text-sm font-black text-slate-700">
            {text}
        </span>
    );
}

function ErrorText({ text }) {
    return <p className="mt-2 text-xs font-bold text-red-600">{text}</p>;
}

function TotalInfo({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                {label}
            </p>
            <p className="mt-2 text-lg font-black">Rp {formatRupiah(value)}</p>
        </div>
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

function integerInputValue(value) {
    if (value === "" || value === null || value === undefined) return "";

    const cleaned = String(value).replace(/[^\d-]/g, "");

    if (cleaned === "" || cleaned === "-") return "";

    return parseInt(cleaned, 10);
}

function decimalInputValue(value) {
    if (value === "" || value === null || value === undefined) return "";

    const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const integerPart = parts[0] || "0";

    if (parts.length === 1) return integerPart;

    const decimalPart = parts.slice(1).join("").slice(0, 2);

    return `${integerPart}.${decimalPart}`;
}

function toDecimal(value) {
    if (value === "" || value === null || value === undefined) return 0;

    if (typeof value === "number") {
        return Number.isFinite(value) ? roundMoney(value) : 0;
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

    return Number.isFinite(number) ? roundMoney(number) : 0;
}

function toInteger(value) {
    if (value === "" || value === null || value === undefined) return 0;

    if (Number.isInteger(value)) return value;

    const cleaned = String(value).replace(/[^\d-]/g, "");

    if (cleaned === "" || cleaned === "-") return 0;

    const number = parseInt(cleaned, 10);

    return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
    const number = Number(value);

    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function formatRupiah(value) {
    const number = toDecimal(value);

    return number.toLocaleString("id-ID", {
        minimumFractionDigits: number % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function formatQty(value) {
    return toDecimal(value).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function formatDateIndonesia(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function normalizeDateInput(value) {
    if (!value) return today();

    const stringValue = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) return stringValue.slice(0, 10);

    const date = new Date(stringValue);

    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);

    return today();
}

function sumBy(items, key) {
    return roundMoney(
        (Array.isArray(items) ? items : []).reduce((sum, item) => {
            return sum + toDecimal(item?.[key]);
        }, 0)
    );
}

function getStokMentah(barang) {
    return toDecimal(
        barang?.stok_mentah ??
            barang?.stokMentah ??
            barang?.stok_tersedia ??
            barang?.stokTersedia ??
            0
    );
}

function selectStyles(disabled = false, hasError = false) {
    return {
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
        }),
        control: (base, state) => ({
            ...base,
            minHeight: "48px",
            borderRadius: "1rem",
            borderColor: hasError
                ? "#ef4444"
                : state.isFocused
                  ? "#3b82f6"
                  : "#e2e8f0",
            backgroundColor: disabled ? "#e2e8f0" : "#f8fafc",
            boxShadow: state.isFocused
                ? "0 0 0 4px rgba(59, 130, 246, 0.10)"
                : "none",
        }),
    };
}

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data borongan tidak ditemukan",
        emptyTable: "Data borongan masih kosong",
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
