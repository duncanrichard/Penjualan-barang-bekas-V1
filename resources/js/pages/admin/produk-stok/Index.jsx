import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import Select from "react-select";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/produk-stok";
const optionsEndpoint = "/produk-stok/options";
const historyEndpoint = "/produk-stok/history";

const emptyFilters = {
    search: "",
    data_barang_id: "",
    barang_variant_id: "",
    jenis_barang: "",
    source_type: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
};

export default function ProdukStokIndexPage() {
    const summaryTableRef = useRef(null);
    const summaryDataTableRef = useRef(null);
    const summaryRowsRef = useRef([]);

    const [filters, setFilters] = useState(emptyFilters);
    const [productOptions, setProductOptions] = useState([]);
    const [summaryRows, setSummaryRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [summaryTotals, setSummaryTotals] = useState({
        total_produk: 0,
        stok_mentah: 0,
        stok_jadi: 0,
        stok_total: 0,
    });

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const selectOptions = useMemo(() => {
        return productOptions.map((barang) => ({
            value: barang.id,
            label: `${barang.kode_barang || barang.kode || "-"} - ${barang.nama_barang}`,
            barang,
        }));
    }, [productOptions]);

    const selectedProductOption = useMemo(() => {
        return selectOptions.find((option) => String(option.value) === String(filters.data_barang_id)) || null;
    }, [selectOptions, filters.data_barang_id]);

    const selectedProductForVariant = selectedProductOption?.barang || null;

    const variantFilterOptions = useMemo(() => {
        if (!selectedProductForVariant?.variants) return [];

        return selectedProductForVariant.variants.map((variant) => ({
            value: variant.id,
            label: `${variant.nama}${variant.kode ? ` (${variant.kode})` : ""}`,
            variant,
        }));
    }, [selectedProductForVariant]);

    const selectedVariantFilterOption = useMemo(() => {
        return variantFilterOptions.find((option) => String(option.value) === String(filters.barang_variant_id)) || null;
    }, [variantFilterOptions, filters.barang_variant_id]);

    const fetchProductOptions = async () => {
        try {
            const response = await fetch(optionsEndpoint, { headers: { Accept: "application/json" } });
            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil opsi produk.");
            }

            setProductOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error opsi produk:", error);
            alert(error.message || "Gagal mengambil opsi produk.");
        }
    };

    const fetchSummary = async () => {
        try {
            setLoading(true);

            const query = new URLSearchParams();
            if (filters.search) query.set("search", filters.search);
            if (filters.jenis_barang) query.set("jenis_barang", filters.jenis_barang);
            if (filters.barang_variant_id) query.set("barang_variant_id", filters.barang_variant_id);

            const response = await fetch(`${endpoint}?${query.toString()}`, {
                headers: { Accept: "application/json" },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil stok produk.");
            }

            const rows = Array.isArray(result.data) ? result.data : [];

            setSummaryRows(rows);
            summaryRowsRef.current = rows;

            setSummaryTotals(
                result.totals || {
                    total_produk: 0,
                    stok_mentah: 0,
                    stok_jadi: 0,
                    stok_total: 0,
                }
            );
        } catch (error) {
            console.error("Error stok produk:", error);
            alert(error.message || "Gagal mengambil stok produk.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductOptions();
        fetchSummary();
    }, []);

    useEffect(() => {
        summaryRowsRef.current = summaryRows;
    }, [summaryRows]);

    useEffect(() => {
        if (!summaryTableRef.current) return;

        if (summaryDataTableRef.current) {
            summaryDataTableRef.current.destroy();
            summaryDataTableRef.current = null;
        }

        summaryDataTableRef.current = new DataTable(summaryTableRef.current, {
            data: summaryRows,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[1, "asc"]],
            columns: [
                {
                    data: "kode_barang",
                    title: "Kode",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "nama_barang",
                    title: "Nama Produk",
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
                    render: (data, type, row) => `
                        <div>
                            <p class="font-black text-green-700">${formatQty(data)} KG</p>
                            <p class="mt-1 text-xs font-bold text-slate-400">Non-varian ${formatQty(row.stok_jadi_non_varian || 0)} KG</p>
                        </div>
                    `,
                },
                {
                    data: "variants",
                    title: "Stok Per Varian",
                    orderable: false,
                    render: (data) => renderVariantBadges(data),
                },
                {
                    data: "stok_total",
                    title: "Stok Akhir",
                    render: (data) => `<span class="font-black text-slate-950">${formatQty(data)} KG</span>`,
                },
                {
                    data: null,
                    title: "Aksi",
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => `
                        <button type="button" data-id="${escapeHtml(row.id)}" data-variant="" class="btn-history-stok mr-2 rounded-xl bg-blue-100 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-200">History Produk</button>
                    `,
                },
            ],
            language: datatableLanguage("Data stok produk masih kosong"),
            createdRow: decorateRow,
            headerCallback: decorateHeader,
        });

        return () => {
            if (summaryDataTableRef.current) {
                summaryDataTableRef.current.destroy();
                summaryDataTableRef.current = null;
            }
        };
    }, [summaryRows]);

    useEffect(() => {
        const tableElement = summaryTableRef.current;
        if (!tableElement) return;

        const handleClick = (event) => {
            const button = event.target.closest(".btn-history-stok, .btn-history-varian");
            if (!button) return;

            const id = String(button.dataset.id || "");
            const variantId = String(button.dataset.variant || "");

            const product = summaryRowsRef.current.find((item) => String(item.id) === id);

            if (!product) {
                alert("Produk tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            setSelectedProduct({
                ...product,
                selected_barang_variant_id: variantId,
            });
            setHistoryModalOpen(true);
        };

        tableElement.addEventListener("click", handleClick);

        return () => tableElement.removeEventListener("click", handleClick);
    }, []);

    const handleFilterChange = (name, value) => {
        setFilters((prev) => {
            const next = { ...prev, [name]: value };

            if (name === "data_barang_id") {
                next.barang_variant_id = "";
            }

            return next;
        });
    };

    const handleApplyFilter = () => fetchSummary();

    const handleResetFilter = () => {
        setFilters(emptyFilters);
        setTimeout(() => fetchSummary(), 0);
    };

    const handleOpenSelectedProductHistory = () => {
        if (!selectedProductOption?.barang) {
            alert("Pilih produk terlebih dahulu.");
            return;
        }

        const product = summaryRowsRef.current.find((item) => String(item.id) === String(selectedProductOption.value));

        setSelectedProduct({
            ...(product || selectedProductOption.barang),
            selected_barang_variant_id: filters.barang_variant_id || "",
        });
        setHistoryModalOpen(true);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Laporan Stok</p>
                                <h3 className="mt-2 text-2xl font-black">Produk Stok</h3>
                                <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-100">
                                    Stok mentah, stok jadi, stok akhir, stok per varian, dan histori dari pembelian, borongan, sampai penjualan.
                                </p>
                            </div>

                            <button type="button" onClick={handleApplyFilter} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50">
                                {loading ? "Memuat..." : "Refresh Data"}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard label="Total Produk" value={`${summaryTotals.total_produk || 0}`} />
                        <SummaryCard label="Stok Mentah" value={`${formatQty(summaryTotals.stok_mentah)} KG`} />
                        <SummaryCard label="Stok Jadi" value={`${formatQty(summaryTotals.stok_jadi)} KG`} />
                        <SummaryCard label="Stok Akhir Total" value={`${formatQty(summaryTotals.stok_total)} KG`} />
                    </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                    <h4 className="text-xl font-black text-slate-950">Filter Produk Stok</h4>

                    <div className="mt-5 grid gap-4 lg:grid-cols-6">
                        <Input label="Cari Produk / Varian" value={filters.search} onChange={(event) => handleFilterChange("search", event.target.value)} placeholder="Kode / nama / varian / kategori" />

                        <SelectInput label="Jenis Stok" value={filters.jenis_barang} onChange={(event) => handleFilterChange("jenis_barang", event.target.value)}>
                            <option value="">Semua</option>
                            <option value="mentah">Barang Mentah</option>
                            <option value="jadi">Barang Jadi</option>
                        </SelectInput>

                        <Input label="Tanggal Mulai History" type="date" value={filters.tanggal_mulai} onChange={(event) => handleFilterChange("tanggal_mulai", event.target.value)} />
                        <Input label="Tanggal Selesai History" type="date" value={filters.tanggal_selesai} onChange={(event) => handleFilterChange("tanggal_selesai", event.target.value)} />

                        <div className="flex items-end gap-2 lg:col-span-2">
                            <button type="button" onClick={handleApplyFilter} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Terapkan</button>
                            <button type="button" onClick={handleResetFilter} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">Reset</button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">Pilih Produk untuk History</span>
                            <Select value={selectedProductOption} onChange={(selected) => handleFilterChange("data_barang_id", selected?.value || "")} options={selectOptions} isClearable placeholder="Cari / pilih produk..." noOptionsMessage={() => "Produk tidak ditemukan"} className="text-sm font-semibold" classNamePrefix="react-select" styles={selectStyles()} />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">Pilih Varian</span>
                            <Select value={selectedVariantFilterOption} onChange={(selected) => handleFilterChange("barang_variant_id", selected?.value || "")} options={variantFilterOptions} isDisabled={!filters.data_barang_id} isClearable placeholder="Semua varian..." noOptionsMessage={() => "Varian tidak ditemukan"} className="text-sm font-semibold" classNamePrefix="react-select" styles={selectStyles()} />
                        </label>

                        <div className="flex items-end">
                            <button type="button" onClick={handleOpenSelectedProductHistory} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 lg:w-auto">Buka History</button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-6">
                        <h4 className="text-xl font-black text-slate-950">Stok Akhir Produk</h4>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Setiap produk menampilkan stok mentah, stok jadi, stok akhir, dan stok per varian.</p>
                    </div>

                    <div className="p-6">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table ref={summaryTableRef} className="display w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>Kode</th>
                                            <th>Nama Produk</th>
                                            <th>Kategori</th>
                                            <th>Stok Mentah</th>
                                            <th>Stok Jadi</th>
                                            <th>Stok Per Varian</th>
                                            <th>Stok Akhir</th>
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

            <HistoryStokModal
                open={historyModalOpen}
                product={selectedProduct}
                filters={filters}
                onClose={() => {
                    setHistoryModalOpen(false);
                    setSelectedProduct(null);
                }}
            />
        </>
    );
}

function HistoryStokModal({ open, product, filters, onClose }) {
    const historyTableRef = useRef(null);
    const historyDataTableRef = useRef(null);

    const [historyRows, setHistoryRows] = useState([]);
    const [historyTotals, setHistoryTotals] = useState({ qty_masuk: 0, qty_keluar: 0, nominal: 0 });
    const [loading, setLoading] = useState(false);
    const [modalFilters, setModalFilters] = useState({
        barang_variant_id: "",
        jenis_barang: "",
        source_type: "",
        tanggal_mulai: "",
        tanggal_selesai: "",
    });

    const modalVariantOptions = useMemo(() => {
        if (!product?.variants) return [];
        return product.variants.map((variant) => ({
            value: variant.id,
            label: `${variant.nama}${variant.kode ? ` (${variant.kode})` : ""} - ${formatQty(variant.stok_jadi)} KG`,
            variant,
        }));
    }, [product]);

    const selectedModalVariantOption = useMemo(() => {
        return modalVariantOptions.find((option) => String(option.value) === String(modalFilters.barang_variant_id)) || null;
    }, [modalVariantOptions, modalFilters.barang_variant_id]);

    useEffect(() => {
        if (!open || !product?.id) return;

        setModalFilters({
            barang_variant_id: product.selected_barang_variant_id || filters.barang_variant_id || "",
            jenis_barang: filters.jenis_barang || "",
            source_type: filters.source_type || "",
            tanggal_mulai: filters.tanggal_mulai || "",
            tanggal_selesai: filters.tanggal_selesai || "",
        });
    }, [open, product?.id]);

    const fetchHistory = async (customFilters = modalFilters) => {
        if (!product?.id) return;

        try {
            setLoading(true);

            const query = new URLSearchParams();
            query.set("data_barang_id", product.id);
            if (customFilters.barang_variant_id) query.set("barang_variant_id", customFilters.barang_variant_id);
            if (customFilters.jenis_barang) query.set("jenis_barang", customFilters.jenis_barang);
            if (customFilters.source_type) query.set("source_type", customFilters.source_type);
            if (customFilters.tanggal_mulai) query.set("tanggal_mulai", customFilters.tanggal_mulai);
            if (customFilters.tanggal_selesai) query.set("tanggal_selesai", customFilters.tanggal_selesai);

            const response = await fetch(`${historyEndpoint}?${query.toString()}`, { headers: { Accept: "application/json" } });
            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil history stok.");
            }

            setHistoryRows(Array.isArray(result.data) ? result.data : []);
            setHistoryTotals(result.totals || { qty_masuk: 0, qty_keluar: 0, nominal: 0 });
        } catch (error) {
            console.error("Error history stok:", error);
            alert(error.message || "Gagal mengambil history stok.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !product?.id) return;

        const initialFilters = {
            barang_variant_id: product.selected_barang_variant_id || filters.barang_variant_id || "",
            jenis_barang: filters.jenis_barang || "",
            source_type: filters.source_type || "",
            tanggal_mulai: filters.tanggal_mulai || "",
            tanggal_selesai: filters.tanggal_selesai || "",
        };

        fetchHistory(initialFilters);
    }, [open, product?.id]);

    useEffect(() => {
        if (!open || !historyTableRef.current) return;

        if (historyDataTableRef.current) {
            historyDataTableRef.current.destroy();
            historyDataTableRef.current = null;
        }

        historyDataTableRef.current = new DataTable(historyTableRef.current, {
            data: historyRows,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "asc"]],
            columns: [
                { data: "tanggal", title: "Tanggal", render: (data) => `<span class="font-semibold">${formatDateIndonesia(data)}</span>` },
                {
                    data: "source_type_label",
                    title: "Transaksi",
                    render: (data, type, row) => `
                        <div>
                            <p class="font-black text-slate-950">${escapeHtml(data || "-")}</p>
                            <p class="mt-1 text-xs font-bold text-slate-400">${escapeHtml(row.nomor_nota || "-")}</p>
                        </div>
                    `,
                },
                { data: "nama_pihak", title: "Supplier/Pelanggan", render: (data) => `<span class="font-semibold">${escapeHtml(data || "-")}</span>` },
                {
                    data: "jenis_barang_label",
                    title: "Jenis",
                    render: (data, type, row) => `
                        <span class="rounded-full px-3 py-1 text-xs font-black ${row.jenis_barang === "jadi" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}">
                            ${escapeHtml(data || "-")}
                        </span>
                    `,
                },
                { data: "nama_varian", title: "Varian", render: (data) => `<span class="font-black text-slate-700">${escapeHtml(data || "-")}</span>` },
                { data: "qty_masuk", title: "Qty Masuk", render: (data) => `<span class="font-black text-green-700">${formatQty(data)} KG</span>` },
                { data: "qty_keluar", title: "Qty Keluar", render: (data) => `<span class="font-black text-red-700">${formatQty(data)} KG</span>` },
                { data: "stok_akhir", title: "Stok Akhir", render: (data) => `<span class="font-black text-slate-950">${formatQty(data)} KG</span>` },
                { data: "harga", title: "Harga", render: (data) => `<span class="font-black text-slate-950">Rp ${formatRupiah(data)}</span>` },
                { data: "nominal", title: "Nominal", render: (data) => `<span class="font-black text-slate-950">Rp ${formatRupiah(data)}</span>` },
            ],
            language: datatableLanguage("History stok produk ini masih kosong"),
            createdRow: decorateRow,
            headerCallback: decorateHeader,
        });

        return () => {
            if (historyDataTableRef.current) {
                historyDataTableRef.current.destroy();
                historyDataTableRef.current = null;
            }
        };
    }, [open, historyRows]);

    if (!open || !product) return null;

    const selectedVariant = product.variants?.find((variant) => String(variant.id) === String(modalFilters.barang_variant_id)) || null;

    const handleFilterChange = (name, value) => {
        setModalFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleApplyFilter = () => fetchHistory(modalFilters);

    const handleResetFilter = () => {
        const reset = { barang_variant_id: "", jenis_barang: "", source_type: "", tanggal_mulai: "", tanggal_selesai: "" };
        setModalFilters(reset);
        fetchHistory(reset);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">History Stok Produk</p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">{product.kode_barang || product.kode || "-"} - {product.nama_barang}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Riwayat stok dari pembelian, borongan, sampai penjualan.</p>
                    </div>

                    <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600" aria-label="Tutup modal">×</button>
                </div>

                <div className="max-h-[82vh] overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <SummaryCard label="Stok Mentah Saat Ini" value={`${formatQty(product.stok_mentah || 0)} KG`} />
                        <SummaryCard label="Stok Jadi Saat Ini" value={`${formatQty(product.stok_jadi || 0)} KG`} />
                        <SummaryCard label="Stok Akhir Saat Ini" value={`${formatQty(product.stok_total || 0)} KG`} />
                        <SummaryCard label="Stok Varian Dipilih" value={`${formatQty(selectedVariant?.stok_jadi || 0)} KG`} />
                        <SummaryCard label="Total Keluar History" value={`${formatQty(historyTotals.qty_keluar)} KG`} />
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-4 lg:grid-cols-6">
                            <label className="block lg:col-span-2">
                                <span className="mb-2 block text-sm font-black text-slate-700">Filter Varian</span>
                                <Select value={selectedModalVariantOption} onChange={(selected) => handleFilterChange("barang_variant_id", selected?.value || "")} options={modalVariantOptions} isClearable placeholder="Semua varian..." noOptionsMessage={() => "Varian tidak ditemukan"} className="text-sm font-semibold" classNamePrefix="react-select" styles={selectStyles()} />
                            </label>

                            <SelectInput label="Jenis Stok" value={modalFilters.jenis_barang} onChange={(event) => handleFilterChange("jenis_barang", event.target.value)}>
                                <option value="">Semua</option>
                                <option value="mentah">Barang Mentah</option>
                                <option value="jadi">Barang Jadi</option>
                            </SelectInput>

                            <SelectInput label="Jenis Transaksi" value={modalFilters.source_type} onChange={(event) => handleFilterChange("source_type", event.target.value)}>
                                <option value="">Semua</option>
                                <option value="pembelian">Pembelian</option>
                                <option value="borongan_input">Borongan - Bahan Mentah</option>
                                <option value="borongan_output">Borongan - Hasil Jadi</option>
                                <option value="penjualan">Penjualan</option>
                            </SelectInput>

                            <Input label="Tanggal Mulai" type="date" value={modalFilters.tanggal_mulai} onChange={(event) => handleFilterChange("tanggal_mulai", event.target.value)} />
                            <Input label="Tanggal Selesai" type="date" value={modalFilters.tanggal_selesai} onChange={(event) => handleFilterChange("tanggal_selesai", event.target.value)} />
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={handleApplyFilter} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">{loading ? "Memuat..." : "Terapkan"}</button>
                            <button type="button" onClick={handleResetFilter} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Reset</button>
                        </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 p-4">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-lg font-black text-slate-950">Detail History</h4>
                                <p className="mt-1 text-sm font-semibold text-slate-500">Masuk {formatQty(historyTotals.qty_masuk)} KG, keluar {formatQty(historyTotals.qty_keluar)} KG, nominal Rp {formatRupiah(historyTotals.nominal)}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table ref={historyTableRef} className="display w-full text-left text-sm">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Transaksi</th>
                                        <th>Supplier/Pelanggan</th>
                                        <th>Jenis</th>
                                        <th>Varian</th>
                                        <th>Qty Masuk</th>
                                        <th>Qty Keluar</th>
                                        <th>Stok Akhir</th>
                                        <th>Harga</th>
                                        <th>Nominal</th>
                                    </tr>
                                </thead>
                                <tbody />
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function Input({ label, type = "text", value, onChange, placeholder = "" }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
            <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
        </label>
    );
}

function SelectInput({ label, value, onChange, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
            <select value={value} onChange={onChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100">
                {children}
            </select>
        </label>
    );
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return { message: "Response server bukan JSON valid.", raw_error: error?.message };
    }
}

function renderVariantBadges(variants) {
    const list = Array.isArray(variants) ? variants : [];

    if (list.length === 0) {
        return `<span class="text-xs font-bold text-slate-400">Belum ada varian</span>`;
    }

    return `
        <div class="flex min-w-72 flex-wrap gap-2">
            ${list
                .map(
                    (variant) => `
                        <button
                            type="button"
                            data-id="${escapeHtml(variant.data_barang_id)}"
                            data-variant="${escapeHtml(variant.id)}"
                            class="btn-history-varian rounded-xl bg-green-50 px-3 py-2 text-left text-xs font-black text-green-700 ring-1 ring-green-100 hover:bg-green-100"
                        >
                            ${escapeHtml(variant.nama || "-")}<br>
                            <span class="text-[11px] text-green-800">${formatQty(variant.stok_jadi)} KG</span>
                        </button>
                    `
                )
                .join("")}
        </div>
    `;
}

function datatableLanguage(emptyTable = "Data masih kosong") {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data tidak ditemukan",
        emptyTable,
        paginate: { first: "Pertama", last: "Terakhir", next: "Berikutnya", previous: "Sebelumnya" },
    };
}

function decorateRow(row) {
    row.classList.add("border-t", "border-slate-100", "text-slate-700", "hover:bg-blue-50/40");
    Array.from(row.children).forEach((cell) => cell.classList.add("whitespace-nowrap", "px-5", "py-4"));
}

function decorateHeader(thead) {
    const headerRow = thead.querySelector("tr");
    if (headerRow) {
        headerRow.classList.add("bg-slate-950", "text-white");
        Array.from(headerRow.children).forEach((th) => th.classList.add("whitespace-nowrap", "px-5", "py-4", "font-black"));
    }
}

function selectStyles() {
    return {
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
            ...base,
            minHeight: "48px",
            borderRadius: "1rem",
            borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
            backgroundColor: "#f8fafc",
            boxShadow: state.isFocused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
        }),
    };
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
    if (typeof value === "number") return Number.isFinite(value) ? roundMoney(value) : 0;

    let cleaned = String(value).trim().replace(/Rp|rp|IDR|idr/g, "").replace(/\s/g, "");

    if (cleaned.includes(",") && cleaned.includes(".")) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
        cleaned = cleaned.replace(",", ".");
    }

    const number = Number(cleaned);
    return Number.isFinite(number) ? roundMoney(number) : 0;
}

function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function formatRupiah(value) {
    const number = toDecimal(value);
    return number.toLocaleString("id-ID", { minimumFractionDigits: number % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}

function formatQty(value) {
    return toDecimal(value).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDateIndonesia(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
