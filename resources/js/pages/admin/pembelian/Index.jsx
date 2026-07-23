import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import Select from "react-select";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/pembelian";
const barangEndpoint = "/pembelian/barang-options";
const paymentOptionsEndpoint = "/pengeluaran/payment-options";
const karyawanEndpoint = "/pembelian/karyawan-options";
const customerEndpoint = "/pembelian/customer-options";

const today = () => new Date().toISOString().slice(0, 10);

const emptyItem = {
    data_barang_id: "",
    jenis_barang: "mentah",
    qty: 1,
    harga: 0,
};

const emptyCatatan = {
    catatan: "",
    nominal: 0,
    karyawan_ids: [],
};

const emptyForm = {
    nomor_nota: "",
    customer_id: "",
    no_wa_customer: "",
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

const jenisBarangOptions = [
    { value: "mentah", label: "Barang Mentah" },
    { value: "jadi", label: "Barang Jadi" },
];

export default function PembelianIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const pembeliansRef = useRef([]);

    const [pembelians, setPembelians] = useState([]);
    const [barangOptions, setBarangOptions] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [karyawanOptions, setKaryawanOptions] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        start_date: today(),
        end_date: today(),
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPembelian, setSelectedPembelian] = useState(null);


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
            alert(error.message || "Gagal mengambil jenis pembayaran dari mutasi kasir.");
        }
    };

    const fetchPembelian = async (customFilters = filters) => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            if (customFilters.start_date) {
                params.set("start_date", customFilters.start_date);
            }

            if (customFilters.end_date) {
                params.set("end_date", customFilters.end_date);
            }

            const queryString = params.toString();
            const url = queryString ? `${endpoint}?${queryString}` : endpoint;

            const response = await fetch(url, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data pembelian.");
            }

            const data = Array.isArray(result.data) ? result.data : [];
            setPembelians(data);
            pembeliansRef.current = data;
        } catch (error) {
            console.error("Error pembelian:", error);
            alert(error.message || "Gagal mengambil data pembelian.");
        } finally {
            setLoading(false);
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

    const fetchCustomerOptions = async () => {
        try {
            const response = await fetch(customerEndpoint, {
                headers: {
                    Accept: "application/json",
                },
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

    const fetchKaryawanOptions = async () => {
        try {
            const response = await fetch(karyawanEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data karyawan.");
            }

            setKaryawanOptions(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error karyawan options:", error);
            alert(error.message || "Gagal mengambil data karyawan.");
        }
    };

    useEffect(() => {
        fetchPembelian();
        fetchBarangOptions();
        fetchPaymentOptions();
        fetchKaryawanOptions();
        fetchCustomerOptions();
    }, []);

    useEffect(() => {
        pembeliansRef.current = pembelians;
    }, [pembelians]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: pembelians,
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
                    data: "nama_customer",
                    title: "Customer",
                    render: (data) => `<span class="font-black text-slate-950">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "no_wa_customer",
                    title: "No WA",
                    render: (data) => `<span class="font-semibold text-slate-700">${escapeHtml(data || "-")}</span>`,
                },
                {
                    data: "tanggal",
                    title: "Tanggal",
                    render: (data) => `<span class="font-semibold">${formatDateIndonesia(data)}</span>`,
                },
                {
                    data: "items",
                    title: "Produk",
                    orderable: false,
                    render: (data) => {
                        const items = Array.isArray(data) ? data : [];
                        const totalItem = items.length;
                        const jenisSummary = summarizeJenis(items);

                        return `
                            <div class="space-y-1">
                                <div class="font-black text-slate-950">${totalItem} produk</div>
                                <div class="text-xs font-bold text-slate-500">${escapeHtml(jenisSummary)}</div>
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
                    data: "jenis_pembayaran_label",
                    title: "Pembayaran",
                    render: (data, type, row) => `
                        <div>
                            <p class="font-black text-slate-950">${escapeHtml(data || "-")}</p>
                            <p class="mt-1 text-xs font-bold text-slate-400">${escapeHtml(row.metode_pembayaran || "-")}</p>
                        </div>
                    `,
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
                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-print-pembelian mr-2 rounded-xl bg-green-100 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-200"
                        >
                            Cetak PDF
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-detail-pembelian mr-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                        >
                            Detail
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-edit-pembelian mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            data-id="${escapeHtml(row.id)}"
                            class="btn-delete-pembelian rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                        >
                            Hapus
                        </button>
                    `,
                },
            ],
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                infoEmpty: "Tidak ada data",
                infoFiltered: "(difilter dari _MAX_ total data)",
                zeroRecords: "Data pembelian tidak ditemukan",
                emptyTable: "Data pembelian masih kosong",
                paginate: {
                    first: "Pertama",
                    last: "Terakhir",
                    next: "Berikutnya",
                    previous: "Sebelumnya",
                },
            },
            createdRow: (row) => {
                row.classList.add("border-t", "border-slate-100", "text-slate-700", "hover:bg-blue-50/40");

                Array.from(row.children).forEach((cell) => {
                    cell.classList.add("whitespace-nowrap", "px-5", "py-4");
                });
            },
            headerCallback: (thead) => {
                const headerRow = thead.querySelector("tr");

                if (headerRow) {
                    headerRow.classList.add("bg-slate-950", "text-white");

                    Array.from(headerRow.children).forEach((th) => {
                        th.classList.add("whitespace-nowrap", "px-5", "py-4", "font-black");
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
    }, [pembelians]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const printButton = event.target.closest(".btn-print-pembelian");
            const detailButton = event.target.closest(".btn-detail-pembelian");
            const editButton = event.target.closest(".btn-edit-pembelian");
            const deleteButton = event.target.closest(".btn-delete-pembelian");

            const button = printButton || detailButton || editButton || deleteButton;
            if (!button) return;

            const id = String(button.dataset.id || "");
            const pembelian = pembeliansRef.current.find((item) => String(item.id) === id);

            if (!pembelian) {
                alert("Data pembelian tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (printButton) handlePrintPdf(pembelian);
            if (detailButton) handleOpenDetailModal(pembelian);
            if (editButton) handleOpenEditModal(pembelian);
            if (deleteButton) handleDelete(pembelian);
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

    const handleSubmitFilter = (event) => {
        event.preventDefault();

        if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
            alert("Tanggal dari tidak boleh lebih besar dari tanggal sampai.");
            return;
        }

        fetchPembelian(filters);
    };

    const handleResetFilter = () => {
        const todayFilter = {
            start_date: today(),
            end_date: today(),
        };

        setFilters(todayFilter);
        fetchPembelian(todayFilter);
    };

    const handleOpenCreateModal = () => {
        setSelectedPembelian(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (pembelian) => {
        setSelectedPembelian({ ...pembelian, mode: "edit" });
        setModalOpen(true);
    };

    const handleOpenDetailModal = (pembelian) => {
        setSelectedPembelian({ ...pembelian, mode: "detail" });
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPembelian(null);
    };

    const handleSaved = () => {
        handleCloseModal();
        fetchPembelian(filters);
        fetchBarangOptions();
        fetchPaymentOptions();
        fetchKaryawanOptions();
        fetchCustomerOptions();
    };

    const handleDelete = async (pembelian) => {
        const confirmed = window.confirm(`Yakin ingin menghapus nota "${pembelian.nomor_nota}"?`);

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${pembelian.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus pembelian.");
            }

            fetchPembelian();
            fetchBarangOptions();
        } catch (error) {
            console.error("Error hapus pembelian:", error);
            alert(error.message || "Pembelian gagal dihapus.");
        }
    };

    const handlePrintPdf = (pembelian) => {
        const printWindow = window.open("", "_blank", "width=900,height=1200");

        if (!printWindow) {
            alert("Popup diblokir browser. Izinkan popup untuk mencetak PDF.");
            return;
        }

        printWindow.document.open();
        printWindow.document.write(generateNotaPrintHtml(pembelian));
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
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

                                <h3 className="mt-2 text-2xl font-black">Pembelian</h3>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 lg:w-auto"
                            >
                                + Tambah Pembelian
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h4 className="text-xl font-black text-slate-950">Daftar Pembelian</h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Total data tampil: {pembelians.length} nota.
                                </p>

                                <p className="mt-1 text-xs font-bold text-blue-600">
                                    Filter aktif: {formatDateIndonesia(filters.start_date)} s/d {formatDateIndonesia(filters.end_date)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => fetchPembelian(filters)}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                            >
                                {loading ? "Memuat..." : "Refresh"}
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmitFilter}
                            className="mb-5 rounded-3xl border border-blue-100 bg-blue-50/60 p-4"
                        >
                            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                                        Tanggal Dari
                                    </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={filters.start_date}
                                        onChange={handleFilterChange}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                                        Tanggal Sampai
                                    </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={filters.end_date}
                                        onChange={handleFilterChange}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Terapkan Filter
                                </button>

                                <button
                                    type="button"
                                    onClick={handleResetFilter}
                                    disabled={loading}
                                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Hari Ini
                                </button>
                            </div>
                        </form>

                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table ref={tableRef} className="display w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>No Nota</th>
                                            <th>Customer</th>
                                            <th>No WA</th>
                                            <th>Tanggal</th>
                                            <th>Produk</th>
                                            <th>Subtotal</th>
                                            <th>Pembayaran</th>
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

            <PembelianModal
                open={modalOpen}
                pembelian={selectedPembelian}
                barangOptions={barangOptions}
                paymentOptions={paymentOptions}
                karyawanOptions={karyawanOptions}
                customerOptions={customerOptions}
                onClose={handleCloseModal}
                onSaved={handleSaved}
                onPrint={handlePrintPdf}
            />
        </>
    );
}

function PembelianModal({
    open,
    pembelian = null,
    barangOptions = [],
    paymentOptions = [],
    karyawanOptions = [],
    customerOptions = [],
    onClose,
    onSaved,
    onPrint,
}) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(pembelian?.id) && pembelian?.mode !== "detail";
    const isDetail = pembelian?.mode === "detail";

    useEffect(() => {
        if (!open) return;

        setErrors({});

        if (pembelian) {
            const catatanTransaksiItems = normalizeCatatanItems(
                pembelian.catatan_transaksi_items,
                pembelian.catatan_transaksi,
                pembelian.nilai_catatan_transaksi
            );

            const catatanPowerBoxItems = normalizeCatatanItems(
                pembelian.catatan_power_box_items,
                pembelian.catatan_power_box,
                pembelian.nilai_catatan_power_box
            );

            setForm({
                nomor_nota: pembelian.nomor_nota || "",
                customer_id: pembelian.customer_id || pembelian.customer?.id || "",
                no_wa_customer: pembelian.no_wa_customer || pembelian.customer?.no_wa || "",
                tanggal: normalizeDateInput(pembelian.tanggal),
                jenis_pembayaran_id: pembelian.jenis_pembayaran_id || "",

                catatan_transaksi_items: catatanTransaksiItems,
                catatan_power_box_items: catatanPowerBoxItems,

                penyesuaian: toDecimal(pembelian.penyesuaian),
                catatan: pembelian.catatan || "",
                kota: pembelian.kota || "Kendal",
                tanggal_ttd: normalizeDateInput(pembelian.tanggal_ttd || pembelian.tanggal),
                nama_ttd: pembelian.nama_ttd || "",

                items:
                    Array.isArray(pembelian.items) && pembelian.items.length > 0
                        ? pembelian.items.map((item) => ({
                              data_barang_id: item.data_barang_id || "",
                              jenis_barang: item.jenis_barang || "mentah",
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
                no_wa_customer: "",
                tanggal: today(),
                jenis_pembayaran_id: paymentOptions[0]?.id || "",
                tanggal_ttd: today(),
                items: [{ ...emptyItem }],
                catatan_transaksi_items: [{ ...emptyCatatan }],
                catatan_power_box_items: [{ ...emptyCatatan }],
            });
        }
    }, [open, pembelian, paymentOptions]);

    const barangSelectOptions = useMemo(() => {
        return barangOptions.map((barang) => {
            const stokText = buildStokText(barang);

            return {
                value: barang.id,
                label: `${barang.kode_barang || barang.kode || "-"} - ${barang.nama_barang}${stokText}`,
                barang,
            };
        });
    }, [barangOptions]);

    const karyawanSelectOptions = useMemo(() => {
        return karyawanOptions.map((karyawan) => ({
            value: String(karyawan.id),
            label: karyawan.nama || karyawan.name || "-",
            karyawan,
        }));
    }, [karyawanOptions]);

    const customerSelectOptions = useMemo(() => {
        return customerOptions.map((customer) => ({
            value: String(customer.id),
            label: `${customer.nama_customer || "-"}${customer.no_wa ? ` - ${customer.no_wa}` : ""}`,
            customer,
        }));
    }, [customerOptions]);

    const selectedCustomerOption = useMemo(() => {
        return (
            customerSelectOptions.find(
                (option) => String(option.value) === String(form.customer_id)
            ) || null
        );
    }, [customerSelectOptions, form.customer_id]);

    const handleCustomerChange = (selectedOption) => {
        const customer = selectedOption?.customer || null;

        setForm((prev) => ({
            ...prev,
            customer_id: customer?.id || "",
            no_wa_customer: customer?.no_wa || "",
        }));

        if (errors.customer_id) {
            setErrors((prev) => {
                const nextErrors = { ...prev };
                delete nextErrors.customer_id;
                return nextErrors;
            });
        }
    };

    const selectedPaymentOption = useMemo(() => {
        return paymentOptions.find((payment) => String(payment.id) === String(form.jenis_pembayaran_id)) || null;
    }, [paymentOptions, form.jenis_pembayaran_id]);

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

        // Hapus pesan error field ketika pengguna mulai memperbaiki isian.
        if (errors[name]) {
            setErrors((prev) => {
                const nextErrors = { ...prev };
                delete nextErrors[name];
                return nextErrors;
            });
        }
    };

    const handleItemChange = (index, field, value) => {
        setForm((prev) => {
            const items = [...prev.items];

            items[index] = {
                ...items[index],
                [field]:
                    field === "data_barang_id" || field === "jenis_barang"
                        ? value
                        : field === "qty"
                          ? decimalInputValue(value)
                          : integerInputValue(value),
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
                // status barang TIDAK berasal dari master barang.
                // status dipilih manual dari select "Status Barang" pada baris transaksi.
                jenis_barang: items[index]?.jenis_barang || "mentah",
                harga:
                    toInteger(items[index].harga) > 0
                        ? items[index].harga
                        : toInteger(selectedBarang?.harga ?? 0),
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
                [field]: field === "nominal" ? decimalInputValue(value) : field === "karyawan_ids" ? normalizeKaryawanIds(value) : value,
            };

            return {
                ...prev,
                [key]: catatans,
            };
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
            jenis_barang: item.jenis_barang || "",
            qty: Math.max(0.01, toDecimal(item.qty)),
            harga: Math.max(0, toInteger(item.harga)),
        }));

        const cleanCatatanTransaksiItems = cleanCatatanItems(form.catatan_transaksi_items, false);
        const cleanCatatanPowerBoxItems = cleanCatatanItems(form.catatan_power_box_items, true);

        const hasEmptyBarang = cleanItems.some((item) => !item.data_barang_id);
        const hasEmptyJenisBarang = cleanItems.some((item) => !["mentah", "jadi"].includes(item.jenis_barang));

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

        const namaTtd = String(form.nama_ttd || "").trim();

        if (!namaTtd) {
            setErrors((prev) => ({
                ...prev,
                nama_ttd: ["Nama TTD wajib diisi."],
            }));

            alert("Nama TTD wajib diisi.");
            return;
        }

        if (!form.jenis_pembayaran_id) {
            alert("Jenis pembayaran wajib dipilih. Saldo akan dipotong dari deposit mutasi kasir pada tanggal pembelian.");
            return;
        }

        if (hasEmptyBarang) {
            alert("Pilih barang pada semua baris produk.");
            return;
        }

        if (hasEmptyJenisBarang) {
            alert("Pilih status barang pada semua baris produk.");
            return;
        }

        const payload = {
            nomor_nota: "",
            customer_id: form.customer_id,
            tanggal: normalizeDateInput(form.tanggal),
            jenis_pembayaran_id: form.jenis_pembayaran_id,

            penyesuaian: toDecimal(form.penyesuaian),
            catatan: form.catatan || "",
            kota: form.kota || "Kendal",
            tanggal_ttd: normalizeDateInput(form.tanggal_ttd || form.tanggal),
            nama_ttd: namaTtd,

            items: cleanItems,
            catatan_transaksi_items: cleanCatatanTransaksiItems,
            catatan_power_box_items: cleanCatatanPowerBoxItems,
        };

        try {
            setSaving(true);
            setErrors({});

            const url = isEdit ? `${endpoint}/${pembelian.id}` : endpoint;

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
            console.error("Error simpan pembelian:", error);
            alert(error.message || "Gagal menyimpan pembelian.");
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
                            Nota Pembelian
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isDetail ? "Detail Pembelian" : isEdit ? "Edit Pembelian" : "Tambah Pembelian"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Status barang dipilih per baris: Barang Mentah atau Barang Jadi.
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

                <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input
                            label="Nomor Nota"
                            name="nomor_nota"
                            value={form.nomor_nota || "Otomatis dari sistem"}
                            onChange={() => {}}
                            placeholder="Otomatis dari sistem"
                            error={errors.nomor_nota?.[0]}
                            disabled={true}
                        />

                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Data Customer <span className="text-red-600">*</span>
                            </span>

                            <Select
                                value={selectedCustomerOption}
                                onChange={handleCustomerChange}
                                options={customerSelectOptions}
                                isDisabled={isDetail}
                                isClearable
                                placeholder="Cari / pilih customer..."
                                noOptionsMessage={() => "Customer tidak ditemukan"}
                                className="text-sm font-semibold"
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                styles={{
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "48px",
                                        borderRadius: "1rem",
                                        borderColor: errors.customer_id ? "#ef4444" : "#e2e8f0",
                                        backgroundColor: "#f8fafc",
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
                            name="no_wa_customer"
                            value={form.no_wa_customer}
                            onChange={() => {}}
                            placeholder="Otomatis dari Data Customer"
                            disabled={true}
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

                        <SelectInput
                            label="Jenis Pembayaran"
                            name="jenis_pembayaran_id"
                            value={form.jenis_pembayaran_id}
                            onChange={handleChange}
                            error={errors.jenis_pembayaran_id?.[0]}
                            disabled={isDetail}
                        >
                            <option value="">Pilih pembayaran</option>
                            {paymentOptions.map((payment) => (
                                <option key={payment.id} value={payment.id}>
                                    {payment.nama}{payment.kode ? ` (${payment.kode})` : ""}
                                </option>
                            ))}
                        </SelectInput>

                        <Input
                            label="Kota"
                            name="kota"
                            value={form.kota}
                            onChange={handleChange}
                            placeholder="Kendal"
                            error={errors.kota?.[0]}
                            disabled={isDetail}
                        />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                            <div>
                                <h4 className="font-black">Produk Pembelian</h4>
                                <p className="mt-1 text-xs font-semibold text-slate-300">
                                    Pilih barang, pilih status barang, lalu isi qty dan harga.
                                </p>
                            </div>

                            {!isDetail && (
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-blue-50"
                                >
                                    + Tambah Produk
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700">
                                        <th className="whitespace-nowrap px-4 py-3 font-black">No</th>
                                        <th className="min-w-96 px-4 py-3 font-black">Nama Barang</th>
                                        <th className="min-w-52 px-4 py-3 font-black">Status Barang</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Qty (KG)</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Harga</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-black">Total</th>
                                        {!isDetail && <th className="whitespace-nowrap px-4 py-3 font-black">Aksi</th>}
                                    </tr>
                                </thead>

                                <tbody>
                                    {form.items.map((item, index) => {
                                        const selectedOption =
                                            barangSelectOptions.find(
                                                (option) => String(option.value) === String(item.data_barang_id)
                                            ) || null;

                                        const total = roundMoney(toDecimal(item.qty) * toInteger(item.harga));

                                        return (
                                            <tr key={index} className="border-t border-slate-100">
                                                <td className="px-4 py-3 font-black">{index + 1}</td>

                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={selectedOption}
                                                        onChange={(selectedOption) => handleBarangChange(index, selectedOption)}
                                                        options={barangSelectOptions}
                                                        isDisabled={isDetail}
                                                        isClearable
                                                        placeholder="Cari / pilih barang..."
                                                        noOptionsMessage={() => "Barang tidak ditemukan"}
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

                                                    {errors[`items.${index}.data_barang_id`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">
                                                            {errors[`items.${index}.data_barang_id`][0]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <select
                                                        value={item.jenis_barang || "mentah"}
                                                        onChange={(event) => handleItemChange(index, "jenis_barang", event.target.value)}
                                                        disabled={isDetail}
                                                        className="w-48 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                    >
                                                        {jenisBarangOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {errors[`items.${index}.jenis_barang`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">
                                                            {errors[`items.${index}.jenis_barang`][0]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={item.qty}
                                                        onChange={(event) => handleItemChange(index, "qty", event.target.value)}
                                                        disabled={isDetail}
                                                        className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                                                    />

                                                    {errors[`items.${index}.qty`]?.[0] && (
                                                        <p className="mt-2 text-xs font-bold text-red-600">
                                                            {errors[`items.${index}.qty`][0]}
                                                        </p>
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
                                                        <p className="mt-2 text-xs font-bold text-red-600">
                                                            {errors[`items.${index}.harga`][0]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 font-black text-slate-950">
                                                    Rp {formatRupiah(total)}
                                                </td>

                                                {!isDetail && (
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
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

                                <tfoot>
                                    <tr className="border-t border-slate-200 bg-slate-50">
                                        <td colSpan={isDetail ? 5 : 6} className="px-4 py-3 text-right font-black">
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
                        subtitle="Nominal pada bagian ini akan MENAMBAH total pembelian. Bagian ini tidak memakai pilihan karyawan dan tidak dipakai untuk pembagian fee."
                        type="transaksi"
                        items={form.catatan_transaksi_items}
                        errors={errors}
                        disabled={isDetail}
                        karyawanSelectOptions={[]}
                        onAdd={() => handleAddCatatan("transaksi")}
                        onRemove={(index) => handleRemoveCatatan("transaksi", index)}
                        onChange={(index, field, value) => handleCatatanChange("transaksi", index, field, value)}
                        total={totalCatatanTransaksi}
                        totalLabel="+ Total Catatan Transaksi"
                    />

                    <DynamicCatatanSection
                        title="Catatan Transaksi Power Box Group"
                        subtitle="Nominal pada bagian ini akan MENGURANGI total pembelian dan menjadi sumber pembagian fee bonus karyawan. Pilih nama karyawan di sini."
                        type="power_box"
                        items={form.catatan_power_box_items}
                        errors={errors}
                        disabled={isDetail}
                        karyawanSelectOptions={karyawanSelectOptions}
                        onAdd={() => handleAddCatatan("power_box")}
                        onRemove={(index) => handleRemoveCatatan("power_box", index)}
                        onChange={(index, field, value) => handleCatatanChange("power_box", index, field, value)}
                        total={totalCatatanPowerBox}
                        totalLabel="- Total Power Box Group"
                    />

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
                            placeholder="Ismawati"
                            error={errors.nama_ttd?.[0]}
                            disabled={isDetail}
                            required
                        />
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
                        {isDetail && pembelian && (
                            <button
                                type="button"
                                onClick={() => onPrint(pembelian)}
                                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-100 hover:bg-green-700"
                            >
                                Cetak PDF
                            </button>
                        )}

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
                                {saving ? "Menyimpan..." : isEdit ? "Update Pembelian" : "Simpan Pembelian"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

function DynamicCatatanSection({
    title,
    subtitle,
    type,
    items,
    errors,
    disabled,
    karyawanSelectOptions = [],
    onAdd,
    onRemove,
    onChange,
    total,
    totalLabel,
}) {
    const fieldPrefix = type === "transaksi" ? "catatan_transaksi_items" : "catatan_power_box_items";
    const isPowerBox = type === "power_box";

    return (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                <div>
                    <h4 className="font-black">{title}</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-300">{subtitle}</p>
                    {isPowerBox && (
                        <p className="mt-1 text-xs font-semibold text-blue-200">
                            Pilih satu atau lebih karyawan di Power Box Group. Nominal akan dibagi rata sesuai jumlah karyawan dan masuk ke bonus fee bulanan.
                        </p>
                    )}
                </div>

                {!disabled && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-blue-50"
                    >
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
                            {isPowerBox && <th className="min-w-80 px-4 py-3 font-black">Nama Karyawan</th>}
                            <th className="whitespace-nowrap px-4 py-3 font-black">Nominal</th>
                            {isPowerBox && <th className="whitespace-nowrap px-4 py-3 font-black">Nominal / Karyawan</th>}
                            {!disabled && <th className="whitespace-nowrap px-4 py-3 font-black">Aksi</th>}
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item, index) => {
                            const selectedKaryawanIds = normalizeKaryawanIds(item.karyawan_ids);
                            const selectedKaryawanOptions = karyawanSelectOptions.filter((option) =>
                                selectedKaryawanIds.includes(String(option.value))
                            );
                            const jumlahKaryawan = selectedKaryawanIds.length;
                            const nominalPerKaryawan = jumlahKaryawan > 0
                                ? roundMoney(toDecimal(item.nominal) / jumlahKaryawan)
                                : 0;

                            return (
                                <tr key={index} className="border-t border-slate-100 align-top">
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
                                            <p className="mt-2 text-xs font-bold text-red-600">
                                                {errors[`${fieldPrefix}.${index}.catatan`][0]}
                                            </p>
                                        )}
                                    </td>

                                    {isPowerBox && (
                                        <td className="px-4 py-3">
                                            <Select
                                                value={selectedKaryawanOptions}
                                                onChange={(selectedOptions) =>
                                                    onChange(
                                                        index,
                                                        "karyawan_ids",
                                                        Array.isArray(selectedOptions)
                                                            ? selectedOptions.map((option) => option.value)
                                                            : []
                                                    )
                                                }
                                                options={karyawanSelectOptions}
                                                isMulti
                                                isDisabled={disabled}
                                                closeMenuOnSelect={false}
                                                placeholder="Pilih karyawan..."
                                                noOptionsMessage={() => "Karyawan tidak ditemukan"}
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

                                            {jumlahKaryawan > 0 && (
                                                <p className="mt-2 text-xs font-bold text-blue-700">
                                                    {jumlahKaryawan} karyawan dipilih.
                                                </p>
                                            )}

                                            {errors[`${fieldPrefix}.${index}.karyawan_ids`]?.[0] && (
                                                <p className="mt-2 text-xs font-bold text-red-600">
                                                    {errors[`${fieldPrefix}.${index}.karyawan_ids`][0]}
                                                </p>
                                            )}
                                        </td>
                                    )}

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
                                            <p className="mt-2 text-xs font-bold text-red-600">
                                                {errors[`${fieldPrefix}.${index}.nominal`][0]}
                                            </p>
                                        )}
                                    </td>

                                    {isPowerBox && (
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="rounded-2xl bg-blue-50 px-4 py-3">
                                                <p className="text-xs font-black uppercase text-blue-600">Dibagi rata</p>
                                                <p className="mt-1 font-black text-slate-950">
                                                    Rp {formatRupiah(nominalPerKaryawan)}
                                                </p>
                                            </div>
                                        </td>
                                    )}

                                    {!disabled && (
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => onRemove(index)}
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

                    <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                            <td
                                colSpan={
                                    isPowerBox
                                        ? disabled ? 4 : 5
                                        : disabled ? 2 : 3
                                }
                                className="px-4 py-3 text-right font-black"
                            >
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

function TotalInfo({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-300">{label}</p>
            <p className="mt-2 text-lg font-black">Rp {formatRupiah(value)}</p>
        </div>
    );
}


function SelectInput({
    label,
    name,
    value,
    onChange,
    error,
    disabled = false,
    children,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <select
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
            >
                {children}
            </select>

            {error && <ErrorText text={error} />}
        </label>
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
                aria-invalid={Boolean(error)}
                className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:opacity-70 ${
                    error
                        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
            />

            {error && (
                <p className="mt-2 text-xs font-bold text-red-600">
                    {error}
                </p>
            )}
        </label>
    );
}

function generateNotaPrintHtml(pembelian) {
    const items = Array.isArray(pembelian.items) ? pembelian.items : [];

    const catatanTransaksiItems = Array.isArray(pembelian.catatan_transaksi_items)
        ? pembelian.catatan_transaksi_items
        : normalizeCatatanItems(null, pembelian.catatan_transaksi, pembelian.nilai_catatan_transaksi);

    const catatanPowerBoxItems = Array.isArray(pembelian.catatan_power_box_items)
        ? pembelian.catatan_power_box_items
        : normalizeCatatanItems(null, pembelian.catatan_power_box, pembelian.nilai_catatan_power_box);

    const subtotal = toDecimal(pembelian.subtotal);
    const totalTransaksi = sumCatatans(catatanTransaksiItems);
    const totalPowerBox = sumCatatans(catatanPowerBoxItems);
    const penyesuaian = toDecimal(pembelian.penyesuaian);
    const totalAkhir =
        toDecimal(pembelian.total_akhir) ||
        roundMoney(subtotal + totalTransaksi - totalPowerBox + penyesuaian);

    const productRows = items
        .map((item, index) => {
            const nama = escapeHtml(item.nama_barang || "-");
            const kode = item.kode_barang ? ` (${escapeHtml(item.kode_barang)})` : "";
            const jenis = escapeHtml(formatJenisBarang(item.jenis_barang));
            const qty = formatQty(item.qty || 0);
            const harga = formatRupiah(item.harga || 0);
            const total = formatRupiah(item.total || 0);

            return `
                <div class="item-block">
                    <div class="item-name">${index + 1}. ${nama}${kode}</div>

                    <div class="row small">
                        <span>${qty} Kg x Rp ${harga}</span>
                        <span>Rp ${total}</span>
                    </div>
                </div>
            `;
        })
        .join("");

    const catatanTransaksiRows = catatanTransaksiItems
        .filter((item) => item.catatan || toDecimal(item.nominal) > 0)
        .map((item, index) => `
            <div class="row small">
                <span>+ ${escapeHtml(item.catatan || `Catatan ${index + 1}`)}</span>
                <span>Rp ${formatRupiah(item.nominal || 0)}</span>
            </div>
        `)
        .join("");

    const catatanPowerBoxRows = catatanPowerBoxItems
        .filter((item) => item.catatan || toDecimal(item.nominal) > 0)
        .map((item, index) => {
            const karyawanText = buildKaryawanText(item);
            const selectedIds = normalizeKaryawanIds(item.karyawan_ids);
            const jumlahKaryawan = selectedIds.length || toInteger(item.jumlah_karyawan);
            const nominalPerKaryawan = jumlahKaryawan > 0
                ? (toDecimal(item.nominal_per_karyawan) || roundMoney(toDecimal(item.nominal) / jumlahKaryawan))
                : 0;

            return `
                <div class="row small">
                    <span>- ${escapeHtml(item.catatan || `Power Box ${index + 1}`)}${karyawanText ? `<br><small>${escapeHtml(karyawanText)}</small>` : ""}</span>
                    <span>Rp ${formatRupiah(item.nominal || 0)}</span>
                </div>
                ${jumlahKaryawan > 0 ? `
                    <div class="row small">
                        <span>  Fee dibagi ${jumlahKaryawan} karyawan</span>
                        <span>Rp ${formatRupiah(nominalPerKaryawan)} / org</span>
                    </div>
                ` : ""}
            `;
        })
        .join("");

    const catatanTambahan = pembelian.catatan
        ? `<div class="note"><strong>Catatan:</strong><br>${escapeHtml(pembelian.catatan)}</div>`
        : "";

    const kota = escapeHtml(pembelian.kota || "Kendal");
    const namaTtd = escapeHtml(pembelian.nama_ttd || "-");
    const tanggalTtd = formatDateIndonesia(pembelian.tanggal_ttd || pembelian.tanggal);

    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Nota ${escapeHtml(pembelian.nomor_nota || "")}</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 80mm;
                    background: #ffffff;
                    color: #000000;
                    font-family: "Courier New", Courier, monospace;
                    font-size: 10.5px;
                    line-height: 1.25;
                }
                .print-button {
                    display: block;
                    width: calc(100% - 8mm);
                    margin: 3mm 4mm 2mm;
                    padding: 8px;
                    border: 1px solid #000;
                    background: #fff;
                    color: #000;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    cursor: pointer;
                }
                .receipt { width: 80mm; max-width: 80mm; padding: 3mm 3mm 4mm; }
                .center { text-align: center; }
                .title { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
                .subtitle { font-size: 10px; margin-bottom: 2px; }
                .line { border-top: 1px dashed #000; margin: 6px 0; }
                .line-solid { border-top: 1px solid #000; margin: 6px 0; }
                .info-row, .row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 6px;
                    width: 100%;
                }
                .info-label { flex: 0 0 22mm; }
                .info-value { flex: 1; text-align: right; word-break: break-word; }
                .row span:first-child { flex: 1; min-width: 0; word-break: break-word; }
                .row span:last-child { flex: 0 0 auto; text-align: right; white-space: nowrap; }
                .small { font-size: 10px; }
                .section-title { text-align: center; font-weight: 700; margin: 6px 0 4px; text-transform: uppercase; }
                .item-block { margin-bottom: 5px; page-break-inside: avoid; }
                .item-name { font-weight: 700; word-break: break-word; margin-bottom: 1px; }
                .total-row { font-weight: 700; font-size: 11px; }
                .grand-total { font-weight: 700; font-size: 13px; }
                .note { margin-top: 6px; word-break: break-word; }
                .signature { margin-top: 14px; text-align: right; page-break-inside: avoid; }
                .signature-space { height: 24px; }
                .footer { margin-top: 10px; text-align: center; font-size: 10px; }
                @media print {
                    html, body { width: 80mm; }
                    .print-button { display: none !important; }
                    .receipt { width: 80mm; max-width: 80mm; padding: 2mm 3mm 3mm; }
                }
            </style>
        </head>
        <body>
            <button class="print-button" onclick="window.print()">Cetak / Save PDF</button>

            <div class="receipt">
                <div class="center">
                    <div class="title">NOTA PEMBELIAN</div>
                    <div class="subtitle">${escapeHtml(pembelian.nomor_nota || "-")}</div>
                </div>

                <div class="line-solid"></div>

                <div class="info-row">
                    <span class="info-label">Tanggal</span>
                    <span class="info-value">${formatDateIndonesia(pembelian.tanggal)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Supplier</span>
                    <span class="info-value">${escapeHtml(pembelian.nama_customer || pembelian.customer?.nama_customer || "-")}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Pembayaran</span>
                    <span class="info-value">${escapeHtml(pembelian.jenis_pembayaran_label || pembelian.metode_pembayaran || "-")}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Kota</span>
                    <span class="info-value">${kota}</span>
                </div>

                <div class="line"></div>
                <div class="section-title">Barang</div>
                ${productRows || '<div class="center small">Tidak ada barang</div>'}

                <div class="line"></div>
                <div class="row total-row">
                    <span>SUBTOTAL</span>
                    <span>Rp ${formatRupiah(subtotal)}</span>
                </div>

                ${catatanTransaksiRows ? `
                    <div class="line"></div>
                    <div class="section-title">Catatan Transaksi</div>
                    ${catatanTransaksiRows}
                    <div class="row total-row">
                        <span>Total Penambah</span>
                        <span>Rp ${formatRupiah(totalTransaksi)}</span>
                    </div>
                ` : ""}

                ${catatanPowerBoxRows ? `
                    <div class="line"></div>
                    <div class="section-title">Power Box Group</div>
                    ${catatanPowerBoxRows}
                    <div class="row total-row">
                        <span>Total Pengurang</span>
                        <span>Rp ${formatRupiah(totalPowerBox)}</span>
                    </div>
                ` : ""}

                ${penyesuaian !== 0 ? `
                    <div class="row total-row">
                        <span>Penyesuaian</span>
                        <span>Rp ${formatRupiah(penyesuaian)}</span>
                    </div>
                ` : ""}

                <div class="line-solid"></div>
                <div class="row grand-total">
                    <span>TOTAL AKHIR</span>
                    <span>Rp ${formatRupiah(totalAkhir)}</span>
                </div>
                <div class="line-solid"></div>

                ${catatanTambahan}

                <div class="signature">
                    <div>${kota}, ${tanggalTtd}</div>
                    <div class="signature-space"></div>
                    <div><strong>${namaTtd}</strong></div>
                </div>

                <div class="line"></div>
                <div class="footer">Terima kasih</div>
            </div>
        </body>
        </html>
    `;
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

    if (result?.message && result.message !== "validation.integer") {
        return result.message;
    }

    return "Validasi gagal. Cek Console browser pada RESPONSE ERROR dan PAYLOAD SIMPAN.";
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

    const cleaned = String(value)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

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

function formatJenisBarang(value) {
    if (value === "mentah") return "Barang Mentah";
    if (value === "jadi") return "Barang Jadi";
    return "-";
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

    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
        return stringValue.slice(0, 10);
    }

    const date = new Date(stringValue);

    if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
    }

    return today();
}

function normalizeCatatanItems(items, fallbackCatatan = "", fallbackNominal = 0) {
    if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => {
            const karyawans = Array.isArray(item.karyawans) ? item.karyawans : [];
            const karyawanIds = normalizeKaryawanIds(item.karyawan_ids).length > 0
                ? normalizeKaryawanIds(item.karyawan_ids)
                : normalizeKaryawanIds(karyawans.map((karyawan) => karyawan.id));

            return {
                catatan: item.catatan || "",
                nominal: toDecimal(item.nominal),
                karyawan_ids: karyawanIds,
                karyawans,
                jumlah_karyawan: toInteger(item.jumlah_karyawan) || karyawanIds.length,
                nominal_per_karyawan: toDecimal(item.nominal_per_karyawan),
            };
        });
    }

    if (fallbackCatatan || toDecimal(fallbackNominal) > 0) {
        return [
            {
                catatan: fallbackCatatan || "",
                nominal: toDecimal(fallbackNominal),
                karyawan_ids: [],
            },
        ];
    }

    return [{ ...emptyCatatan }];
}

function cleanCatatanItems(items, includeKaryawan = false) {
    return items
        .map((item) => {
            const nominal = Math.max(0, toDecimal(item.nominal));
            const karyawanIds = includeKaryawan ? normalizeKaryawanIds(item.karyawan_ids) : [];
            const jumlahKaryawan = karyawanIds.length;

            return {
                catatan: item.catatan || "",
                nominal,
                ...(includeKaryawan
                    ? {
                          karyawan_ids: karyawanIds,
                          nominal_per_karyawan: jumlahKaryawan > 0 ? roundMoney(nominal / jumlahKaryawan) : 0,
                      }
                    : {}),
            };
        })
        .filter((item) => item.catatan.trim() || item.nominal > 0 || (item.karyawan_ids || []).length > 0);
}

function normalizeKaryawanIds(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === "object" && item !== null) {
                    return String(item.id ?? item.value ?? "").trim();
                }

                return String(item).trim();
            })
            .filter(Boolean);
    }

    return [String(value).trim()].filter(Boolean);
}

function buildKaryawanText(item) {
    if (Array.isArray(item.karyawans) && item.karyawans.length > 0) {
        return item.karyawans
            .map((karyawan) => karyawan.nama || karyawan.name || "")
            .filter(Boolean)
            .join(", ");
    }

    if (Array.isArray(item.karyawan_names) && item.karyawan_names.length > 0) {
        return item.karyawan_names.filter(Boolean).join(", ");
    }

    return "";
}

function sumCatatans(items) {
    return roundMoney(items.reduce((sum, item) => sum + toDecimal(item.nominal), 0));
}

function summarizeJenis(items) {
    const totalMentah = items.filter((item) => item.jenis_barang === "mentah").length;
    const totalJadi = items.filter((item) => item.jenis_barang === "jadi").length;

    const parts = [];

    if (totalMentah > 0) parts.push(`${totalMentah} mentah`);
    if (totalJadi > 0) parts.push(`${totalJadi} jadi`);

    return parts.length > 0 ? parts.join(", ") : "-";
}

function buildStokText(barang) {
    const stokMentah = barang.stok_mentah ?? barang.stokMentah ?? undefined;
    const stokJadi = barang.stok_jadi ?? barang.stokJadi ?? undefined;

    const parts = [];

    if (stokMentah !== undefined && stokMentah !== null) {
        parts.push(`Mentah ${formatQty(stokMentah)} KG`);
    }

    if (stokJadi !== undefined && stokJadi !== null) {
        parts.push(`Jadi ${formatQty(stokJadi)} KG`);
    }

    return parts.length > 0 ? ` | Stok: ${parts.join(" / ")}` : "";
}
