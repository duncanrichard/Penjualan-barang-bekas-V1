import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import axios from "axios";
import Select from "react-select";

const DOCUMENT_REMINDER_URL =
    "/admin/document-reminders";

const DOCUMENT_TYPE_OPTIONS_URL =
    "/admin/document-reminders/options/document-types";

const initialForm = {
    document_type_id: "",
    document_name: "",
    document_number: "",
    description: "",

    owner_name: "",
    owner_phone: "",
    owner_email: "",

    object_name: "",
    object_identity: "",

    issued_date: "",
    reminder_date: "",
    expired_date: "",

    reminder_days_before: 7,
    repeat_type: "none",
    repeat_every_days: "",

    send_whatsapp: true,
    status: "active",
};

const statusOptions = [
    {
        value: "active",
        label: "Active",
    },
    {
        value: "sent",
        label: "Sent",
    },
    {
        value: "done",
        label: "Done",
    },
    {
        value: "expired",
        label: "Expired",
    },
    {
        value: "cancelled",
        label: "Cancelled",
    },
];

const repeatTypeOptions = [
    {
        value: "none",
        label: "Tidak Berulang",
    },
    {
        value: "daily",
        label: "Harian",
    },
    {
        value: "weekly",
        label: "Mingguan",
    },
    {
        value: "monthly",
        label: "Bulanan",
    },
    {
        value: "yearly",
        label: "Tahunan",
    },
    {
        value: "custom_days",
        label: "Custom Hari",
    },
];

const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: "46px",
        borderRadius: "1rem",
        borderColor: state.isFocused
            ? "rgb(59 130 246)"
            : "rgb(226 232 240)",
        boxShadow: state.isFocused
            ? "0 0 0 4px rgb(219 234 254)"
            : "none",
        fontSize: "0.875rem",
        fontWeight: 600,
        backgroundColor: state.isDisabled
            ? "rgb(248 250 252)"
            : "white",
        cursor: state.isDisabled
            ? "not-allowed"
            : "pointer",

        "&:hover": {
            borderColor: state.isFocused
                ? "rgb(59 130 246)"
                : "rgb(203 213 225)",
        },
    }),

    valueContainer: (base) => ({
        ...base,
        padding: "0.5rem 1rem",
    }),

    input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
    }),

    indicatorsContainer: (base) => ({
        ...base,
        paddingRight: "0.5rem",
    }),

    placeholder: (base) => ({
        ...base,
        color: "rgb(148 163 184)",
    }),

    singleValue: (base) => ({
        ...base,
        color: "rgb(15 23 42)",
    }),

    menu: (base) => ({
        ...base,
        zIndex: 9999,
        borderRadius: "1rem",
        overflow: "hidden",
    }),

    menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
    }),

    option: (base, state) => ({
        ...base,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 600,

        backgroundColor: state.isSelected
            ? "rgb(37 99 235)"
            : state.isFocused
              ? "rgb(239 246 255)"
              : "white",

        color: state.isSelected
            ? "white"
            : "rgb(51 65 85)",

        "&:active": {
            backgroundColor: state.isSelected
                ? "rgb(37 99 235)"
                : "rgb(219 234 254)",
        },
    }),

    noOptionsMessage: (base) => ({
        ...base,
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "rgb(100 116 139)",
    }),
};

export default function DocumentReminderIndexPage() {
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);

    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const [documentTypes, setDocumentTypes] =
        useState([]);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [
        documentTypeId,
        setDocumentTypeId,
    ] = useState("");

    const [loading, setLoading] = useState(false);
    const [
        loadingDocumentTypes,
        setLoadingDocumentTypes,
    ] = useState(false);

    const [saving, setSaving] = useState(false);
    const [sendingId, setSendingId] =
        useState(null);
    const [deletingId, setDeletingId] =
        useState(null);

    const isEditing = Boolean(editingId);

    /**
     * Menormalkan data DocumentType dari backend.
     *
     * Controller dapat mengirim:
     * {
     *   id,
     *   value,
     *   label,
     *   code,
     *   name,
     *   description
     * }
     */
    const documentTypeOptions = useMemo(() => {
        return documentTypes
            .map((item) => {
                const value = String(
                    item.value || item.id || ""
                );

                const label =
                    item.label ||
                    (item.code
                        ? `${item.name} (${item.code})`
                        : item.name);

                return {
                    value,
                    label: label || "-",
                    id: String(
                        item.id || item.value || ""
                    ),
                    code: item.code || "",
                    name:
                        item.name ||
                        item.label ||
                        "-",
                    description:
                        item.description || "",
                };
            })
            .filter((item) => item.value !== "");
    }, [documentTypes]);

    const selectedFormDocumentType =
        useMemo(() => {
            return (
                documentTypeOptions.find(
                    (item) =>
                        item.value ===
                        String(
                            form.document_type_id ||
                                ""
                        )
                ) || null
            );
        }, [
            documentTypeOptions,
            form.document_type_id,
        ]);

    const selectedFilterDocumentType =
        useMemo(() => {
            return (
                documentTypeOptions.find(
                    (item) =>
                        item.value ===
                        String(documentTypeId || "")
                ) || null
            );
        }, [
            documentTypeOptions,
            documentTypeId,
        ]);

    const selectedFormStatus = useMemo(() => {
        return (
            statusOptions.find(
                (item) =>
                    item.value === form.status
            ) || null
        );
    }, [form.status]);

    const selectedFilterStatus = useMemo(() => {
        return (
            statusOptions.find(
                (item) => item.value === status
            ) || null
        );
    }, [status]);

    const selectedRepeatType = useMemo(() => {
        return (
            repeatTypeOptions.find(
                (item) =>
                    item.value === form.repeat_type
            ) || repeatTypeOptions[0]
        );
    }, [form.repeat_type]);

    const fetchDocumentTypes =
        useCallback(async () => {
            setLoadingDocumentTypes(true);

            try {
                const response = await axios.get(
                    DOCUMENT_TYPE_OPTIONS_URL
                );

                const result =
                    response.data?.data || [];

                setDocumentTypes(
                    Array.isArray(result)
                        ? result
                        : []
                );
            } catch (error) {
                console.error(
                    "Gagal mengambil document type:",
                    error
                );

                setDocumentTypes([]);

                const message =
                    error.response?.data?.message ||
                    "Gagal mengambil master jenis dokumen.";

                window.alert(message);
            } finally {
                setLoadingDocumentTypes(false);
            }
        }, []);

    const fetchData = useCallback(
        async (
            page = 1,
            filterOverrides = {}
        ) => {
            setLoading(true);

            try {
                const requestSearch =
                    filterOverrides.search !==
                    undefined
                        ? filterOverrides.search
                        : search;

                const requestStatus =
                    filterOverrides.status !==
                    undefined
                        ? filterOverrides.status
                        : status;

                const requestDocumentTypeId =
                    filterOverrides.document_type_id !==
                    undefined
                        ? filterOverrides.document_type_id
                        : documentTypeId;

                const response = await axios.get(
                    DOCUMENT_REMINDER_URL,
                    {
                        params: {
                            page,
                            search: requestSearch,
                            status: requestStatus,
                            document_type_id:
                                requestDocumentTypeId,
                            per_page: 10,
                        },
                    }
                );

                setItems(
                    response.data?.data?.data || []
                );

                setMeta(
                    response.data?.data || null
                );

                /**
                 * Controller index juga mengirim
                 * document_types sebagai fallback.
                 */
                const responseDocumentTypes =
                    response.data?.document_types;

                if (
                    Array.isArray(
                        responseDocumentTypes
                    ) &&
                    responseDocumentTypes.length > 0
                ) {
                    setDocumentTypes(
                        responseDocumentTypes
                    );
                }
            } catch (error) {
                console.error(
                    "Gagal mengambil reminder:",
                    error
                );

                const message =
                    error.response?.data?.message ||
                    "Gagal mengambil data reminder dokumen.";

                window.alert(message);
            } finally {
                setLoading(false);
            }
        },
        [
            search,
            status,
            documentTypeId,
        ]
    );

    useEffect(() => {
        fetchDocumentTypes();
        fetchData(1);
    }, []);

    const handleChange = (event) => {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setForm((previous) => ({
            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    const handleDocumentTypeChange = (
        selectedOption
    ) => {
        setForm((previous) => ({
            ...previous,

            document_type_id:
                selectedOption?.value || "",
        }));
    };

    const handleRepeatTypeChange = (
        selectedOption
    ) => {
        const selectedValue =
            selectedOption?.value || "none";

        setForm((previous) => ({
            ...previous,

            repeat_type: selectedValue,

            repeat_every_days:
                selectedValue === "custom_days"
                    ? previous.repeat_every_days
                    : "",
        }));
    };

    const handleStatusFormChange = (
        selectedOption
    ) => {
        setForm((previous) => ({
            ...previous,

            status:
                selectedOption?.value ||
                "active",
        }));
    };

    const resetForm = () => {
        setForm({
            ...initialForm,
        });

        setEditingId(null);
    };

    const buildPayload = () => {
        return {
            document_type_id:
                form.document_type_id,

            document_name:
                form.document_name.trim(),

            document_number:
                form.document_number.trim() ||
                null,

            description:
                form.description.trim() || null,

            owner_name:
                form.owner_name.trim(),

            owner_phone:
                form.owner_phone.trim(),

            owner_email:
                form.owner_email.trim() || null,

            object_name:
                form.object_name.trim() || null,

            object_identity:
                form.object_identity.trim() ||
                null,

            issued_date:
                form.issued_date || null,

            reminder_date:
                form.reminder_date,

            expired_date:
                form.expired_date,

            reminder_days_before: Number(
                form.reminder_days_before || 0
            ),

            repeat_type:
                form.repeat_type,

            repeat_every_days:
                form.repeat_type ===
                    "custom_days" &&
                form.repeat_every_days
                    ? Number(
                        form.repeat_every_days
                    )
                    : null,

            send_whatsapp: Boolean(
                form.send_whatsapp
            ),

            status:
                form.status || "active",
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.document_type_id) {
            window.alert(
                "Jenis dokumen wajib dipilih."
            );

            return;
        }

        if (!form.document_name.trim()) {
            window.alert(
                "Nama dokumen wajib diisi."
            );

            return;
        }

        if (!form.owner_name.trim()) {
            window.alert(
                "Nama pemilik wajib diisi."
            );

            return;
        }

        if (!form.owner_phone.trim()) {
            window.alert(
                "Nomor WhatsApp wajib diisi."
            );

            return;
        }

        if (!form.reminder_date) {
            window.alert(
                "Tanggal reminder wajib diisi."
            );

            return;
        }

        if (!form.expired_date) {
            window.alert(
                "Tanggal expired wajib diisi."
            );

            return;
        }

        setSaving(true);

        try {
            const payload = buildPayload();

            if (isEditing) {
                await axios.put(
                    `${DOCUMENT_REMINDER_URL}/${editingId}`,
                    payload
                );

                window.alert(
                    "Reminder berhasil diperbarui."
                );
            } else {
                await axios.post(
                    DOCUMENT_REMINDER_URL,
                    payload
                );

                window.alert(
                    "Reminder berhasil dibuat."
                );
            }

            resetForm();

            await fetchData(1);
        } catch (error) {
            console.error(
                "Gagal menyimpan reminder:",
                error
            );

            const errors =
                error.response?.data?.errors;

            if (errors) {
                const firstError =
                    Object.values(errors)?.[0]?.[0];

                window.alert(
                    firstError ||
                        "Validasi gagal."
                );

                return;
            }

            const message =
                error.response?.data?.message ||
                "Gagal menyimpan reminder dokumen.";

            const detail =
                error.response?.data?.error;

            window.alert(
                detail
                    ? `${message}\n\nDetail: ${detail}`
                    : message
            );
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);

        setForm({
            document_type_id:
                item.document_type_id ||
                item.document_type?.id ||
                item.document_type?.value ||
                "",

            document_name:
                item.document_name || "",

            document_number:
                item.document_number || "",

            description:
                item.description || "",

            owner_name:
                item.owner_name || "",

            owner_phone:
                item.owner_phone || "",

            owner_email:
                item.owner_email || "",

            object_name:
                item.object_name || "",

            object_identity:
                item.object_identity || "",

            issued_date: toDateInput(
                item.issued_date
            ),

            reminder_date: toDateInput(
                item.reminder_date
            ),

            expired_date: toDateInput(
                item.expired_date
            ),

            reminder_days_before:
                item.reminder_days_before ?? 7,

            repeat_type:
                item.repeat_type || "none",

            repeat_every_days:
                item.repeat_every_days ?? "",

            send_whatsapp: Boolean(
                item.send_whatsapp
            ),

            status:
                item.status || "active",
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Yakin ingin menghapus reminder ini?"
        );

        if (!confirmed) {
            return;
        }

        setDeletingId(id);

        try {
            await axios.delete(
                `${DOCUMENT_REMINDER_URL}/${id}`
            );

            window.alert(
                "Reminder berhasil dihapus."
            );

            const currentPage =
                meta?.current_page || 1;

            await fetchData(currentPage);
        } catch (error) {
            console.error(
                "Gagal menghapus reminder:",
                error
            );

            const message =
                error.response?.data?.message ||
                "Gagal menghapus reminder.";

            window.alert(message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSendWhatsapp = async (
        id
    ) => {
        const confirmed = window.confirm(
            "Kirim WhatsApp reminder sekarang?"
        );

        if (!confirmed) {
            return;
        }

        setSendingId(id);

        try {
            const response = await axios.post(
                `${DOCUMENT_REMINDER_URL}/${id}/send-whatsapp`
            );

            window.alert(
                response.data?.message ||
                    "WhatsApp berhasil dikirim."
            );

            await fetchData(
                meta?.current_page || 1
            );
        } catch (error) {
            console.error(
                "Gagal mengirim WhatsApp:",
                error
            );

            const responseData =
                error.response?.data;

            const backendMessage =
                responseData?.message ||
                "Gagal mengirim WhatsApp.";

            const detail =
                responseData?.data?.response
                    ?.message ||
                responseData?.data?.response
                    ?.error ||
                responseData?.data?.error ||
                responseData?.error ||
                "";

            window.alert(
                detail
                    ? `${backendMessage}\n\nDetail: ${detail}`
                    : backendMessage
            );
        } finally {
            setSendingId(null);
        }
    };

    const handleFilter = () => {
        fetchData(1);
    };

    const handleResetFilter = () => {
        setSearch("");
        setStatus("");
        setDocumentTypeId("");

        fetchData(1, {
            search: "",
            status: "",
            document_type_id: "",
        });
    };

    const statusBadge = (value) => {
        const classes = {
            active:
                "bg-blue-50 text-blue-700 ring-blue-100",

            sent:
                "bg-green-50 text-green-700 ring-green-100",

            done:
                "bg-slate-100 text-slate-700 ring-slate-200",

            expired:
                "bg-red-50 text-red-700 ring-red-100",

            cancelled:
                "bg-zinc-100 text-zinc-700 ring-zinc-200",
        };

        return (
            classes[value] ||
            classes.active
        );
    };

    const statusLabel = (value) => {
        return (
            statusOptions.find(
                (item) => item.value === value
            )?.label || value
        );
    };

    const getDocumentTypeName = (item) => {
        return (
            item.document_type_name ||
            item.document_type?.name ||
            "-"
        );
    };

    const getDocumentTypeCode = (item) => {
        return (
            item.document_type_code ||
            item.document_type?.code ||
            ""
        );
    };

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-6 text-white shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                    Reminder Dokumen
                </p>

                <h1 className="mt-2 text-3xl font-black">
                    Kelola Reminder Dokumen &
                    WhatsApp
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-100">
                    Jenis dokumen diambil dari
                    master Document Type yang aktif.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            Form Reminder
                        </p>

                        <h2 className="text-xl font-black text-slate-950">
                            {isEditing
                                ? "Edit Reminder"
                                : "Tambah Reminder"}
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-slate-400">
                            Pilih jenis dokumen dari
                            master data.
                        </p>
                    </div>

                    {isEditing && (
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
                    <Field
                        label="Jenis Dokumen"
                        required
                    >
                        <Select
                            inputId="document_type_id"
                            name="document_type_id"
                            value={
                                selectedFormDocumentType
                            }
                            onChange={
                                handleDocumentTypeChange
                            }
                            options={
                                documentTypeOptions
                            }
                            styles={selectStyles}
                            placeholder={
                                loadingDocumentTypes
                                    ? "Memuat jenis dokumen..."
                                    : "Pilih jenis dokumen"
                            }
                            noOptionsMessage={() =>
                                "Jenis dokumen tidak ditemukan"
                            }
                            loadingMessage={() =>
                                "Memuat data..."
                            }
                            isLoading={
                                loadingDocumentTypes
                            }
                            isClearable
                            isSearchable
                            isDisabled={
                                loadingDocumentTypes ||
                                saving
                            }
                            menuPortalTarget={
                                typeof document !==
                                "undefined"
                                    ? document.body
                                    : null
                            }
                            menuPosition="fixed"
                        />

                        {selectedFormDocumentType
                            ?.description && (
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                                {
                                    selectedFormDocumentType.description
                                }
                            </p>
                        )}
                    </Field>

                    <Field
                        label="Nama Dokumen"
                        required
                    >
                        <input
                            name="document_name"
                            value={
                                form.document_name
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: STNK Honda PCX 160"
                            required
                        />
                    </Field>

                    <Field label="Nomor Dokumen / No Polisi / NOP">
                        <input
                            name="document_number"
                            value={
                                form.document_number
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: B 1234 ABC"
                        />
                    </Field>

                    <Field
                        label="Nama Pemilik"
                        required
                    >
                        <input
                            name="owner_name"
                            value={
                                form.owner_name
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: Richard"
                            required
                        />
                    </Field>

                    <Field
                        label="No WhatsApp Pemilik"
                        required
                    >
                        <input
                            name="owner_phone"
                            value={
                                form.owner_phone
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: 089504780628"
                            required
                        />
                    </Field>

                    <Field label="Email Pemilik">
                        <input
                            type="email"
                            name="owner_email"
                            value={
                                form.owner_email
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Opsional"
                        />
                    </Field>

                    <Field label="Nama Objek">
                        <input
                            name="object_name"
                            value={
                                form.object_name
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: Honda PCX 160"
                        />
                    </Field>

                    <Field label="Identitas Objek">
                        <input
                            name="object_identity"
                            value={
                                form.object_identity
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: Plat / NOP / Nomor Aset"
                        />
                    </Field>

                    <Field label="Tanggal Terbit">
                        <input
                            type="date"
                            name="issued_date"
                            value={
                                form.issued_date
                            }
                            onChange={handleChange}
                            className="input"
                        />
                    </Field>

                    <Field
                        label="Tanggal Reminder"
                        required
                    >
                        <input
                            type="date"
                            name="reminder_date"
                            value={
                                form.reminder_date
                            }
                            onChange={handleChange}
                            className="input"
                            required
                        />
                    </Field>

                    <Field
                        label="Tanggal Expired"
                        required
                    >
                        <input
                            type="date"
                            name="expired_date"
                            value={
                                form.expired_date
                            }
                            onChange={handleChange}
                            className="input"
                            required
                        />
                    </Field>

                    <Field label="Reminder Berapa Hari Sebelum Expired">
                        <input
                            type="number"
                            name="reminder_days_before"
                            value={
                                form.reminder_days_before
                            }
                            onChange={handleChange}
                            className="input"
                            min="0"
                            max="3650"
                        />
                    </Field>

                    <Field label="Tipe Pengulangan">
                        <Select
                            inputId="repeat_type"
                            name="repeat_type"
                            value={
                                selectedRepeatType
                            }
                            onChange={
                                handleRepeatTypeChange
                            }
                            options={
                                repeatTypeOptions
                            }
                            styles={selectStyles}
                            isSearchable
                            isDisabled={saving}
                            menuPortalTarget={
                                typeof document !==
                                "undefined"
                                    ? document.body
                                    : null
                            }
                            menuPosition="fixed"
                        />
                    </Field>

                    <Field label="Ulang Setiap Berapa Hari">
                        <input
                            type="number"
                            name="repeat_every_days"
                            value={
                                form.repeat_every_days
                            }
                            onChange={handleChange}
                            className="input"
                            placeholder="Contoh: 90"
                            disabled={
                                form.repeat_type !==
                                    "custom_days" ||
                                saving
                            }
                            min="1"
                            max="3650"
                        />
                    </Field>

                    <Field label="Status">
                        <Select
                            inputId="status"
                            name="status"
                            value={
                                selectedFormStatus
                            }
                            onChange={
                                handleStatusFormChange
                            }
                            options={statusOptions}
                            styles={selectStyles}
                            isSearchable
                            isDisabled={saving}
                            menuPortalTarget={
                                typeof document !==
                                "undefined"
                                    ? document.body
                                    : null
                            }
                            menuPosition="fixed"
                        />
                    </Field>
                </div>

                <div className="mt-4">
                    <label className="flex items-center gap-3 text-sm font-black text-slate-700">
                        <input
                            type="checkbox"
                            name="send_whatsapp"
                            checked={
                                form.send_whatsapp
                            }
                            onChange={handleChange}
                            disabled={saving}
                            className="h-5 w-5"
                        />

                        Kirim reminder otomatis ke
                        WhatsApp
                    </label>
                </div>

                <div className="mt-4">
                    <label className="mb-2 block text-sm font-black text-slate-700">
                        Catatan
                    </label>

                    <textarea
                        name="description"
                        value={
                            form.description
                        }
                        onChange={handleChange}
                        className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Catatan internal, contoh: bayar sebelum jatuh tempo."
                    />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving
                            ? "Menyimpan..."
                            : isEditing
                              ? "Update Reminder"
                              : "Simpan Reminder"}
                    </button>

                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={saving}
                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
                            setSearch(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                event.preventDefault();
                                handleFilter();
                            }
                        }}
                        className="input md:col-span-2"
                        placeholder="Cari dokumen, pemilik, no WA, plat, NOP..."
                    />

                    <Select
                        inputId="filter_document_type_id"
                        value={
                            selectedFilterDocumentType
                        }
                        onChange={(
                            selectedOption
                        ) =>
                            setDocumentTypeId(
                                selectedOption?.value ||
                                    ""
                            )
                        }
                        options={
                            documentTypeOptions
                        }
                        styles={selectStyles}
                        placeholder="Semua Jenis Dokumen"
                        noOptionsMessage={() =>
                            "Jenis dokumen tidak ditemukan"
                        }
                        isLoading={
                            loadingDocumentTypes
                        }
                        isClearable
                        isSearchable
                        menuPortalTarget={
                            typeof document !==
                            "undefined"
                                ? document.body
                                : null
                        }
                        menuPosition="fixed"
                    />

                    <Select
                        inputId="filter_status"
                        value={
                            selectedFilterStatus
                        }
                        onChange={(
                            selectedOption
                        ) =>
                            setStatus(
                                selectedOption?.value ||
                                    ""
                            )
                        }
                        options={statusOptions}
                        styles={selectStyles}
                        placeholder="Semua Status"
                        isClearable
                        isSearchable
                        menuPortalTarget={
                            typeof document !==
                            "undefined"
                                ? document.body
                                : null
                        }
                        menuPosition="fixed"
                    />

                    <div className="flex flex-wrap gap-3 md:col-span-4">
                        <button
                            type="button"
                            onClick={handleFilter}
                            disabled={loading}
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Memuat..."
                                : "Filter Data"}
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleResetFilter
                            }
                            disabled={loading}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                                <th className="whitespace-nowrap px-4 py-3">
                                    Dokumen
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Pemilik
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Objek
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Reminder
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Expired
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Status
                                </th>

                                <th className="whitespace-nowrap px-4 py-3">
                                    Aksi
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-10 text-center font-bold text-slate-400"
                                    >
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : items.length ===
                              0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-10 text-center font-bold text-slate-400"
                                    >
                                        Belum ada data
                                        reminder.
                                    </td>
                                </tr>
                            ) : (
                                items.map(
                                    (item) => (
                                        <tr
                                            key={
                                                item.id
                                            }
                                            className="border-b border-slate-100 align-top hover:bg-slate-50/60"
                                        >
                                            <td className="px-4 py-4">
                                                <p className="font-black text-slate-950">
                                                    {
                                                        item.document_name
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs font-bold text-blue-600">
                                                    {getDocumentTypeName(
                                                        item
                                                    )}
                                                </p>

                                                {getDocumentTypeCode(
                                                    item
                                                ) && (
                                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                        {getDocumentTypeCode(
                                                            item
                                                        )}
                                                    </p>
                                                )}

                                                <p className="mt-1 text-xs font-bold text-slate-400">
                                                    {item.document_number ||
                                                        "-"}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-700">
                                                    {
                                                        item.owner_name
                                                    }
                                                </p>

                                                <p className="text-xs font-bold text-slate-400">
                                                    {
                                                        item.owner_phone
                                                    }
                                                </p>

                                                {item.owner_email && (
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        {
                                                            item.owner_email
                                                        }
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-700">
                                                    {item.object_name ||
                                                        "-"}
                                                </p>

                                                <p className="text-xs font-bold text-slate-400">
                                                    {item.object_identity ||
                                                        "-"}
                                                </p>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 font-bold text-blue-700">
                                                {formatDate(
                                                    item.reminder_date
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 font-bold text-red-700">
                                                {formatDate(
                                                    item.expired_date
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusBadge(
                                                        item.status
                                                    )}`}
                                                >
                                                    {statusLabel(
                                                        item.status
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex min-w-max flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleSendWhatsapp(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            sendingId ===
                                                                item.id ||
                                                            deletingId ===
                                                                item.id
                                                        }
                                                        className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {sendingId ===
                                                        item.id
                                                            ? "Mengirim..."
                                                            : "Kirim WA"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEdit(
                                                                item
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            item.id
                                                        }
                                                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                                item.id ||
                                                            sendingId ===
                                                                item.id
                                                        }
                                                        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {deletingId ===
                                                        item.id
                                                            ? "Menghapus..."
                                                            : "Hapus"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {meta &&
                    meta.last_page > 1 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {Array.from({
                                length:
                                    meta.last_page,
                            }).map(
                                (_, index) => {
                                    const page =
                                        index + 1;

                                    return (
                                        <button
                                            key={
                                                page
                                            }
                                            type="button"
                                            onClick={() =>
                                                fetchData(
                                                    page
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                            className={`rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                                                meta.current_page ===
                                                page
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {
                                                page
                                            }
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    )}
            </div>

            <style>{`
                .input {
                    width: 100%;
                    min-height: 46px;
                    border-radius: 1rem;
                    border: 1px solid rgb(226 232 240);
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    outline: none;
                    background: white;
                    color: rgb(15 23 42);
                }

                .input::placeholder {
                    color: rgb(148 163 184);
                }

                .input:focus {
                    border-color: rgb(59 130 246);
                    box-shadow: 0 0 0 4px rgb(219 234 254);
                }

                .input:disabled {
                    background: rgb(248 250 252);
                    color: rgb(148 163 184);
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

function Field({
    label,
    children,
    required = false,
}) {
    return (
        <div className="block">
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}

                {required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </label>

            {children}
        </div>
    );
}

function toDateInput(value) {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = String(value).slice(0, 10);

    const [year, month, day] =
        date.split("-");

    if (!year || !month || !day) {
        return value;
    }

    return `${day}/${month}/${year}`;
}
