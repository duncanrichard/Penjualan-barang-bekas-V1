import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import Select from "react-select";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/penjualan";
const barangEndpoint = "/penjualan/barang-options";
const paymentOptionsEndpoint = "/pengeluaran/payment-options";
const customerEndpoint = "/penjualan/customer-options";

const today = () => new Date().toISOString().slice(0, 10);

const emptyItem = {
    data_barang_id: "",
    barang_variant_id: null,
    kode_barang: "",
    nama_barang: "",
    nama_varian: "",
    qty: 1,
    harga: 0,
};

const emptyCatatan = {
    catatan: "",
    nominal: 0,
};

const emptyForm = {
    nomor_nota: "",
    customer_id: "",
    tanggal: today(),
    jenis_pembayaran_id: "",
    catatan_transaksi_items: [{ ...emptyCatatan }],
    catatan_power_box_items: [{ ...emptyCatatan }],
    penyesuaian: 0,
    catatan: "",
    kota: "Kendal",
    tanggal_ttd: today(),
    nama_ttd: "",
    items: [{ ...emptyItem }],
};

export default function PenjualanIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const penjualansRef = useRef([]);

    const [penjualans, setPenjualans] = useState([]);
    const [barangOptions, setBarangOptions] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPenjualan, setSelectedPenjualan] = useState(null);
    const [filters, setFilters] = useState({
        start_date: today(),
        end_date: today(),
    });

    const buildPenjualanUrl = (selectedFilters = filters) => {
        const params = new URLSearchParams();

        if (selectedFilters.start_date) {
            params.set("start_date", selectedFilters.start_date);
        }

        if (selectedFilters.end_date) {
            params.set("end_date", selectedFilters.end_date);
        }

        const queryString = params.toString();

        return queryString ? `${endpoint}?${queryString}` : endpoint;
    };

    const fetchPenjualan = async (selectedFilters = filters) => {
        try {
            setLoading(true);

            const response = await fetch(buildPenjualanUrl(selectedFilters), {
                headers: { Accept: "application/json" },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data penjualan.");
            }

            const data = Array.isArray(result.data) ? result.data : [];

            setPenjualans(data);
            penjualansRef.current = data;
        } catch (error) {
            console.error("Error penjualan:", error);
            alert(error.message || "Gagal mengambil data penjualan.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (event) => {
        const { name, value } = event.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleApplyFilter = () => {
        fetchPenjualan(filters);
    };

    const handleTodayFilter = () => {
        const todayFilters = {
            start_date: today(),
            end_date: today(),
        };

        setFilters(todayFilters);
        fetchPenjualan(todayFilters);
    };

    const handleAllDataFilter = () => {
        const emptyFilters = {
            start_date: "",
            end_date: "",
        };

        setFilters(emptyFilters);
        fetchPenjualan(emptyFilters);
    };

    const fetchBarangOptions = async () => {
        try {
            const response = await fetch(barangEndpoint, {
                headers: { Accept: "application/json" },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data barang jadi.");
            }

            setBarangOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error barang options:", error);
            alert(error.message || "Gagal mengambil data barang jadi.");
        }
    };

    const fetchPaymentOptions = async () => {
        try {
            const response = await fetch(paymentOptionsEndpoint, {
                headers: { Accept: "application/json" },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil jenis pembayaran.");
            }

            const data = Array.isArray(result.data) ? result.data : [];
            setPaymentOptions(data);
        } catch (error) {
            console.error("Error jenis pembayaran:", error);
            alert(error.message || "Gagal mengambil jenis pembayaran.");
        }
    };

    const fetchCustomerOptions = async () => {
        try {
            const response = await fetch(customerEndpoint, {
                headers: { Accept: "application/json" },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data customer.");
            }

            setCustomerOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error customer options:", error);
            alert(error.message || "Gagal mengambil data customer.");
        }
    };

    useEffect(() => {
        fetchPenjualan();
        fetchBarangOptions();
        fetchPaymentOptions();
        fetchCustomerOptions();
    }, []);

    useEffect(() => {
        penjualansRef.current = penjualans;
    }, [penjualans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: penjualans,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[3, "desc"]],
            columns: [
                {
                    data: "nomor_nota",
                    title: "No Nota",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "nama_pelanggan",
                    title: "Pelanggan",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "no_wa_pelanggan",
                    title: "No WA",
                    render: (data) => `<span class="font-semibold text-slate-700">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "tanggal",
                    title: "Tanggal",
                    render: (data) => `<span class="font-semibold">${formatDateIndonesia(data)}</span>`,
                },
                {
                    data: "jenis_pembayaran_label",
                    title: "Pembayaran",
                    render: (data, type, row) => {
                        const label = data || row.metode_pembayaran || "-";
                        return `<span class="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">${escapeHtml(label)}</span>`;
                    },
                },
                {
                    data: "items",
                    title: "Produk",
                    orderable: false,
                    render: (data) => {
                        const items = Array.isArray(data) ? data : [];
                        const totalQty = items.reduce((sum, item) => sum + toDecimal(item.qty), 0);
                        const preview = items
                            .slice(0, 2)
                            .map((item) => `${escapeHtml(item.nama_barang || "-")} ${escapeHtml(item.nama_varian || "Tanpa Varian")}`)
                            .join("<br>");

                        return `
                            <div class="space-y-1">
                                <div class="font-black text-slate-950">${items.length} item</div>
                                <div class="text-xs font-bold text-slate-500">Total ${formatQty(totalQty)} KG</div>
                                ${preview ? `<div class="mt-1 text-xs font-semibold text-slate-500">${preview}${items.length > 2 ? "<br>..." : ""}</div>` : ""}
                            </div>
                        `;
                    },
                },
                {
                    data: "subtotal",
                    title: "Subtotal",
                    render: (data) => `<span class="font-black text-slate-950">Rp ${formatRupiah(data || 0)}</span>`,
                },
                {
                    data: "total_akhir",
                    title: "Total Akhir",
                    render: (data) => `<span class="font-black text-slate-950">Rp ${formatRupiah(data || 0)}</span>`,
                },
                {
                    data: null,
                    title: "Aksi",
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => `
                        <button type="button" data-id="${escapeHtml(row.id)}"
                            class="btn-detail-penjualan mr-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">
                            Detail
                        </button>
                        <button type="button" data-id="${escapeHtml(row.id)}"
                            class="btn-edit-penjualan mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200">
                            Edit
                        </button>
                        <button type="button" data-id="${escapeHtml(row.id)}"
                            class="btn-delete-penjualan rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200">
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
    }, [penjualans]);

    useEffect(() => {
        const tableElement = tableRef.current;
        if (!tableElement) return;

        const handleTableClick = (event) => {
            const detailButton = event.target.closest(".btn-detail-penjualan");
            const editButton = event.target.closest(".btn-edit-penjualan");
            const deleteButton = event.target.closest(".btn-delete-penjualan");
            const button = detailButton || editButton || deleteButton;

            if (!button) return;

            const id = String(button.dataset.id || "");
            const penjualan = penjualansRef.current.find((item) => String(item.id) === id);

            if (!penjualan) {
                alert("Data penjualan tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (detailButton) {
                setSelectedPenjualan({ ...penjualan, mode: "detail" });
                setModalOpen(true);
            }

            if (editButton) {
                setSelectedPenjualan({ ...penjualan, mode: "edit" });
                setModalOpen(true);
            }

            if (deleteButton) {
                handleDelete(penjualan);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const handleDelete = async (penjualan) => {
        const confirmed = window.confirm(`Yakin ingin menghapus nota "${penjualan.nomor_nota}"?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${penjualan.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus penjualan.");
            }

            await fetchPenjualan();
            await fetchBarangOptions();
        } catch (error) {
            console.error("Error hapus penjualan:", error);
            alert(error.message || "Penjualan gagal dihapus.");
        }
    };

    const handleSaved = async () => {
        setModalOpen(false);
        setSelectedPenjualan(null);
        await fetchPenjualan();
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
                                <h3 className="mt-2 text-2xl font-black">Penjualan</h3>
                                <p className="mt-2 text-sm font-semibold text-blue-100">
                                    Jual barang jadi tanpa varian atau per varian. Nominal penjualan otomatis menambah saldo pembayaran di Mutasi Transaksi.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPenjualan(null);
                                    setModalOpen(true);
                                }}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Penjualan
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">Daftar Penjualan</h4>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {penjualans.length} nota.
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-400">
                                    Default data yang tampil adalah transaksi hari ini. Gunakan filter range tanggal untuk melihat periode lain.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => fetchPenjualan(filters)}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                            >
                                {loading ? "Memuat..." : "Refresh"}
                            </button>
                        </div>

                        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
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

                                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                                    <button
                                        type="button"
                                        onClick={handleApplyFilter}
                                        disabled={loading}
                                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        Terapkan Filter
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleTodayFilter}
                                        disabled={loading}
                                        className="rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                                    >
                                        Hari Ini
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleAllDataFilter}
                                        disabled={loading}
                                        className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60"
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
                                            <th>Produk</th>
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

            <PenjualanModal
                open={modalOpen}
                penjualan={selectedPenjualan}
                barangOptions={barangOptions}
                paymentOptions={paymentOptions}
                customerOptions={customerOptions}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedPenjualan(null);
                }}
                onSaved={handleSaved}
            />
        </>
    );
}

function PenjualanModal({ open, penjualan = null, barangOptions = [], paymentOptions = [], customerOptions = [], onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(penjualan?.id) && penjualan?.mode !== "detail";
    const isDetail = penjualan?.mode === "detail";

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (penjualan) {
            setForm({
                nomor_nota: penjualan.nomor_nota || "",
                customer_id: penjualan.customer_id || penjualan.customer?.id || "",
                tanggal: normalizeDateInput(penjualan.tanggal),
                jenis_pembayaran_id: penjualan.jenis_pembayaran_id || "",
                catatan_transaksi_items: normalizeCatatanItems(
                    penjualan.catatan_transaksi_items,
                    penjualan.catatan_transaksi,
                    penjualan.nilai_catatan_transaksi
                ),
                catatan_power_box_items: normalizeCatatanItems(
                    penjualan.catatan_power_box_items,
                    penjualan.catatan_power_box,
                    penjualan.nilai_catatan_power_box
                ),
                penyesuaian: toDecimal(penjualan.penyesuaian),
                catatan: penjualan.catatan || "",
                kota: penjualan.kota || "Kendal",
                tanggal_ttd: normalizeDateInput(penjualan.tanggal_ttd || penjualan.tanggal),
                nama_ttd: penjualan.nama_ttd || "",
                items:
                    Array.isArray(penjualan.items) && penjualan.items.length > 0
                        ? penjualan.items.map((item) => ({
                              data_barang_id: item.data_barang_id || "",
                              barang_variant_id: item.barang_variant_id || null,
                              kode_barang: item.kode_barang || "",
                              nama_barang: item.nama_barang || "",
                              nama_varian: item.nama_varian || "",
                              qty: Math.max(0.01, toDecimal(item.qty)),
                              harga: Math.max(0, toInteger(item.harga)),
                          }))
                        : [{ ...emptyItem }],
            });
        } else {
            setForm({
                ...emptyForm,
                nomor_nota: "",
                customer_id: "",
                tanggal: today(),
                jenis_pembayaran_id: paymentOptions[0]?.id || "",
                tanggal_ttd: today(),
                items: [{ ...emptyItem }],
                catatan_transaksi_items: [{ ...emptyCatatan }],
                catatan_power_box_items: [{ ...emptyCatatan }],
            });
        }
    }, [open, penjualan, paymentOptions]);

    const normalizedBarangOptions = useMemo(() => {
        const base = normalizeBarangOptions(barangOptions);

        const fallback = (form.items || [])
            .filter((item) => item.data_barang_id)
            .map((item) => ({
                id: item.data_barang_id,
                kode: item.kode_barang || "-",
                kode_barang: item.kode_barang || "-",
                nama_barang: item.nama_barang || "Barang Lama",
                stok_jadi_tanpa_varian: item.barang_variant_id ? 0 : toDecimal(item.qty),
                stok_jadi_varian: item.barang_variant_id ? toDecimal(item.qty) : 0,
                stok_jadi: toDecimal(item.qty),
                stok_tersedia: toDecimal(item.qty),
                harga: item.harga || 0,
                variants: item.barang_variant_id
                    ? [
                          {
                              id: item.barang_variant_id,
                              data_barang_id: item.data_barang_id,
                              nama: item.nama_varian || "Varian Lama",
                              kode: "",
                              is_active: true,
                              stok_jadi: toDecimal(item.qty),
                              is_fallback: true,
                          },
                      ]
                    : [],
                is_fallback: true,
            }));

        const merged = [...base];

        fallback.forEach((fallbackBarang) => {
            const existing = merged.find((barang) => String(barang.id) === String(fallbackBarang.id));

            if (!existing) {
                merged.push(fallbackBarang);
                return;
            }

            existing.stok_jadi_tanpa_varian = Math.max(
                toDecimal(existing.stok_jadi_tanpa_varian),
                toDecimal(fallbackBarang.stok_jadi_tanpa_varian)
            );

            fallbackBarang.variants.forEach((fallbackVariant) => {
                const existsVariant = existing.variants.some(
                    (variant) => String(variant.id) === String(fallbackVariant.id)
                );

                if (!existsVariant) {
                    existing.variants.push(fallbackVariant);
                }
            });

            existing.stok_jadi = toDecimal(existing.stok_jadi_tanpa_varian)
                + existing.variants.reduce((sum, variant) => sum + toDecimal(variant.stok_jadi), 0);
            existing.stok_tersedia = existing.stok_jadi;
        });

        return merged;
    }, [barangOptions, form.items]);

    const barangSelectOptions = useMemo(() => {
        return normalizedBarangOptions
            .filter((barang) => {
                if (isDetail || isEdit) return true;
                return toDecimal(barang.stok_tersedia) > 0;
            })
            .map((barang) => ({
                value: barang.id,
                label: `${barang.kode_barang || barang.kode || "-"} - ${barang.nama_barang} | Stok ${formatQty(barang.stok_tersedia)} KG`,
                barang,
            }));
    }, [normalizedBarangOptions, isDetail, isEdit]);

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
            (option) => String(option.value) === String(form.customer_id || "")
        ) || null;

    const selectedCustomer = selectedCustomerOption?.customer || null;

    const paymentSelectOptions = useMemo(() => {
        return paymentOptions.map((payment) => ({
            value: payment.id,
            label: payment.nama || payment.kode || "Pembayaran",
            payment,
        }));
    }, [paymentOptions]);

    const selectedPaymentOption = paymentSelectOptions.find((option) => {
        return String(option.value) === String(form.jenis_pembayaran_id || "");
    }) || null;

    if (!open) return null;

    const subtotal = roundMoney(
        form.items.reduce((sum, item) => sum + toDecimal(item.qty) * toInteger(item.harga), 0)
    );
    const totalCatatanTransaksi = roundMoney(
        form.catatan_transaksi_items.reduce((sum, item) => sum + toDecimal(item.nominal), 0)
    );
    const totalCatatanPowerBox = roundMoney(
        form.catatan_power_box_items.reduce((sum, item) => sum + toDecimal(item.nominal), 0)
    );
    const totalAkhir = roundMoney(
        subtotal + totalCatatanTransaksi - totalCatatanPowerBox + toDecimal(form.penyesuaian)
    );

    const handleChange = (event) => {
        const { name, value, type } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "number" ? decimalInputValue(value) : value,
        }));
    };

    const handleItemChange = (index, field, value) => {
        setForm((prev) => {
            const items = [...prev.items];

            items[index] = {
                ...items[index],
                [field]:
                    field === "qty"
                        ? decimalInputValue(value)
                        : field === "harga"
                          ? integerInputValue(value)
                          : value,
            };

            return { ...prev, items };
        });
    };

    const handleBarangChange = (index, selectedOption) => {
        const selectedBarang = selectedOption?.barang || null;

        setForm((prev) => {
            const items = [...prev.items];

            items[index] = {
                ...items[index],
                data_barang_id: selectedBarang?.id || "",
                barang_variant_id: null,
                kode_barang: selectedBarang?.kode_barang || selectedBarang?.kode || "",
                nama_barang: selectedBarang?.nama_barang || "",
                nama_varian: "",
                harga:
                    toInteger(items[index].harga) > 0
                        ? items[index].harga
                        : toInteger(selectedBarang?.harga ?? 0),
            };

            return { ...prev, items };
        });
    };

    const handleJenisStokChange = (index, selectedOption) => {
        const item = selectedOption?.item || null;

        setForm((prev) => {
            const items = [...prev.items];

            items[index] = {
                ...items[index],
                barang_variant_id: item?.barang_variant_id || null,
                nama_varian: item?.nama_varian || "",
            };

            return { ...prev, items };
        });
    };

    const handleAddItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { ...emptyItem }],
        }));
    };

    const handleRemoveItem = (index) => {
        setForm((prev) => ({
            ...prev,
            items:
                prev.items.length > 1
                    ? prev.items.filter((_, itemIndex) => itemIndex !== index)
                    : prev.items,
        }));
    };

    const handleCatatanChange = (type, index, field, value) => {
        const key = type === "transaksi" ? "catatan_transaksi_items" : "catatan_power_box_items";

        setForm((prev) => {
            const catatans = [...prev[key]];

            catatans[index] = {
                ...catatans[index],
                [field]: field === "nominal" ? decimalInputValue(value) : value,
            };

            return { ...prev, [key]: catatans };
        });
    };

    const handleAddCatatan = (type) => {
        const key = type === "transaksi" ? "catatan_transaksi_items" : "catatan_power_box_items";

        setForm((prev) => ({
            ...prev,
            [key]: [...prev[key], { ...emptyCatatan }],
        }));
    };

    const handleRemoveCatatan = (type, index) => {
        const key = type === "transaksi" ? "catatan_transaksi_items" : "catatan_power_box_items";

        setForm((prev) => ({
            ...prev,
            [key]:
                prev[key].length > 1
                    ? prev[key].filter((_, itemIndex) => itemIndex !== index)
                    : prev[key],
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isDetail || saving) return;

        const cleanItems = form.items.map((item) => ({
            data_barang_id: item.data_barang_id || "",
            barang_variant_id: item.barang_variant_id || null,
            qty: Math.max(0.01, toDecimal(item.qty)),
            harga: Math.max(0, toInteger(item.harga)),
        }));

        if (!form.customer_id) {
            alert("Data customer wajib dipilih.");
            return;
        }

        if (!form.tanggal) {
            alert("Tanggal wajib diisi.");
            return;
        }

        if (!form.jenis_pembayaran_id) {
            alert("Jenis pembayaran wajib dipilih.");
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
            alert("Pilih barang pada semua baris produk.");
            return;
        }

        const duplicatedKeys = cleanItems.map((item) => `${item.data_barang_id}:${item.barang_variant_id || "none"}`);
        const uniqueKeys = Array.from(new Set(duplicatedKeys));

        if (duplicatedKeys.length !== uniqueKeys.length) {
            alert("Barang dengan jenis stok yang sama tidak boleh diinput dua kali. Gabungkan qty dalam satu baris.");
            return;
        }

        const invalidStock = cleanItems.some((item) => {
            if (isEdit) return false;

            const barang = normalizedBarangOptions.find((option) => String(option.id) === String(item.data_barang_id));
            const stokItem = getStockOptionByVariant(barang, item.barang_variant_id);

            if (!stokItem) return true;

            return toDecimal(item.qty) > toDecimal(stokItem.stok_jadi);
        });

        if (invalidStock) {
            alert("Qty penjualan melebihi stok jadi yang tersedia.");
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
            catatan_transaksi_items: cleanCatatanItems(form.catatan_transaksi_items),
            catatan_power_box_items: cleanCatatanItems(form.catatan_power_box_items),
        };

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${penjualan.id}` : endpoint;

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
            console.error("Error simpan penjualan:", error);
            alert(error.message || "Gagal menyimpan penjualan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Nota Penjualan</p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isDetail ? "Detail Penjualan" : isEdit ? "Edit Penjualan" : "Tambah Penjualan"}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Bisa jual barang jadi tanpa varian atau barang jadi per varian.
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
                        <Input label="Nomor Nota" value={form.nomor_nota || "Otomatis dari sistem"} onChange={() => {}} disabled />
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Nama Customer <span className="text-red-600">*</span>
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
                                menuPortalTarget={document.body}
                                styles={{
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    control: (base, state) => ({
                                        ...base,
                                        minHeight: "48px",
                                        borderRadius: "1rem",
                                        borderColor: errors.customer_id?.[0]
                                            ? "#ef4444"
                                            : state.isFocused
                                              ? "#3b82f6"
                                              : "#e2e8f0",
                                        backgroundColor: isDetail ? "#e2e8f0" : "#f8fafc",
                                    }),
                                }}
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
                        <Input label="Tanggal" name="tanggal" type="date" value={form.tanggal} onChange={handleChange} error={errors.tanggal?.[0]} disabled={isDetail} />
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">Jenis Pembayaran</span>
                            <Select
                                value={selectedPaymentOption}
                                onChange={(option) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        jenis_pembayaran_id: option?.value || "",
                                    }));
                                }}
                                options={paymentSelectOptions}
                                isDisabled={isDetail}
                                isClearable
                                placeholder="Pilih pembayaran..."
                                noOptionsMessage={() => "Jenis pembayaran belum tersedia"}
                                className="text-sm font-semibold"
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                styles={selectStyles(isDetail)}
                            />
                            {errors.jenis_pembayaran_id?.[0] && (
                                <p className="mt-2 text-xs font-bold text-red-600">{errors.jenis_pembayaran_id[0]}</p>
                            )}
                        </label>
                        <Input label="Kota" name="kota" value={form.kota} onChange={handleChange} error={errors.kota?.[0]} disabled={isDetail} />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                            <div>
                                <h4 className="font-black">Produk Penjualan</h4>
                                <p className="mt-1 text-xs font-semibold text-slate-300">
                                    Pilih barang, lalu pilih jenis stok: Tanpa Varian atau varian tertentu.
                                </p>
                            </div>

                            {!isDetail && (
                                <button type="button" onClick={handleAddItem} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-blue-50">
                                    + Tambah Produk
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700">
                                        <th className="whitespace-nowrap px-4 py-3 font-black">No</th>
                                        <th className="min-w-[24rem] px-4 py-3 font-black">Barang</th>
                                        <th className="min-w-[20rem] px-4 py-3 font-black">Jenis Stok</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Stok</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Qty</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Harga</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Total</th>
                                        {!isDetail && <th className="whitespace-nowrap px-4 py-3 font-black">Aksi</th>}
                                    </tr>
                                </thead>

                                <tbody>
                                    {form.items.map((item, index) => {
                                        const total = roundMoney(toDecimal(item.qty) * toInteger(item.harga));

                                        const selectedBarangOption =
                                            barangSelectOptions.find((option) => String(option.value) === String(item.data_barang_id)) || null;

                                        const selectedBarang = selectedBarangOption?.barang || null;

                                        const stokOptions = buildStockOptions(selectedBarang, isEdit || isDetail, item);

                                        const selectedStockOption =
                                            stokOptions.find((option) => String(option.value) === String(item.barang_variant_id || "none")) || null;

                                        const stok = toDecimal(selectedStockOption?.item?.stok_jadi || 0);

                                        return (
                                            <tr key={index} className="border-t border-slate-100">
                                                <td className="px-4 py-3 font-black">{index + 1}</td>

                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={selectedBarangOption}
                                                        onChange={(selectedOption) => handleBarangChange(index, selectedOption)}
                                                        options={barangSelectOptions}
                                                        isDisabled={isDetail}
                                                        isClearable
                                                        placeholder="Cari / pilih barang..."
                                                        noOptionsMessage={() => "Barang jadi tidak tersedia"}
                                                        className="text-sm font-semibold"
                                                        classNamePrefix="react-select"
                                                        menuPortalTarget={document.body}
                                                        formatOptionLabel={(option) => (
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-800">
                                                                    {option.barang.kode_barang || option.barang.kode || "-"} - {option.barang.nama_barang || "-"}
                                                                </span>
                                                                <span className="text-xs font-bold text-green-700">
                                                                    Tanpa varian {formatQty(option.barang.stok_jadi_tanpa_varian || 0)} KG • Varian {formatQty(option.barang.stok_jadi_varian || 0)} KG
                                                                </span>
                                                            </div>
                                                        )}
                                                        styles={selectStyles(isDetail)}
                                                    />

                                                    {errors[`items.${index}.data_barang_id`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`items.${index}.data_barang_id`][0]}</p>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={selectedStockOption}
                                                        onChange={(selectedOption) => handleJenisStokChange(index, selectedOption)}
                                                        options={stokOptions}
                                                        isDisabled={isDetail || !item.data_barang_id}
                                                        isClearable
                                                        placeholder="Pilih jenis stok..."
                                                        noOptionsMessage={() => "Stok jadi tidak tersedia"}
                                                        className="text-sm font-semibold"
                                                        classNamePrefix="react-select"
                                                        menuPortalTarget={document.body}
                                                        styles={selectStyles(isDetail)}
                                                    />

                                                    {errors[`items.${index}.barang_variant_id`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`items.${index}.barang_variant_id`][0]}</p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 font-black text-green-700">
                                                    {formatQty(stok)} KG
                                                </td>

                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        max={!isEdit && !isDetail && stok ? stok : undefined}
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={item.qty}
                                                        onChange={(event) => handleItemChange(index, "qty", event.target.value)}
                                                        disabled={isDetail}
                                                        className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                    />
                                                    {errors[`items.${index}.qty`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`items.${index}.qty`][0]}</p>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        inputMode="numeric"
                                                        value={item.harga}
                                                        onChange={(event) => handleItemChange(index, "harga", event.target.value)}
                                                        disabled={isDetail}
                                                        className="w-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                    />
                                                    {errors[`items.${index}.harga`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`items.${index}.harga`][0]}</p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 font-black text-slate-950">
                                                    Rp {formatRupiah(total)}
                                                </td>

                                                {!isDetail && (
                                                    <td className="px-4 py-3">
                                                        <button type="button" onClick={() => handleRemoveItem(index)} className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200">
                                                            Hapus
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                <tfoot>
                                    <tr className="border-t border-slate-200 bg-slate-50">
                                        <td colSpan={isDetail ? 6 : 7} className="px-4 py-3 text-right font-black">
                                            Sub Total
                                        </td>
                                        <td className="px-4 py-3 font-black">Rp {formatRupiah(subtotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <DynamicCatatanSection
                        title="Catatan Transaksi"
                        subtitle="Nominal pada bagian ini akan MENAMBAH total penjualan."
                        type="transaksi"
                        items={form.catatan_transaksi_items}
                        errors={errors}
                        disabled={isDetail}
                        onAdd={() => handleAddCatatan("transaksi")}
                        onRemove={(index) => handleRemoveCatatan("transaksi", index)}
                        onChange={(index, field, value) => handleCatatanChange("transaksi", index, field, value)}
                        total={totalCatatanTransaksi}
                        totalLabel="+ Total Catatan Transaksi"
                    />

                    <DynamicCatatanSection
                        title="Catatan Transaksi Power Box Group"
                        subtitle="Nominal pada bagian ini akan MENGURANGI total penjualan."
                        type="power_box"
                        items={form.catatan_power_box_items}
                        errors={errors}
                        disabled={isDetail}
                        onAdd={() => handleAddCatatan("power_box")}
                        onRemove={(index) => handleRemoveCatatan("power_box", index)}
                        onChange={(index, field, value) => handleCatatanChange("power_box", index, field, value)}
                        total={totalCatatanPowerBox}
                        totalLabel="- Total Power Box Group"
                    />

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Input label="Penyesuaian" name="penyesuaian" type="number" value={form.penyesuaian} onChange={handleChange} error={errors.penyesuaian?.[0]} disabled={isDetail} />
                        <Input label="Tanggal TTD" name="tanggal_ttd" type="date" value={form.tanggal_ttd} onChange={handleChange} error={errors.tanggal_ttd?.[0]} disabled={isDetail} />
                        <Input label="Nama TTD" name="nama_ttd" value={form.nama_ttd} onChange={handleChange} error={errors.nama_ttd?.[0]} disabled={isDetail} required />
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-black text-slate-700">Catatan</span>
                        <textarea
                            name="catatan"
                            rows="4"
                            value={form.catatan}
                            onChange={handleChange}
                            disabled={isDetail}
                            placeholder="Catatan tambahan..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                        />
                        {errors.catatan?.[0] && <p className="mt-2 text-xs font-bold text-red-600">{errors.catatan[0]}</p>}
                    </label>

                    <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                        <div className="grid gap-4 lg:grid-cols-5">
                            <TotalInfo label="Sub Total" value={subtotal} />
                            <TotalInfo label="+ Catatan Transaksi" value={totalCatatanTransaksi} />
                            <TotalInfo label="- Power Box Group" value={totalCatatanPowerBox} />
                            <TotalInfo label="Penyesuaian" value={toDecimal(form.penyesuaian)} />

                            <div className="rounded-2xl bg-white/10 p-4 lg:col-span-1">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-300">Total Akhir</p>
                                <p className="mt-2 text-2xl font-black">Rp {formatRupiah(totalAkhir)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                        <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">
                            {isDetail ? "Tutup" : "Batal"}
                        </button>

                        {!isDetail && (
                            <button type="submit" disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                                {saving ? "Menyimpan..." : isEdit ? "Update Penjualan" : "Simpan Penjualan"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

function DynamicCatatanSection({ title, subtitle, type, items, errors, disabled, onAdd, onRemove, onChange, total, totalLabel }) {
    const fieldPrefix = type === "transaksi" ? "catatan_transaksi_items" : "catatan_power_box_items";

    return (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                <div>
                    <h4 className="font-black">{title}</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-300">{subtitle}</p>
                </div>
                {!disabled && (
                    <button type="button" onClick={onAdd} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-blue-50">
                        + Tambah Catatan
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700">
                            <th className="whitespace-nowrap px-4 py-3 font-black">No</th>
                            <th className="min-w-96 px-4 py-3 font-black">Catatan</th>
                            <th className="whitespace-nowrap px-4 py-3 font-black">Nominal</th>
                            {!disabled && <th className="whitespace-nowrap px-4 py-3 font-black">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-t border-slate-100">
                                <td className="px-4 py-3 font-black">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={item.catatan}
                                        onChange={(event) => onChange(index, "catatan", event.target.value)}
                                        disabled={disabled}
                                        placeholder="Isi catatan..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                    />
                                    {errors[`${fieldPrefix}.${index}.catatan`]?.[0] && (
                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`${fieldPrefix}.${index}.catatan`][0]}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={item.nominal}
                                        onChange={(event) => onChange(index, "nominal", event.target.value)}
                                        disabled={disabled}
                                        className="w-44 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                    />
                                    {errors[`${fieldPrefix}.${index}.nominal`]?.[0] && (
                                        <p className="mt-2 text-xs font-bold text-red-600">{errors[`${fieldPrefix}.${index}.nominal`][0]}</p>
                                    )}
                                </td>
                                {!disabled && (
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => onRemove(index)} className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200">
                                            Hapus
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan={disabled ? 2 : 3} className="px-4 py-3 text-right font-black">
                                {totalLabel}
                            </td>
                            <td className="px-4 py-3 font-black">Rp {formatRupiah(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function Input({ label, name, type = "text", value, onChange, placeholder = "", error, disabled = false, required = false }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
                {required && <span className="ml-1 text-red-600">*</span>}
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
            {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
        </label>
    );
}

function TotalInfo({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-300">{label}</p>
            <p className="mt-2 text-lg font-black">Rp {formatRupiah(value)}</p>
        </div>
    );
}

function normalizeBarangOptions(barangs) {
    return (Array.isArray(barangs) ? barangs : [])
        .map((barang) => {
            const variants = Array.isArray(barang.variants)
                ? barang.variants.map((variant) => ({
                      id: variant.id,
                      data_barang_id: variant.data_barang_id || barang.id,
                      nama: variant.nama || variant.nama_varian || "-",
                      kode: variant.kode || "",
                      is_active: variant.is_active !== false,
                      stok_jadi: toDecimal(variant.stok_jadi ?? variant.stok_tersedia ?? 0),
                  }))
                : [];

            const stokTanpaVarian = toDecimal(
                barang.stok_jadi_tanpa_varian ??
                    barang.stok_tanpa_varian ??
                    barang.stok_jadi_non_varian ??
                    0
            );

            const stokVarian = toDecimal(
                barang.stok_jadi_varian ??
                    variants.reduce((sum, variant) => sum + toDecimal(variant.stok_jadi), 0)
            );

            const totalStok = toDecimal(barang.stok_tersedia ?? barang.stok_jadi ?? stokTanpaVarian + stokVarian);

            return {
                id: barang.id,
                kode: barang.kode || barang.kode_barang || "-",
                kode_barang: barang.kode_barang || barang.kode || "-",
                nama_barang: barang.nama_barang || barang.nama || "-",
                stok_jadi_tanpa_varian: stokTanpaVarian,
                stok_jadi_varian: stokVarian,
                stok_jadi: totalStok,
                stok_tersedia: totalStok,
                harga: barang.harga || 0,
                variants,
            };
        })
        .filter((barang) => barang.id && barang.nama_barang);
}

function buildStockOptions(barang, includeZero = false, currentItem = null) {
    if (!barang) return [];

    const options = [];

    const stokTanpaVarian = toDecimal(barang.stok_jadi_tanpa_varian || 0);
    const currentIsTanpaVarian = currentItem?.data_barang_id && !currentItem?.barang_variant_id;

    if (stokTanpaVarian > 0 || (includeZero && currentIsTanpaVarian)) {
        options.push({
            value: "none",
            label: `Tanpa Varian | Stok ${formatQty(stokTanpaVarian)} KG`,
            item: {
                barang_variant_id: null,
                nama_varian: "",
                stok_jadi: stokTanpaVarian || toDecimal(currentItem?.qty || 0),
            },
        });
    }

    (Array.isArray(barang.variants) ? barang.variants : [])
        .filter((variant) => toDecimal(variant.stok_jadi) > 0 || includeZero)
        .forEach((variant) => {
            options.push({
                value: variant.id,
                label: `${variant.nama} | Stok ${formatQty(variant.stok_jadi)} KG`,
                item: {
                    barang_variant_id: variant.id,
                    nama_varian: variant.nama,
                    stok_jadi: toDecimal(variant.stok_jadi),
                },
            });
        });

    return options;
}

function getStockOptionByVariant(barang, variantId) {
    const options = buildStockOptions(barang, false);
    return options.find((option) => String(option.value) === String(variantId || "none"))?.item || null;
}

function normalizeCatatanItems(items, fallbackCatatan = "", fallbackNominal = 0) {
    if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
            catatan: item.catatan || "",
            nominal: toDecimal(item.nominal),
        }));
    }

    if (fallbackCatatan || toDecimal(fallbackNominal) > 0) {
        return [{ catatan: fallbackCatatan || "", nominal: toDecimal(fallbackNominal) }];
    }

    return [{ ...emptyCatatan }];
}

function cleanCatatanItems(items) {
    return (Array.isArray(items) ? items : [])
        .map((item) => ({
            catatan: item.catatan || "",
            nominal: Math.max(0, toDecimal(item.nominal)),
        }))
        .filter((item) => item.catatan.trim() || item.nominal > 0);
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

function selectStyles(isDetail = false) {
    return {
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
            ...base,
            minHeight: "48px",
            borderRadius: "1rem",
            borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
            backgroundColor: isDetail ? "#f1f5f9" : "#f8fafc",
            boxShadow: state.isFocused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#eff6ff" : "#ffffff",
            color: "#0f172a",
        }),
        singleValue: (base) => ({ ...base, color: "#0f172a", fontWeight: 800 }),
        placeholder: (base) => ({ ...base, color: "#94a3b8", fontWeight: 700 }),
    };
}

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data penjualan tidak ditemukan",
        emptyTable: "Data penjualan masih kosong",
        paginate: {
            first: "Pertama",
            last: "Terakhir",
            next: "Berikutnya",
            previous: "Sebelumnya",
        },
    };
}

function styleTableRow(row) {
    row.classList.add("border-t", "border-slate-100", "text-slate-700", "hover:bg-blue-50/40");
    Array.from(row.children).forEach((cell) => {
        cell.classList.add("whitespace-nowrap", "px-5", "py-4");
    });
}

function styleTableHeader(thead) {
    const headerRow = thead.querySelector("tr");

    if (headerRow) {
        headerRow.classList.add("bg-slate-950", "text-white");
        Array.from(headerRow.children).forEach((th) => {
            th.classList.add("whitespace-nowrap", "px-5", "py-4", "font-black");
        });
    }
}
