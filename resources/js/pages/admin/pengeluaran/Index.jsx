import React, { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const endpoint = "/pengeluaran";
const paymentOptionsEndpoint = "/pengeluaran/payment-options";

const today = () => new Date().toISOString().slice(0, 10);

const emptyOpenForm = {
    tanggal: today(),
    catatan_buka: "",
    deposits: [
        {
            jenis_pembayaran_id: "",
            nominal: 0,
            catatan: "",
        },
    ],
};

const emptyItemForm = {
    jenis_pengeluaran: "",
    deskripsi: "",
    jenis_pembayaran_id: "",
    nominal: 0,
};

export default function PengeluaranIndexPage() {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const pengeluaransRef = useRef([]);

    const [pengeluarans, setPengeluarans] = useState([]);
    const [activePengeluaran, setActivePengeluaran] = useState(null);
    const [selectedPengeluaran, setSelectedPengeluaran] = useState(null);
    const [paymentOptions, setPaymentOptions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [openForm, setOpenForm] = useState(emptyOpenForm);
    const [itemForm, setItemForm] = useState(emptyItemForm);
    const [errors, setErrors] = useState({});

    const fetchPaymentOptions = async () => {
        try {
            const response = await fetch(paymentOptionsEndpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal mengambil jenis pembayaran."
                );
            }

            const data = result.data || [];
            setPaymentOptions(data);

            const cashOption = data.find((item) => item.is_cash) || data[0];

            setOpenForm((prev) => ({
                ...prev,
                deposits:
                    prev.deposits?.length > 0
                        ? prev.deposits
                        : [
                              {
                                  jenis_pembayaran_id: cashOption?.id || "",
                                  nominal: 0,
                                  catatan: "",
                              },
                          ],
            }));

            setItemForm((prev) => ({
                ...prev,
                jenis_pembayaran_id:
                    prev.jenis_pembayaran_id || cashOption?.id || "",
            }));
        } catch (error) {
            console.error("Error jenis pembayaran:", error);
            alert(error.message || "Gagal mengambil jenis pembayaran.");
        }
    };

    const fetchPengeluaran = async () => {
        try {
            setLoading(true);

            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal mengambil data mutasi transaksi."
                );
            }

            const data = result.data || [];

            setPengeluarans(data);
            pengeluaransRef.current = data;
            setActivePengeluaran(result.active || null);
        } catch (error) {
            console.error("Error mutasi transaksi:", error);
            alert(error.message || "Gagal mengambil data mutasi transaksi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentOptions();
        fetchPengeluaran();
    }, []);

    useEffect(() => {
        pengeluaransRef.current = pengeluarans;
    }, [pengeluarans]);

    const mutasiRows = useMemo(() => {
        return pengeluarans.flatMap((pengeluaran) => {
            const items = Array.isArray(pengeluaran.items) ? pengeluaran.items : [];
            const deposits = Array.isArray(pengeluaran.deposits) ? pengeluaran.deposits : [];

            const depositRows = deposits.map((deposit) => {
                const jenisMutasi = getJenisDepositMutasi(deposit);
                const deskripsi = getDeskripsiDepositMutasi(deposit);

                return {
                    row_id: `deposit-${deposit.id || `${pengeluaran.id}-${deposit.jenis_pembayaran_id}`}`,
                    pengeluaran_id: pengeluaran.id,
                    item_id: null,
                    deposit_id: deposit.id || null,
                    tanggal: pengeluaran.tanggal,
                    status: pengeluaran.status,
                    tipe_mutasi: "Masuk",
                    jenis_mutasi: jenisMutasi,
                    jenis_pengeluaran: jenisMutasi,
                    deskripsi,
                    jenis_pembayaran_id: deposit.jenis_pembayaran_id || null,
                    jenis_pembayaran_label: deposit.jenis_pembayaran_label || deposit.kode || "-",
                    metode_pembayaran: deposit.kode || deposit.jenis_pembayaran_label || "-",
                    nominal_masuk: deposit.nominal,
                    nominal_masuk_format: deposit.nominal_format,
                    nominal_keluar: 0,
                    nominal_keluar_format: formatRupiahWithPrefix(0),
                    nominal: deposit.nominal,
                    nominal_format: deposit.nominal_format,
                    total_deposit: pengeluaran.total_deposit,
                    total_deposit_format: pengeluaran.total_deposit_format,
                    total_pengeluaran: pengeluaran.total_pengeluaran,
                    total_pengeluaran_format: pengeluaran.total_pengeluaran_format,
                    sisa_total: pengeluaran.sisa_total,
                    sisa_total_format: pengeluaran.sisa_total_format,
                    total_cash: pengeluaran.total_cash,
                    total_tf: pengeluaran.total_tf,
                    source_type: deposit.source_type || null,
                    source_id: deposit.source_id || null,
                    created_at: deposit.created_at || null,
                    is_empty: false,
                    is_deposit: true,
                };
            });

            const itemRows = items.map((item) => {
                const jenisMutasi = getJenisItemMutasi(item);

                return {
                    row_id: `item-${item.id || `${pengeluaran.id}-${item.created_at || Math.random()}`}`,
                    pengeluaran_id: pengeluaran.id,
                    item_id: item.id || null,
                    deposit_id: null,
                    tanggal: pengeluaran.tanggal,
                    status: pengeluaran.status,
                    tipe_mutasi: "Keluar",
                    jenis_mutasi: jenisMutasi,
                    jenis_pengeluaran: jenisMutasi,
                    deskripsi: item.deskripsi || "-",
                    jenis_pembayaran_id: item.jenis_pembayaran_id || null,
                    jenis_pembayaran_label: item.jenis_pembayaran_label || item.metode_pembayaran || "-",
                    metode_pembayaran: item.metode_pembayaran || "-",
                    nominal_masuk: 0,
                    nominal_masuk_format: formatRupiahWithPrefix(0),
                    nominal_keluar: item.nominal,
                    nominal_keluar_format: item.nominal_format,
                    nominal: item.nominal,
                    nominal_format: item.nominal_format,
                    total_deposit: pengeluaran.total_deposit,
                    total_deposit_format: pengeluaran.total_deposit_format,
                    total_pengeluaran: pengeluaran.total_pengeluaran,
                    total_pengeluaran_format: pengeluaran.total_pengeluaran_format,
                    sisa_total: pengeluaran.sisa_total,
                    sisa_total_format: pengeluaran.sisa_total_format,
                    total_cash: pengeluaran.total_cash,
                    total_tf: pengeluaran.total_tf,
                    source_type: item.source_type || null,
                    source_id: item.source_id || null,
                    created_at: item.created_at || null,
                    is_empty: false,
                    is_deposit: false,
                };
            });

            const rows = [...depositRows, ...itemRows];

            if (rows.length === 0) {
                return [
                    {
                        row_id: `${pengeluaran.id}-empty`,
                        pengeluaran_id: pengeluaran.id,
                        item_id: null,
                        deposit_id: null,
                        tanggal: pengeluaran.tanggal,
                        status: pengeluaran.status,
                        tipe_mutasi: "-",
                        jenis_mutasi: "Belum ada mutasi transaksi",
                        jenis_pengeluaran: "Belum ada mutasi transaksi",
                        deskripsi: "-",
                        jenis_pembayaran_label: "-",
                        metode_pembayaran: "-",
                        nominal_masuk: 0,
                        nominal_masuk_format: formatRupiahWithPrefix(0),
                        nominal_keluar: 0,
                        nominal_keluar_format: formatRupiahWithPrefix(0),
                        nominal: 0,
                        nominal_format: formatRupiahWithPrefix(0),
                        total_deposit: pengeluaran.total_deposit,
                        total_deposit_format: pengeluaran.total_deposit_format,
                        total_pengeluaran: pengeluaran.total_pengeluaran,
                        total_pengeluaran_format: pengeluaran.total_pengeluaran_format,
                        sisa_total: pengeluaran.sisa_total,
                        sisa_total_format: pengeluaran.sisa_total_format,
                        total_cash: pengeluaran.total_cash,
                        total_tf: pengeluaran.total_tf,
                        is_empty: true,
                    },
                ];
            }

            return rows;
        });
    }, [pengeluarans]);

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
            dataTableRef.current = null;
        }

        dataTableRef.current = new DataTable(tableRef.current, {
            data: mutasiRows,
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50, 100],
            order: [[0, "desc"]],
            rowId: "row_id",
            columns: [
                {
                    data: "tanggal",
                    title: "Tanggal",
                    render: function (data) {
                        return `<span class="font-black text-slate-950">${formatDateIndonesia(data)}</span>`;
                    },
                },
                {
                    data: "status",
                    title: "Status",
                    render: function (data) {
                        const label = data === "open" ? "Open" : "Closed";
                        const cls =
                            data === "open"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-700";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${cls}">${label}</span>`;
                    },
                },
                {
                    data: "tipe_mutasi",
                    title: "Tipe",
                    render: function (data, type, row) {
                        if (row.is_empty) {
                            return `<span class="font-black text-slate-400">-</span>`;
                        }

                        const isMasuk = data === "Masuk";
                        const cls = isMasuk
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${cls}">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "jenis_mutasi",
                    title: "Jenis",
                    render: function (data, type, row) {
                        const cls = row.is_empty ? "text-slate-400" : "text-slate-950";
                        return `<span class="font-black ${cls}">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "deskripsi",
                    title: "Deskripsi",
                    render: function (data) {
                        return `<span class="font-semibold text-slate-600">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "jenis_pembayaran_label",
                    title: "Pembayaran",
                    render: function (data, type, row) {
                        const metode = String(row.metode_pembayaran || data || "").toLowerCase();
                        const cls = metode.includes("cash")
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700";

                        return `<span class="rounded-full px-3 py-1 text-xs font-black ${cls}">${escapeHtml(data || "-")}</span>`;
                    },
                },
                {
                    data: "nominal_masuk",
                    title: "Masuk",
                    render: function (data, type, row) {
                        return `<span class="font-black text-green-700">${escapeHtml(row.nominal_masuk_format || formatRupiahWithPrefix(data || 0))}</span>`;
                    },
                },
                {
                    data: "nominal_keluar",
                    title: "Keluar",
                    render: function (data, type, row) {
                        return `<span class="font-black text-red-700">${escapeHtml(row.nominal_keluar_format || formatRupiahWithPrefix(data || 0))}</span>`;
                    },
                },
                {
                    data: "total_deposit",
                    title: "Total Limit",
                    render: function (data, type, row) {
                        return `<span class="font-black text-blue-700">${escapeHtml(row.total_deposit_format || formatRupiahWithPrefix(data || 0))}</span>`;
                    },
                },
                {
                    data: "total_pengeluaran",
                    title: "Total Keluar",
                    render: function (data, type, row) {
                        return `<span class="font-black text-red-700">${escapeHtml(row.total_pengeluaran_format || formatRupiahWithPrefix(data || 0))}</span>`;
                    },
                },
                {
                    data: "sisa_total",
                    title: "Sisa Total",
                    render: function (data, type, row) {
                        return `<span class="font-black text-slate-950">${escapeHtml(row.sisa_total_format || formatRupiahWithPrefix(data || 0))}</span>`;
                    },
                },
                {
                    data: null,
                    title: "Aksi",
                    orderable: false,
                    searchable: false,
                    render: function (data, type, row) {
                        const deleteButton = row.item_id && row.status === "open"
                            ? `
                                <button
                                    type="button"
                                    data-id="${escapeHtml(row.pengeluaran_id)}"
                                    data-item-id="${escapeHtml(row.item_id)}"
                                    class="btn-delete-mutasi-item rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200"
                                >
                                    Hapus Item
                                </button>
                            `
                            : "";

                        return `
                            <button
                                type="button"
                                data-id="${escapeHtml(row.pengeluaran_id)}"
                                class="btn-detail-pengeluaran mr-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                            >
                                Detail Rekap
                            </button>

                            <button
                                type="button"
                                data-id="${escapeHtml(row.pengeluaran_id)}"
                                class="btn-print-pengeluaran mr-2 rounded-xl bg-green-100 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-200"
                            >
                                Cetak Rekap
                            </button>

                            ${deleteButton}
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
    }, [mutasiRows]);

    useEffect(() => {
        const tableElement = tableRef.current;

        if (!tableElement) return;

        const handleTableClick = (event) => {
            const detailButton = event.target.closest(
                ".btn-detail-pengeluaran"
            );
            const printButton = event.target.closest(".btn-print-pengeluaran");
            const deleteItemButton = event.target.closest(
                ".btn-delete-mutasi-item"
            );

            const button = detailButton || printButton || deleteItemButton;

            if (!button) return;

            const id = String(button.dataset.id || "");
            const pengeluaran = pengeluaransRef.current.find(
                (item) => String(item.id) === id
            );

            if (!pengeluaran) {
                alert("Data mutasi transaksi tidak ditemukan. Silakan refresh halaman.");
                return;
            }

            if (detailButton) {
                setSelectedPengeluaran(pengeluaran);
            }

            if (printButton) {
                handlePrint(pengeluaran);
            }

            if (deleteItemButton) {
                const itemId = String(deleteItemButton.dataset.itemId || "");
                const item = (pengeluaran.items || []).find(
                    (currentItem) => String(currentItem.id) === itemId
                );

                if (!item) {
                    alert("Item mutasi transaksi tidak ditemukan. Silakan refresh halaman.");
                    return;
                }

                handleDeleteItem(item, pengeluaran);
            }
        };

        tableElement.addEventListener("click", handleTableClick);

        return () => {
            tableElement.removeEventListener("click", handleTableClick);
        };
    }, []);

    const activeTotals = useMemo(() => {
        if (!activePengeluaran) {
            return {
                total_deposit: 0,
                total_pengeluaran: 0,
                sisa_total: 0,
                total_cash: 0,
                total_tf: 0,
                sisa_cash: 0,
            };
        }

        return {
            total_deposit: toDecimal(activePengeluaran.total_deposit),
            total_pengeluaran: toDecimal(activePengeluaran.total_pengeluaran),
            sisa_total: toDecimal(activePengeluaran.sisa_total),
            total_cash: toDecimal(activePengeluaran.total_cash),
            total_tf: toDecimal(activePengeluaran.total_tf),
            sisa_cash: toDecimal(activePengeluaran.sisa_cash),
        };
    }, [activePengeluaran]);

    const handleOpenChange = (event) => {
        const { name, value } = event.target;

        setOpenForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDepositChange = (index, field, value) => {
        setOpenForm((prev) => {
            const deposits = [...prev.deposits];

            deposits[index] = {
                ...deposits[index],
                [field]:
                    field === "nominal" ? decimalInputValue(value) : value,
            };

            return {
                ...prev,
                deposits,
            };
        });
    };

    const handleAddDepositRow = () => {
        setOpenForm((prev) => ({
            ...prev,
            deposits: [
                ...prev.deposits,
                {
                    jenis_pembayaran_id: "",
                    nominal: 0,
                    catatan: "",
                },
            ],
        }));
    };

    const handleRemoveDepositRow = (index) => {
        setOpenForm((prev) => {
            const deposits = prev.deposits.filter((_, itemIndex) => {
                return itemIndex !== index;
            });

            return {
                ...prev,
                deposits:
                    deposits.length > 0
                        ? deposits
                        : [
                              {
                                  jenis_pembayaran_id: "",
                                  nominal: 0,
                                  catatan: "",
                              },
                          ],
            };
        });
    };

    const handleItemChange = (event) => {
        const { name, value, type } = event.target;

        setItemForm((prev) => ({
            ...prev,
            [name]: type === "number" ? decimalInputValue(value) : value,
        }));
    };

    const handleOpenKasir = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setErrors({});

            const cleanedDeposits = openForm.deposits
                .map((deposit) => ({
                    jenis_pembayaran_id: deposit.jenis_pembayaran_id,
                    nominal: toDecimal(deposit.nominal),
                    catatan: deposit.catatan || "",
                }))
                .filter((deposit) => deposit.jenis_pembayaran_id);

            if (cleanedDeposits.length === 0) {
                throw new Error("Minimal satu jenis pembayaran wajib diisi.");
            }

            const payload = {
                tanggal: normalizeDateInput(openForm.tanggal),
                catatan_buka: openForm.catatan_buka || "",
                deposits: cleanedDeposits,
            };

            const response = await fetch(endpoint, {
                method: "POST",
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

            setOpenForm(emptyOpenForm);
            await fetchPengeluaran();
        } catch (error) {
            console.error("Error buka kasir:", error);
            alert(error.message || "Gagal membuka kasir.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = async (event) => {
        event.preventDefault();

        if (!activePengeluaran) {
            alert("Buka kasir terlebih dahulu.");
            return;
        }

        try {
            setSaving(true);
            setErrors({});

            const payload = {
                jenis_pengeluaran: itemForm.jenis_pengeluaran,
                deskripsi: itemForm.deskripsi || "",
                jenis_pembayaran_id: itemForm.jenis_pembayaran_id,
                nominal: toDecimal(itemForm.nominal),
            };

            const response = await fetch(
                `${endpoint}/${activePengeluaran.id}/items`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await safeJson(response);

            if (!response.ok) {
                setErrors(result.errors || {});
                throw new Error(buildValidationMessage(result));
            }

            setItemForm({
                ...emptyItemForm,
                jenis_pembayaran_id: itemForm.jenis_pembayaran_id,
            });

            await fetchPengeluaran();
        } catch (error) {
            console.error("Error tambah mutasi transaksi:", error);
            alert(error.message || "Gagal menambah mutasi transaksi.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (item, pengeluaranTarget = null) => {
        const targetPengeluaran = pengeluaranTarget || activePengeluaran;

        if (!targetPengeluaran) return;

        const confirmed = window.confirm(
            `Hapus mutasi transaksi "${item.jenis_pengeluaran}"?`
        );

        if (!confirmed) return;

        try {
            setSaving(true);

            const response = await fetch(
                `${endpoint}/${targetPengeluaran.id}/items/${item.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                }
            );

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal menghapus mutasi transaksi."
                );
            }

            await fetchPengeluaran();
        } catch (error) {
            console.error("Error hapus item:", error);
            alert(error.message || "Gagal menghapus mutasi transaksi.");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseKasir = async () => {
        if (!activePengeluaran) return;

        const catatanTutup = window.prompt(
            "Catatan tutup toko/kasir (opsional):",
            ""
        );

        if (catatanTutup === null) return;

        const confirmed = window.confirm(
            `Tutup toko tanggal ${formatDateIndonesia(
                activePengeluaran.tanggal
            )}?\n\nSisa total: ${formatRupiahWithPrefix(
                activeTotals.sisa_total
            )}`
        );

        if (!confirmed) return;

        try {
            setSaving(true);

            const response = await fetch(
                `${endpoint}/${activePengeluaran.id}/close`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                    },
                    body: JSON.stringify({
                        catatan_tutup: catatanTutup || "",
                    }),
                }
            );

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menutup toko.");
            }

            handlePrint(result.data);
            await fetchPengeluaran();
        } catch (error) {
            console.error("Error tutup kasir:", error);
            alert(error.message || "Gagal menutup toko.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePengeluaran = async (pengeluaran) => {
        const confirmed = window.confirm(
            `Hapus data mutasi transaksi tanggal ${formatDateIndonesia(
                pengeluaran.tanggal
            )}?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${endpoint}/${pengeluaran.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal menghapus data mutasi transaksi."
                );
            }

            await fetchPengeluaran();
        } catch (error) {
            console.error("Error hapus mutasi transaksi:", error);
            alert(error.message || "Gagal menghapus data mutasi transaksi.");
        }
    };

    const handlePrint = (pengeluaran) => {
        const printWindow = window.open("", "_blank", "width=1200,height=900");

        if (!printWindow) {
            alert("Popup diblokir browser. Izinkan popup untuk mencetak / menyimpan PDF.");
            return;
        }

        printWindow.document.open();
        printWindow.document.write(generateRekapPrintHtml(pengeluaran));
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
            }, 500);
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
                                    Operasional Harian
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Mutasi Transaksi
                                </h3>

                                <p className="mt-1 text-sm font-semibold text-blue-100">
                                    Buka kasir, input limit per jenis pembayaran,
                                    catat mutasi transaksi, lalu tutup toko untuk
                                    rekap harian.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchPengeluaran}
                                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50"
                            >
                                {loading ? "Memuat..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {!activePengeluaran ? (
                            <OpenKasirForm
                                form={openForm}
                                errors={errors}
                                saving={saving}
                                paymentOptions={paymentOptions}
                                onChange={handleOpenChange}
                                onDepositChange={handleDepositChange}
                                onAddDepositRow={handleAddDepositRow}
                                onRemoveDepositRow={handleRemoveDepositRow}
                                onSubmit={handleOpenKasir}
                            />
                        ) : (
                            <ActiveKasirPanel
                                activePengeluaran={activePengeluaran}
                                totals={activeTotals}
                                itemForm={itemForm}
                                errors={errors}
                                saving={saving}
                                paymentOptions={paymentOptions}
                                onItemChange={handleItemChange}
                                onAddItem={handleAddItem}
                                onDeleteItem={handleDeleteItem}
                                onCloseKasir={handleCloseKasir}
                                onPrint={() => handlePrint(activePengeluaran)}
                            />
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-6">
                        <h4 className="text-xl font-black text-slate-950">
                            Riwayat Rekap Mutasi Transaksi
                        </h4>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Semua detail mutasi transaksi ditampilkan di sini,
                            termasuk uang masuk dari deposit/penjualan dan uang keluar dari pembelian, borongan, atau mutasi manual.
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 p-4">
                            <div className="overflow-x-auto">
                                <table
                                    ref={tableRef}
                                    className="display w-full text-left text-sm"
                                >
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Status</th>
                                            <th>Tipe</th>
                                            <th>Jenis</th>
                                            <th>Deskripsi</th>
                                            <th>Pembayaran</th>
                                            <th>Masuk</th>
                                            <th>Keluar</th>
                                            <th>Total Limit</th>
                                            <th>Total Keluar</th>
                                            <th>Sisa Total</th>
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

            {selectedPengeluaran && (
                <DetailModal
                    pengeluaran={selectedPengeluaran}
                    onClose={() => setSelectedPengeluaran(null)}
                    onPrint={() => handlePrint(selectedPengeluaran)}
                />
            )}
        </>
    );
}

function OpenKasirForm({
    form,
    errors,
    saving,
    paymentOptions,
    onChange,
    onDepositChange,
    onAddDepositRow,
    onRemoveDepositRow,
    onSubmit,
}) {
    return (
        <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
        >
            <div className="mb-5">
                <h4 className="text-xl font-black text-slate-950">
                    Buka Kasir Hari Ini
                </h4>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                    Masukkan limit atau deposit awal untuk setiap jenis
                    pembayaran. Contoh: Cash, TF BCA, TF BRI.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Tanggal"
                    name="tanggal"
                    type="date"
                    value={form.tanggal}
                    onChange={onChange}
                    error={errors.tanggal?.[0]}
                />

                <Input
                    label="Catatan Buka"
                    name="catatan_buka"
                    value={form.catatan_buka}
                    onChange={onChange}
                    error={errors.catatan_buka?.[0]}
                    placeholder="Opsional"
                />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h5 className="text-lg font-black text-slate-950">
                            Limit / Deposit Pembayaran
                        </h5>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Satu jenis pembayaran hanya boleh dipilih satu kali.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onAddDepositRow}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                    >
                        + Tambah Jenis Pembayaran
                    </button>
                </div>

                <div className="space-y-3">
                    {form.deposits.map((deposit, index) => (
                        <div
                            key={index}
                            className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                            <Select
                                label="Jenis Pembayaran"
                                value={deposit.jenis_pembayaran_id}
                                onChange={(event) =>
                                    onDepositChange(
                                        index,
                                        "jenis_pembayaran_id",
                                        event.target.value
                                    )
                                }
                                error={
                                    errors[`deposits.${index}.jenis_pembayaran_id`]?.[0]
                                }
                            >
                                <option value="">Pilih pembayaran</option>
                                {paymentOptions.map((payment) => (
                                    <option key={payment.id} value={payment.id}>
                                        {payment.nama}
                                    </option>
                                ))}
                            </Select>

                            <Input
                                label="Limit / Deposit"
                                type="number"
                                value={deposit.nominal}
                                onChange={(event) =>
                                    onDepositChange(
                                        index,
                                        "nominal",
                                        event.target.value
                                    )
                                }
                                error={errors[`deposits.${index}.nominal`]?.[0]}
                                placeholder="Contoh: 500000"
                            />

                            <Input
                                label="Catatan"
                                value={deposit.catatan}
                                onChange={(event) =>
                                    onDepositChange(
                                        index,
                                        "catatan",
                                        event.target.value
                                    )
                                }
                                error={errors[`deposits.${index}.catatan`]?.[0]}
                                placeholder="Opsional"
                            />

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => onRemoveDepositRow(index)}
                                    className="w-full rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-200"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-5 flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Membuka..." : "Buka Kasir"}
                </button>
            </div>
        </form>
    );
}

function ActiveKasirPanel({
    activePengeluaran,
    totals,
    itemForm,
    errors,
    saving,
    paymentOptions,
    onItemChange,
    onAddItem,
    onDeleteItem,
    onCloseKasir,
    onPrint,
}) {
    const items = Array.isArray(activePengeluaran.items)
        ? activePengeluaran.items
        : [];

    const deposits = Array.isArray(activePengeluaran.deposits)
        ? activePengeluaran.deposits
        : [];

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
                            Kasir Aktif
                        </p>

                        <h4 className="mt-1 text-xl font-black text-slate-950">
                            {formatDateIndonesia(activePengeluaran.tanggal)}
                        </h4>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Dibuka: {activePengeluaran.opened_at || "-"}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={onPrint}
                            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-green-700 shadow-sm hover:bg-green-100"
                        >
                            Cetak Sementara
                        </button>

                        <button
                            type="button"
                            onClick={onCloseKasir}
                            disabled={saving}
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:opacity-60"
                        >
                            Tutup Toko
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard
                        label="Total Limit"
                        value={totals.total_deposit}
                        info
                    />
                    <SummaryCard
                        label="Total Keluar"
                        value={totals.total_pengeluaran}
                        danger
                    />
                    <SummaryCard
                        label="Sisa Total"
                        value={totals.sisa_total}
                        strong
                    />
                    <SummaryCard
                        label="Cash Keluar"
                        value={totals.total_cash}
                        danger
                    />
                    <SummaryCard
                        label="Transfer Keluar"
                        value={totals.total_tf}
                        info
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                    <h4 className="font-black">Limit Per Jenis Pembayaran</h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700">
                                <th className="whitespace-nowrap px-4 py-3 font-black">
                                    Pembayaran
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-black">
                                    Limit
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-black">
                                    Terpakai
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 font-black">
                                    Sisa
                                </th>
                                <th className="min-w-72 px-4 py-3 font-black">
                                    Catatan
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {deposits.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-6 text-center font-semibold text-slate-500"
                                    >
                                        Belum ada limit pembayaran.
                                    </td>
                                </tr>
                            ) : (
                                deposits.map((deposit) => (
                                    <tr
                                        key={deposit.id}
                                        className="border-t border-slate-100"
                                    >
                                        <td className="px-4 py-3 font-black text-slate-950">
                                            {deposit.jenis_pembayaran_label || "-"}
                                        </td>
                                        <td className="px-4 py-3 font-black text-blue-700">
                                            {deposit.nominal_format ||
                                                formatRupiahWithPrefix(
                                                    deposit.nominal
                                                )}
                                        </td>
                                        <td className="px-4 py-3 font-black text-red-700">
                                            {deposit.total_pengeluaran_format ||
                                                formatRupiahWithPrefix(
                                                    deposit.total_pengeluaran
                                                )}
                                        </td>
                                        <td className="px-4 py-3 font-black text-slate-950">
                                            {deposit.sisa_format ||
                                                formatRupiahWithPrefix(
                                                    deposit.sisa
                                                )}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-600">
                                            {deposit.catatan || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <form
                onSubmit={onAddItem}
                className="rounded-3xl border border-slate-200 p-5"
            >
                <div className="mb-5">
                    <h4 className="text-xl font-black text-slate-950">
                        Input Mutasi Transaksi
                    </h4>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        Pilih jenis pembayaran sesuai sumber dana. Nominal
                        mutasi transaksi akan mengurangi sisa limit pembayaran
                        tersebut.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Input
                        label="Jenis Mutasi Transaksi"
                        name="jenis_pengeluaran"
                        value={itemForm.jenis_pengeluaran}
                        onChange={onItemChange}
                        error={errors.jenis_pengeluaran?.[0]}
                        placeholder="Contoh: Belanja, Transport, Makan, Operasional"
                    />

                    <Input
                        label="Deskripsi"
                        name="deskripsi"
                        value={itemForm.deskripsi}
                        onChange={onItemChange}
                        error={errors.deskripsi?.[0]}
                        placeholder="Opsional"
                    />

                    <Select
                        label="Pembayaran"
                        name="jenis_pembayaran_id"
                        value={itemForm.jenis_pembayaran_id}
                        onChange={onItemChange}
                        error={errors.jenis_pembayaran_id?.[0]}
                    >
                        <option value="">Pilih pembayaran</option>
                        {paymentOptions.map((payment) => (
                            <option key={payment.id} value={payment.id}>
                                {payment.nama}
                            </option>
                        ))}
                    </Select>

                    <Input
                        label="Nominal"
                        name="nominal"
                        type="number"
                        value={itemForm.nominal}
                        onChange={onItemChange}
                        error={errors.nominal?.[0]}
                        placeholder="Contoh: 25000"
                    />

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? "Menyimpan..." : "+ Tambah"}
                        </button>
                    </div>
                </div>
            </form>

        </div>
    );
}

function DetailModal({ pengeluaran, onClose, onPrint }) {
    const items = Array.isArray(pengeluaran.items) ? pengeluaran.items : [];
    const deposits = Array.isArray(pengeluaran.deposits)
        ? pengeluaran.deposits
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Rekap Mutasi Transaksi
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {formatDateIndonesia(pengeluaran.tanggal)}
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <SummaryCard
                            label="Total Limit"
                            value={pengeluaran.total_deposit}
                            info
                        />
                        <SummaryCard
                            label="Total Keluar"
                            value={pengeluaran.total_pengeluaran}
                            danger
                        />
                        <SummaryCard
                            label="Sisa Total"
                            value={pengeluaran.sisa_total}
                            strong
                        />
                        <SummaryCard
                            label="Cash Keluar"
                            value={pengeluaran.total_cash}
                            danger
                        />
                        <SummaryCard
                            label="Transfer Keluar"
                            value={pengeluaran.total_tf}
                            info
                        />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="bg-slate-950 px-5 py-4 text-white">
                            <h4 className="font-black">
                                Limit Per Jenis Pembayaran
                            </h4>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700">
                                    <th className="px-4 py-3 font-black">
                                        Pembayaran
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Limit
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Terpakai
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Sisa
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {deposits.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            className="px-4 py-5 text-center font-semibold text-slate-500"
                                        >
                                            Tidak ada data limit pembayaran.
                                        </td>
                                    </tr>
                                ) : (
                                    deposits.map((deposit) => (
                                        <tr
                                            key={deposit.id}
                                            className="border-t border-slate-100"
                                        >
                                            <td className="px-4 py-3 font-black">
                                                {deposit.jenis_pembayaran_label ||
                                                    "-"}
                                            </td>
                                            <td className="px-4 py-3 font-black text-blue-700">
                                                {deposit.nominal_format ||
                                                    formatRupiahWithPrefix(
                                                        deposit.nominal
                                                    )}
                                            </td>
                                            <td className="px-4 py-3 font-black text-red-700">
                                                {deposit.total_pengeluaran_format ||
                                                    formatRupiahWithPrefix(
                                                        deposit.total_pengeluaran
                                                    )}
                                            </td>
                                            <td className="px-4 py-3 font-black">
                                                {deposit.sisa_format ||
                                                    formatRupiahWithPrefix(
                                                        deposit.sisa
                                                    )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                        <div className="bg-slate-950 px-5 py-4 text-white">
                            <h4 className="font-black">Detail Mutasi Transaksi</h4>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700">
                                    <th className="px-4 py-3 font-black">No</th>
                                    <th className="px-4 py-3 font-black">
                                        Jenis
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Deskripsi
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Pembayaran
                                    </th>
                                    <th className="px-4 py-3 font-black">
                                        Nominal
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-4 py-5 text-center font-semibold text-slate-500"
                                        >
                                            Belum ada mutasi transaksi.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, index) => (
                                        <tr
                                            key={item.id || index}
                                            className="border-t border-slate-100"
                                        >
                                            <td className="px-4 py-3 font-black">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-black">
                                                {item.jenis_pengeluaran}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.deskripsi || "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.jenis_pembayaran_label ||
                                                    item.metode_pembayaran ||
                                                    "-"}
                                            </td>
                                            <td className="px-4 py-3 font-black">
                                                {item.nominal_format ||
                                                    formatRupiahWithPrefix(
                                                        item.nominal
                                                    )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                            Tutup
                        </button>

                        <button
                            type="button"
                            onClick={onPrint}
                            className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700"
                        >
                            Cetak Rekap
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    danger = false,
    info = false,
    strong = false,
}) {
    let className =
        "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100";

    if (danger) {
        className =
            "rounded-2xl bg-red-50 p-4 shadow-sm ring-1 ring-red-100";
    }

    if (info) {
        className =
            "rounded-2xl bg-blue-50 p-4 shadow-sm ring-1 ring-blue-100";
    }

    if (strong) {
        className = "rounded-2xl bg-slate-950 p-4 text-white shadow-sm";
    }

    return (
        <div className={className}>
            <p
                className={`text-xs font-black uppercase tracking-wide ${
                    strong ? "text-slate-300" : "text-slate-500"
                }`}
            >
                {label}
            </p>

            <p className="mt-2 text-xl font-black">
                {formatRupiahWithPrefix(value)}
            </p>
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
                step={type === "number" ? "0.01" : undefined}
                inputMode={type === "number" ? "decimal" : undefined}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
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

function generateRekapPrintHtml(pengeluaran) {
    const items = Array.isArray(pengeluaran.items) ? pengeluaran.items : [];
    const deposits = Array.isArray(pengeluaran.deposits)
        ? pengeluaran.deposits
        : [];

    const depositRows = deposits
        .map((deposit, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(deposit.jenis_pembayaran_label || "-")}</td>
                    <td class="text-right">${escapeHtml(
                        deposit.nominal_format ||
                            formatRupiahWithPrefix(deposit.nominal)
                    )}</td>
                    <td class="text-right">${escapeHtml(
                        deposit.total_pengeluaran_format ||
                            formatRupiahWithPrefix(deposit.total_pengeluaran)
                    )}</td>
                    <td class="text-right">${escapeHtml(
                        deposit.sisa_format ||
                            formatRupiahWithPrefix(deposit.sisa)
                    )}</td>
                    <td>${escapeHtml(deposit.catatan || "-")}</td>
                </tr>
            `;
        })
        .join("");

    const itemRows = items
        .map((item, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(item.jenis_pengeluaran || "-")}</td>
                    <td>${escapeHtml(item.deskripsi || "-")}</td>
                    <td>${escapeHtml(
                        item.jenis_pembayaran_label ||
                            item.metode_pembayaran ||
                            "-"
                    )}</td>
                    <td class="text-right">${escapeHtml(
                        item.nominal_format ||
                            formatRupiahWithPrefix(item.nominal || 0)
                    )}</td>
                    <td>${escapeHtml(item.created_at || "-")}</td>
                </tr>
            `;
        })
        .join("");

    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <title>Laporan Rekap Mutasi Transaksi ${escapeHtml(
                pengeluaran.tanggal || ""
            )}</title>

            <style>
                @page {
                    size: A4 portrait;
                    margin: 14mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    color: #111827;
                    background: #ffffff;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                    line-height: 1.45;
                }

                .print-actions {
                    margin-bottom: 16px;
                    display: flex;
                    gap: 8px;
                }

                .print-actions button {
                    border: 0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .btn-primary {
                    background: #2563eb;
                    color: white;
                }

                .btn-secondary {
                    background: #e5e7eb;
                    color: #111827;
                }

                .report {
                    width: 100%;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    gap: 24px;
                    border-bottom: 3px solid #111827;
                    padding-bottom: 14px;
                    margin-bottom: 18px;
                }

                .company-title {
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    margin: 0;
                    color: #111827;
                }

                .company-subtitle {
                    margin-top: 4px;
                    font-size: 12px;
                    color: #4b5563;
                    font-weight: 600;
                }

                .report-title {
                    text-align: right;
                }

                .report-title h1 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 900;
                    color: #111827;
                }

                .report-title p {
                    margin: 4px 0 0;
                    color: #4b5563;
                    font-weight: 600;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px 24px;
                    margin-bottom: 18px;
                }

                .info-box {
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    padding: 12px;
                    background: #f9fafb;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 4px 0;
                }

                .info-label {
                    color: #6b7280;
                    font-weight: 700;
                }

                .info-value {
                    color: #111827;
                    font-weight: 800;
                    text-align: right;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .summary-card {
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    padding: 12px;
                    background: #ffffff;
                }

                .summary-card.dark {
                    background: #111827;
                    color: #ffffff;
                    border-color: #111827;
                }

                .summary-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #6b7280;
                    font-weight: 900;
                    margin-bottom: 6px;
                }

                .summary-card.dark .summary-label {
                    color: #d1d5db;
                }

                .summary-value {
                    font-size: 14px;
                    font-weight: 900;
                }

                .section {
                    margin-top: 18px;
                    page-break-inside: avoid;
                }

                .section-title {
                    background: #111827;
                    color: #ffffff;
                    padding: 9px 12px;
                    border-radius: 8px 8px 0 0;
                    font-size: 13px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }

                thead {
                    background: #f3f4f6;
                }

                th,
                td {
                    border: 1px solid #d1d5db;
                    padding: 8px;
                    vertical-align: top;
                    word-wrap: break-word;
                }

                th {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #374151;
                    font-weight: 900;
                    text-align: left;
                }

                td {
                    font-size: 11px;
                }

                .text-right {
                    text-align: right;
                }

                .empty {
                    text-align: center;
                    color: #6b7280;
                    font-weight: 700;
                    padding: 14px;
                }

                .note-box {
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    padding: 12px;
                    margin-top: 18px;
                    background: #f9fafb;
                }

                .note-title {
                    font-weight: 900;
                    margin-bottom: 5px;
                }

                .signature-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 50px;
                    margin-top: 36px;
                    page-break-inside: avoid;
                }

                .signature-box {
                    text-align: center;
                }

                .signature-space {
                    height: 64px;
                }

                .signature-line {
                    border-top: 1px solid #111827;
                    padding-top: 6px;
                    font-weight: 800;
                }

                .footer {
                    margin-top: 24px;
                    padding-top: 10px;
                    border-top: 1px solid #d1d5db;
                    color: #6b7280;
                    font-size: 10px;
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                }

                @media print {
                    .print-actions {
                        display: none;
                    }

                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .section {
                        break-inside: avoid;
                    }
                }
            </style>
        </head>

        <body>
            <div class="print-actions">
                <button class="btn-primary" onclick="window.print()">
                    Cetak / Simpan PDF
                </button>

                <button class="btn-secondary" onclick="window.close()">
                    Tutup
                </button>
            </div>

            <div class="report">
                <div class="header">
                    <div>
                        <h2 class="company-title">STORE ISMA</h2>
                        <div class="company-subtitle">
                            Laporan Operasional Harian
                        </div>
                    </div>

                    <div class="report-title">
                        <h1>REKAP MUTASI TRANSAKSI</h1>
                        <p>${formatDateIndonesia(pengeluaran.tanggal)}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">Tanggal</span>
                            <span class="info-value">${formatDateIndonesia(
                                pengeluaran.tanggal
                            )}</span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">Status</span>
                            <span class="info-value">${
                                pengeluaran.status === "closed"
                                    ? "Closed"
                                    : "Open"
                            }</span>
                        </div>
                    </div>

                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">Dibuka</span>
                            <span class="info-value">${escapeHtml(
                                pengeluaran.opened_at || "-"
                            )}</span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">Ditutup</span>
                            <span class="info-value">${escapeHtml(
                                pengeluaran.closed_at || "-"
                            )}</span>
                        </div>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">Total Limit</div>
                        <div class="summary-value">${formatRupiahWithPrefix(
                            pengeluaran.total_deposit
                        )}</div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-label">Total Keluar</div>
                        <div class="summary-value">${formatRupiahWithPrefix(
                            pengeluaran.total_pengeluaran
                        )}</div>
                    </div>

                    <div class="summary-card dark">
                        <div class="summary-label">Sisa Total</div>
                        <div class="summary-value">${formatRupiahWithPrefix(
                            pengeluaran.sisa_total
                        )}</div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-label">Cash Keluar</div>
                        <div class="summary-value">${formatRupiahWithPrefix(
                            pengeluaran.total_cash
                        )}</div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-label">Transfer Keluar</div>
                        <div class="summary-value">${formatRupiahWithPrefix(
                            pengeluaran.total_tf
                        )}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Limit / Deposit Per Jenis Pembayaran</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">No</th>
                                <th>Pembayaran</th>
                                <th>Limit</th>
                                <th>Terpakai</th>
                                <th>Sisa</th>
                                <th>Catatan</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${
                                depositRows ||
                                `<tr>
                                    <td colspan="6" class="empty">
                                        Tidak ada data limit pembayaran.
                                    </td>
                                </tr>`
                            }
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Detail Mutasi Transaksi</div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">No</th>
                                <th>Jenis</th>
                                <th>Deskripsi</th>
                                <th>Pembayaran</th>
                                <th>Nominal</th>
                                <th>Waktu Input</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${
                                itemRows ||
                                `<tr>
                                    <td colspan="6" class="empty">
                                        Belum ada mutasi transaksi.
                                    </td>
                                </tr>`
                            }
                        </tbody>
                    </table>
                </div>

                ${
                    pengeluaran.catatan_buka || pengeluaran.catatan_tutup
                        ? `
                            <div class="note-box">
                                <div class="note-title">Catatan</div>

                                ${
                                    pengeluaran.catatan_buka
                                        ? `<div><strong>Catatan Buka:</strong> ${escapeHtml(
                                              pengeluaran.catatan_buka
                                          )}</div>`
                                        : ""
                                }

                                ${
                                    pengeluaran.catatan_tutup
                                        ? `<div><strong>Catatan Tutup:</strong> ${escapeHtml(
                                              pengeluaran.catatan_tutup
                                          )}</div>`
                                        : ""
                                }
                            </div>
                        `
                        : ""
                }

                <div class="signature-grid">
                    <div class="signature-box">
                        <div>Dibuat Oleh,</div>
                        <div class="signature-space"></div>
                        <div class="signature-line">Admin / Kasir</div>
                    </div>

                    <div class="signature-box">
                        <div>Diperiksa Oleh,</div>
                        <div class="signature-space"></div>
                        <div class="signature-line">Penanggung Jawab</div>
                    </div>
                </div>

                <div class="footer">
                    <div>Dicetak: ${new Date().toLocaleString("id-ID")}</div>
                    <div>Dokumen ini dibuat otomatis oleh sistem.</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function getJenisItemMutasi(item) {
    const sourceType = String(item?.source_type || "").toLowerCase();
    const jenis = String(item?.jenis_pengeluaran || "").trim();

    if (sourceType === "pembelian") return "Pembelian";
    if (sourceType === "borongan") return "Borongan";

    if (jenis) return jenis;

    return "Mutasi Keluar";
}

function getJenisDepositMutasi(deposit) {
    const sourceType = String(deposit?.source_type || "").toLowerCase();
    const catatan = String(deposit?.catatan || "").toLowerCase();

    if (sourceType === "penjualan" || catatan.includes("penjualan")) {
        return "Penjualan";
    }

    if (sourceType) {
        return toTitleCase(sourceType.replaceAll("_", " "));
    }

    return "Deposit Saldo Awal";
}

function getDeskripsiDepositMutasi(deposit) {
    const sourceType = String(deposit?.source_type || "").toLowerCase();
    const catatan = String(deposit?.catatan || "").trim();

    if (catatan) return catatan;

    if (sourceType === "penjualan") {
        return "Uang masuk dari transaksi penjualan";
    }

    return "Deposit / limit kasir harian";
}

function toTitleCase(value) {
    return String(value || "")
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
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

function decimalInputValue(value) {
    if (value === "" || value === null || value === undefined) {
        return "";
    }

    const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const integerPart = parts[0] || "0";

    if (parts.length === 1) {
        return integerPart;
    }

    const decimalPart = parts.slice(1).join("").slice(0, 2);

    return `${integerPart}.${decimalPart}`;
}

function toDecimal(value) {
    if (value === "" || value === null || value === undefined) {
        return 0;
    }

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

function roundMoney(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? Math.round(number * 100) / 100
        : 0;
}

function formatRupiah(value) {
    const number = toDecimal(value);

    return number.toLocaleString("id-ID", {
        minimumFractionDigits: number % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function formatRupiahWithPrefix(value) {
    return `Rp ${formatRupiah(value)}`;
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

function normalizeDateInput(value) {
    if (!value) {
        return today();
    }

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

function dataTableLanguage() {
    return {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Tidak ada data",
        infoFiltered: "(difilter dari _MAX_ total data)",
        zeroRecords: "Data mutasi transaksi tidak ditemukan",
        emptyTable: "Data mutasi transaksi masih kosong",
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
