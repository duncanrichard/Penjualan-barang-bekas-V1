<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\DocumentReminder;
use App\Models\DocumentReminderLog;
use App\Models\DocumentType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator as ValidationValidator;
use Throwable;

class DocumentReminderController extends Controller
{
    private const FONNTE_SEND_URL = 'https://api.fonnte.com/send';

    /**
     * Menampilkan daftar reminder.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(
            1,
            min($request->integer('per_page', 10), 100)
        );

        $query = DocumentReminder::query()
            ->with([
                'documentType:id,code,name,description,is_active',
                'parent:id,document_type_id,document_name,cycle_number',
            ])
            ->withCount([
                'logs',
                'children',
            ]);

        /*
         * Secara default hanya menampilkan siklus terbaru.
         */
        if (!$request->boolean('include_history')) {
            $query->whereNull('superseded_at');
        }

        /*
         * Pencarian.
         */
        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(
                function (Builder $builder) use ($search): void {
                    $builder
                        ->where(
                            'document_name',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'document_number',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'owner_name',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'owner_phone',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'owner_email',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'object_name',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'object_identity',
                            'ilike',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'documentType',
                            function (
                                Builder $documentTypeQuery
                            ) use ($search): void {
                                $documentTypeQuery
                                    ->where(
                                        'name',
                                        'ilike',
                                        "%{$search}%"
                                    )
                                    ->orWhere(
                                        'code',
                                        'ilike',
                                        "%{$search}%"
                                    );
                            }
                        );
                }
            );
        }

        /*
         * Filter berdasarkan UUID document type.
         */
        if ($request->filled('document_type_id')) {
            $query->where(
                'document_type_id',
                $request
                    ->string('document_type_id')
                    ->toString()
            );
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request
                    ->string('status')
                    ->toString()
            );
        }

        $data = $query
            ->orderByRaw(
                '
                    CASE
                        WHEN next_reminder_at IS NULL THEN 1
                        ELSE 0
                    END
                '
            )
            ->orderBy('next_reminder_at')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $data->getCollection()->transform(
            fn (DocumentReminder $item): array =>
                $this->formatReminder($item)
        );

        return response()->json([
            'message' =>
                'Data reminder dokumen berhasil diambil.',

            'data' => $data,

            /*
             * Disediakan juga sebagai fallback untuk frontend.
             */
            'document_types' =>
                $this->getDocumentTypeOptions(),
        ]);
    }

    /**
     * Endpoint pilihan jenis dokumen untuk React Select.
     */
    public function documentTypeOptions(): JsonResponse
    {
        return response()->json([
            'message' =>
                'Pilihan jenis dokumen berhasil diambil.',

            'data' =>
                $this->getDocumentTypeOptions(),
        ]);
    }

    /**
     * Menyimpan reminder baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = $this->validator($request);

        if ($validator->fails()) {
            return $this->validationErrorResponse(
                $validator
            );
        }

        $data = $validator->validated();

        try {
            $reminder = DB::transaction(
                function () use ($data): DocumentReminder {
                    $data['created_by'] = auth()->id();

                    $data['parent_id'] = null;
                    $data['root_id'] = null;
                    $data['cycle_number'] = 1;

                    $data['send_whatsapp'] =
                        $data['send_whatsapp'] ?? true;

                    $data['status'] =
                        $data['status'] ?? 'active';

                    $data['last_sent_at'] = null;
                    $data['completed_at'] = null;
                    $data['superseded_at'] = null;

                    $data['next_reminder_at'] =
                        Carbon::parse(
                            $data['reminder_date']
                        )->startOfDay();

                    $reminder = DocumentReminder::query()
                        ->create($data);

                    /*
                     * Siklus pertama menjadi root.
                     */
                    $reminder->update([
                        'root_id' => $reminder->id,
                    ]);

                    return $reminder->fresh([
                        'documentType',
                        'parent',
                    ]);
                }
            );

            return response()->json([
                'message' =>
                    'Reminder dokumen berhasil dibuat.',

                'data' =>
                    $this->formatReminder($reminder),
            ], 201);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Gagal membuat reminder dokumen.',

                'error' => config('app.debug')
                    ? $exception->getMessage()
                    : null,
            ], 500);
        }
    }

    /**
     * Menampilkan detail reminder dan history.
     */
    public function show(
        DocumentReminder $documentReminder
    ): JsonResponse {
        $rootId = $documentReminder->root_id
            ?: $documentReminder->id;

        $documentReminder->load([
            'documentType',
            'logs',
            'parent.documentType',
            'children.documentType',
            'children.logs',
        ]);

        $history = DocumentReminder::query()
            ->with([
                'documentType:id,code,name,description,is_active',
            ])
            ->withCount([
                'logs',
                'children',
            ])
            ->where(
                function (Builder $query) use ($rootId): void {
                    $query
                        ->where('id', $rootId)
                        ->orWhere('root_id', $rootId);
                }
            )
            ->orderBy('cycle_number')
            ->orderBy('created_at')
            ->get()
            ->map(
                fn (DocumentReminder $item): array =>
                    $this->formatReminder($item)
            )
            ->values();

        return response()->json([
            'message' =>
                'Detail dan history reminder berhasil diambil.',

            'data' =>
                $this->formatReminder(
                    $documentReminder
                ),

            'history' => $history,
        ]);
    }

    /**
     * Memperbarui reminder.
     *
     * Jika reminder sudah selesai, expired, cancelled,
     * atau sudah menjadi history, sistem membuat siklus baru.
     */
    public function update(
        Request $request,
        DocumentReminder $documentReminder
    ): JsonResponse {
        $validator = $this->validator($request);

        if ($validator->fails()) {
            return $this->validationErrorResponse(
                $validator
            );
        }

        $data = $validator->validated();

        try {
            $result = DB::transaction(
                function () use (
                    $documentReminder,
                    $data
                ): array {
                    $locked = DocumentReminder::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $documentReminder->id
                        );

                    $expired = $locked->expired_date
                        && $locked->expired_date
                            ->copy()
                            ->endOfDay()
                            ->isPast();

                    $closed = in_array(
                        $locked->status,
                        [
                            'done',
                            'expired',
                            'cancelled',
                        ],
                        true
                    );

                    if (
                        $expired
                        || $closed
                        || $locked->superseded_at !== null
                    ) {
                        $child =
                            $this->createNextCycleFromPayload(
                                $locked,
                                $data
                            );

                        return [
                            'created_new_cycle' => true,

                            'reminder' => $child,

                            'parent' => $locked->fresh([
                                'documentType',
                            ]),
                        ];
                    }

                    $oldReminderDate =
                        $locked->reminder_date
                            ?->toDateString();

                    $newReminderDate =
                        Carbon::parse(
                            $data['reminder_date']
                        )->toDateString();

                    $data['next_reminder_at'] =
                        Carbon::parse(
                            $data['reminder_date']
                        )->startOfDay();

                    $data['send_whatsapp'] =
                        $data['send_whatsapp']
                        ?? (bool) $locked->send_whatsapp;

                    /*
                     * Jadwal reminder berubah:
                     * izinkan pengiriman ulang pada jadwal baru.
                     */
                    if (
                        $oldReminderDate
                        !== $newReminderDate
                    ) {
                        $data['last_sent_at'] = null;

                        if (
                            ($data['status'] ?? null)
                            === 'sent'
                        ) {
                            $data['status'] = 'active';
                        }
                    }

                    $locked->update($data);

                    return [
                        'created_new_cycle' => false,

                        'reminder' => $locked->fresh([
                            'documentType',
                        ]),

                        'parent' => null,
                    ];
                }
            );

            return response()->json([
                'message' =>
                    $result['created_new_cycle']
                        ? 'Jadwal lama disimpan sebagai history dan siklus reminder baru berhasil dibuat.'
                        : 'Reminder dokumen berhasil diperbarui.',

                'created_new_cycle' =>
                    $result['created_new_cycle'],

                'data' =>
                    $this->formatReminder(
                        $result['reminder']
                    ),

                'parent' =>
                    $result['parent']
                        ? $this->formatReminder(
                            $result['parent']
                        )
                        : null,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Gagal memperbarui reminder dokumen.',

                'error' => config('app.debug')
                    ? $exception->getMessage()
                    : null,
            ], 500);
        }
    }

    /**
     * Membuat siklus baru secara manual.
     */
    public function renew(
        Request $request,
        DocumentReminder $documentReminder
    ): JsonResponse {
        $validator = $this->validator($request);

        if ($validator->fails()) {
            return $this->validationErrorResponse(
                $validator
            );
        }

        try {
            $child = DB::transaction(
                function () use (
                    $documentReminder,
                    $validator
                ): DocumentReminder {
                    $parent =
                        DocumentReminder::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $documentReminder->id
                            );

                    return
                        $this->createNextCycleFromPayload(
                            $parent,
                            $validator->validated()
                        );
                }
            );

            return response()->json([
                'message' =>
                    'Siklus reminder baru berhasil dibuat.',

                'data' =>
                    $this->formatReminder($child),
            ], 201);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Gagal membuat siklus reminder baru.',

                'error' => config('app.debug')
                    ? $exception->getMessage()
                    : null,
            ], 500);
        }
    }

    /**
     * Menghapus reminder.
     */
    public function destroy(
        DocumentReminder $documentReminder
    ): JsonResponse {
        if (
            $documentReminder
                ->children()
                ->exists()
        ) {
            return response()->json([
                'message' =>
                    'Data tidak dapat dihapus karena sudah memiliki history lanjutan. Gunakan status cancelled.',
            ], 422);
        }

        try {
            DB::transaction(
                function () use (
                    $documentReminder
                ): void {
                    $documentReminder->delete();
                }
            );

            return response()->json([
                'message' =>
                    'Reminder dokumen berhasil dihapus.',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Gagal menghapus reminder dokumen.',

                'error' => config('app.debug')
                    ? $exception->getMessage()
                    : null,
            ], 500);
        }
    }

    /**
     * Mengirim WhatsApp secara manual.
     */
    public function sendWhatsapp(
        DocumentReminder $documentReminder
    ): JsonResponse {
        $documentReminder->loadMissing(
            'documentType'
        );

        $result = $this->sendReminder(
            $documentReminder,
            false
        );

        return response()->json([
            'message' => $result['success']
                ? 'WhatsApp reminder berhasil dikirim.'
                : $result['message'],

            'data' => $result,
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Memproses reminder otomatis.
     */
    public function processDueReminders(): JsonResponse
    {
        $summary = [
            'checked' => 0,
            'sent' => 0,
            'failed' => 0,
            'new_cycles' => 0,
            'closed_without_repeat' => 0,
            'skipped' => 0,
            'errors' => 0,
        ];

        /*
         * Menggunakan lazy karena primary key berupa UUID.
         */
        $reminders = DocumentReminder::query()
            ->whereNull('superseded_at')
            ->whereNotIn(
                'status',
                [
                    'done',
                    'cancelled',
                ]
            )
            ->orderBy('created_at')
            ->orderBy('id')
            ->lazy(100);

        foreach ($reminders as $reminder) {
            $summary['checked']++;

            try {
                $current = DocumentReminder::query()
                    ->with('documentType')
                    ->find($reminder->id);

                if (
                    !$current
                    || $current->superseded_at !== null
                    || in_array(
                        $current->status,
                        ['done', 'cancelled'],
                        true
                    )
                ) {
                    $summary['skipped']++;

                    continue;
                }

                /*
                 * Kirim WhatsApp ketika jadwal sudah tiba.
                 */
                if (
                    $current->send_whatsapp
                    && $current->next_reminder_at
                    && $current
                        ->next_reminder_at
                        ->lte(now())
                    && !$this->alreadySentForSchedule(
                        $current
                    )
                ) {
                    $result = $this->sendReminder(
                        $current,
                        true
                    );

                    if ($result['success']) {
                        $summary['sent']++;
                    } else {
                        $summary['failed']++;
                    }

                    $current->refresh();
                }

                /*
                 * Proses reminder yang sudah expired.
                 */
                if (
                    $current->expired_date
                    && $current->expired_date
                        ->copy()
                        ->endOfDay()
                        ->isPast()
                ) {
                    DB::transaction(
                        function () use (
                            $current,
                            &$summary
                        ): void {
                            $locked =
                                DocumentReminder::query()
                                    ->lockForUpdate()
                                    ->find($current->id);

                            if (
                                !$locked
                                || $locked
                                    ->superseded_at
                                    !== null
                                || in_array(
                                    $locked->status,
                                    [
                                        'done',
                                        'cancelled',
                                    ],
                                    true
                                )
                            ) {
                                $summary['skipped']++;

                                return;
                            }

                            $nextDates =
                                $this
                                    ->calculateNextCycleDates(
                                        $locked
                                    );

                            if ($nextDates !== null) {
                                $this
                                    ->createNextCycleFromPayload(
                                        $locked,
                                        [
                                            ...$locked->only([
                                                /*
                                                 * Gunakan UUID document type.
                                                 */
                                                'document_type_id',

                                                'document_name',
                                                'document_number',
                                                'description',

                                                'owner_name',
                                                'owner_phone',
                                                'owner_email',

                                                'object_name',
                                                'object_identity',

                                                'reminder_days_before',
                                                'repeat_type',
                                                'repeat_every_days',

                                                'send_whatsapp',
                                                'whatsapp_message',
                                            ]),

                                            'issued_date' =>
                                                $nextDates[
                                                    'issued_date'
                                                ],

                                            'reminder_date' =>
                                                $nextDates[
                                                    'reminder_date'
                                                ],

                                            'expired_date' =>
                                                $nextDates[
                                                    'expired_date'
                                                ],

                                            'status' =>
                                                'active',
                                        ]
                                    );

                                $summary['new_cycles']++;

                                return;
                            }

                            /*
                             * Tidak berulang.
                             */
                            $locked->update([
                                'status' => 'expired',
                                'completed_at' => now(),
                            ]);

                            $summary[
                                'closed_without_repeat'
                            ]++;
                        }
                    );
                }
            } catch (Throwable $exception) {
                $summary['errors']++;

                Log::error(
                    'Gagal memproses reminder otomatis.',
                    [
                        'document_reminder_id' =>
                            $reminder->id,

                        'error' =>
                            $exception->getMessage(),
                    ]
                );

                report($exception);
            }
        }

        return response()->json([
            'message' =>
                'Proses reminder otomatis selesai.',

            'data' => $summary,
        ]);
    }

    /**
     * Membuat siklus reminder berikutnya.
     */
    private function createNextCycleFromPayload(
        DocumentReminder $parent,
        array $data
    ): DocumentReminder {
        $existingChild = $parent
            ->children()
            ->whereNull('superseded_at')
            ->whereNotIn(
                'status',
                [
                    'done',
                    'expired',
                    'cancelled',
                ]
            )
            ->orderByDesc('cycle_number')
            ->first();

        if ($existingChild) {
            return $existingChild->loadMissing([
                'documentType',
                'parent',
            ]);
        }

        $rootId = $parent->root_id
            ?: $parent->id;

        $parent->update([
            'status' => 'done',
            'completed_at' => now(),
            'superseded_at' => now(),
        ]);

        $child = DocumentReminder::query()
            ->create([
                ...$data,

                'parent_id' => $parent->id,
                'root_id' => $rootId,

                'cycle_number' =>
                    ((int) $parent->cycle_number) + 1,

                'created_by' =>
                    auth()->id()
                    ?: $parent->created_by,

                'status' => 'active',
                'last_sent_at' => null,

                'next_reminder_at' =>
                    Carbon::parse(
                        $data['reminder_date']
                    )->startOfDay(),

                'completed_at' => null,
                'superseded_at' => null,
            ]);

        return $child->fresh([
            'documentType',
            'parent',
        ]);
    }

    /**
     * Menghitung tanggal siklus berikutnya.
     */
    private function calculateNextCycleDates(
        DocumentReminder $reminder
    ): ?array {
        if (!$reminder->expired_date) {
            return null;
        }

        $expired =
            $reminder->expired_date->copy();

        $nextExpired = match (
            $reminder->repeat_type
        ) {
            'daily' =>
                $expired->addDay(),

            'weekly' =>
                $expired->addWeek(),

            'monthly' =>
                $expired->addMonthNoOverflow(),

            'yearly' =>
                $expired->addYearNoOverflow(),

            'custom_days' =>
                $expired->addDays(
                    max(
                        1,
                        (int) $reminder
                            ->repeat_every_days
                    )
                ),

            default => null,
        };

        if (!$nextExpired) {
            return null;
        }

        $nextReminder = $nextExpired
            ->copy()
            ->subDays(
                max(
                    0,
                    (int) $reminder
                        ->reminder_days_before
                )
            );

        $nextIssued = $reminder->issued_date
            ? $this->shiftDateByRepeat(
                $reminder->issued_date->copy(),
                $reminder
            )
            : null;

        return [
            'issued_date' =>
                $nextIssued?->toDateString(),

            'reminder_date' =>
                $nextReminder->toDateString(),

            'expired_date' =>
                $nextExpired->toDateString(),
        ];
    }

    /**
     * Menggeser tanggal berdasarkan pengulangan.
     */
    private function shiftDateByRepeat(
        Carbon $date,
        DocumentReminder $reminder
    ): Carbon {
        return match ($reminder->repeat_type) {
            'daily' =>
                $date->addDay(),

            'weekly' =>
                $date->addWeek(),

            'monthly' =>
                $date->addMonthNoOverflow(),

            'yearly' =>
                $date->addYearNoOverflow(),

            'custom_days' =>
                $date->addDays(
                    max(
                        1,
                        (int) $reminder
                            ->repeat_every_days
                    )
                ),

            default => $date,
        };
    }

    /**
     * Memeriksa apakah reminder sudah dikirim
     * untuk jadwal saat ini.
     */
    private function alreadySentForSchedule(
        DocumentReminder $reminder
    ): bool {
        if (
            !$reminder->last_sent_at
            || !$reminder->next_reminder_at
        ) {
            return false;
        }

        return $reminder
            ->last_sent_at
            ->gte($reminder->next_reminder_at);
    }

    /**
     * Mengirim reminder dan membuat log.
     */
    private function sendReminder(
        DocumentReminder $documentReminder,
        bool $automatic
    ): array {
        if (!$documentReminder->send_whatsapp) {
            return [
                'success' => false,

                'message' =>
                    'Reminder ini tidak mengaktifkan WhatsApp.',
            ];
        }

        if (!$documentReminder->owner_phone) {
            return [
                'success' => false,

                'message' =>
                    'Nomor WhatsApp pemilik belum diisi.',
            ];
        }

        $documentReminder->loadMissing(
            'documentType'
        );

        $message =
            $documentReminder
                ->whatsapp_message_for_sending;

        $result = $this->sendFonnteMessage(
            $documentReminder->owner_phone,
            $message
        );

        try {
            DocumentReminderLog::query()
                ->create([
                    'document_reminder_id' =>
                        $documentReminder->id,

                    'send_to' =>
                        $documentReminder
                            ->owner_phone,

                    'message' => $message,

                    'channel' => 'whatsapp',

                    'status' =>
                        $result['success']
                            ? 'success'
                            : 'failed',

                    'response' => json_encode(
                        [
                            ...$result,

                            'automatic' =>
                                $automatic,

                            'scheduled_for' =>
                                $documentReminder
                                    ->next_reminder_at
                                    ?->format(
                                        'Y-m-d H:i:s'
                                    ),
                        ],
                        JSON_PRETTY_PRINT
                        | JSON_UNESCAPED_SLASHES
                        | JSON_UNESCAPED_UNICODE
                    ),

                    'sent_at' => now(),
                ]);
        } catch (Throwable $exception) {
            Log::error(
                'Gagal menyimpan log reminder WhatsApp.',
                [
                    'document_reminder_id' =>
                        $documentReminder->id,

                    'error' =>
                        $exception->getMessage(),
                ]
            );

            report($exception);
        }

        if ($result['success']) {
            $documentReminder->update([
                'last_sent_at' => now(),
                'status' => 'sent',
            ]);
        }

        return $result;
    }

    /**
     * Mengirim pesan melalui Fonnte.
     */
    private function sendFonnteMessage(
        string $phone,
        string $message
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Ambil profil perusahaan
        |--------------------------------------------------------------------------
        */
        $profile = CompanyProfile::query()->first();

        if (!$profile) {
            return [
                'success' => false,
                'status' => 'company_profile_missing',
                'message' => 'Profil perusahaan belum tersedia.',
                'sender' => null,
                'target' => null,
                'status_code' => null,
                'response' => null,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Pastikan integrasi Fonnte aktif
        |--------------------------------------------------------------------------
        */
        if (!$profile->fonnte_enabled) {
            return [
                'success' => false,
                'status' => 'fonnte_disabled',
                'message' => 'Integrasi Fonnte belum diaktifkan pada Profil Perusahaan.',
                'sender' => $this->normalizePhoneOnly($profile->no_wa),
                'target' => null,
                'status_code' => null,
                'response' => null,
            ];
        }

        $token = trim((string) $profile->fonnte_api_token);

        if ($token === '') {
            return [
                'success' => false,
                'status' => 'fonnte_token_empty',
                'message' => 'Token API Fonnte belum diisi pada Profil Perusahaan.',
                'sender' => $this->normalizePhoneOnly($profile->no_wa),
                'target' => null,
                'status_code' => null,
                'response' => null,
            ];
        }

        $target = $this->normalizePhoneOnly($phone);

        if (!$target) {
            return [
                'success' => false,
                'status' => 'target_invalid',
                'message' => 'Nomor WhatsApp tujuan kosong atau tidak valid.',
                'sender' => $this->normalizePhoneOnly($profile->no_wa),
                'target' => null,
                'status_code' => null,
                'response' => null,
            ];
        }

        $sender = $this->normalizePhoneOnly($profile->no_wa);

        if (!$sender) {
            return [
                'success' => false,
                'status' => 'sender_invalid',
                'message' => 'Nomor WhatsApp perusahaan kosong atau tidak valid.',
                'sender' => null,
                'target' => $target,
                'status_code' => null,
                'response' => null,
            ];
        }

        $sendUrl = env(
            'FONNTE_SEND_URL',
            self::FONNTE_SEND_URL
        );

        $connectTimeout = (int) env(
            'FONNTE_CONNECT_TIMEOUT',
            10
        );

        $timeout = (int) env(
            'FONNTE_TIMEOUT',
            30
        );

        try {
            /*
             * Untuk lingkungan lokal Windows, verifikasi SSL dimatikan agar
             * tidak terkena cURL error 60: unable to get local issuer certificate.
             */
            $response = Http::withoutVerifying()
                ->withOptions([
                    'verify' => false,
                ])
                ->acceptJson()
                ->asForm()
                ->withHeaders([
                    'Authorization' => $token,
                ])
                ->connectTimeout($connectTimeout)
                ->timeout($timeout)
                ->post(
                    $sendUrl,
                    [
                        'target' => $target,
                        'message' => $message,
                        'countryCode' => '62',
                    ]
                );

            $json = $response->json();

            $responseData = is_array($json)
                ? $json
                : [
                    'raw_body' => $response->body(),
                ];

            if (!$response->successful()) {
                $errorMessage = (string) (
                    $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte mengembalikan HTTP '
                        . $response->status()
                        . '.'
                );

                Log::error(
                    'HTTP Fonnte gagal mengirim reminder WhatsApp.',
                    [
                        'sender' => $sender,
                        'target' => $target,
                        'http_status' => $response->status(),
                        'response' => $responseData,
                    ]
                );

                return [
                    'success' => false,
                    'status' => 'http_error',
                    'message' => $errorMessage,
                    'sender' => $sender,
                    'target' => $target,
                    'status_code' => $response->status(),
                    'response' => $responseData,
                ];
            }

            $apiSuccess = filter_var(
                $responseData['status']
                    ?? $responseData['success']
                    ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            if (!$apiSuccess) {
                $errorMessage = (string) (
                    $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte menolak pengiriman pesan WhatsApp.'
                );

                Log::error(
                    'Fonnte menolak pengiriman reminder WhatsApp.',
                    [
                        'sender' => $sender,
                        'target' => $target,
                        'http_status' => $response->status(),
                        'response' => $responseData,
                    ]
                );

                return [
                    'success' => false,
                    'status' => 'api_rejected',
                    'message' => $errorMessage,
                    'sender' => $sender,
                    'target' => $target,
                    'status_code' => $response->status(),
                    'response' => $responseData,
                ];
            }

            Log::info(
                'Reminder WhatsApp berhasil dikirim melalui Fonnte.',
                [
                    'sender' => $sender,
                    'target' => $target,
                    'http_status' => $response->status(),
                    'response' => $responseData,
                ]
            );

            return [
                'success' => true,
                'status' => 'sent',
                'message' => 'Pesan WhatsApp berhasil dikirim.',
                'sender' => $sender,
                'target' => $target,
                'status_code' => $response->status(),
                'response' => $responseData,
            ];
        } catch (ConnectionException $exception) {
            Log::error(
                'Koneksi Fonnte gagal saat mengirim reminder WhatsApp.',
                [
                    'sender' => $sender,
                    'target' => $target,
                    'error' => $exception->getMessage(),
                ]
            );

            return [
                'success' => false,
                'status' => 'connection_error',
                'message' => 'Tidak dapat terhubung ke Fonnte: '
                    . $exception->getMessage(),
                'sender' => $sender,
                'target' => $target,
                'status_code' => null,
                'response' => null,
            ];
        } catch (Throwable $exception) {
            report($exception);

            Log::error(
                'Terjadi kesalahan saat mengirim reminder WhatsApp.',
                [
                    'sender' => $sender,
                    'target' => $target,
                    'error' => $exception->getMessage(),
                ]
            );

            return [
                'success' => false,
                'status' => 'system_error',
                'message' => 'Terjadi error saat mengirim WhatsApp: '
                    . $exception->getMessage(),
                'sender' => $sender,
                'target' => $target,
                'status_code' => null,
                'response' => null,
            ];
        }
    }

    /**
     * Validasi request.
     */
    private function validator(
        Request $request
    ): ValidationValidator {
        return Validator::make(
            $request->all(),
            [
                /*
                 * UUID relasi ke document_types.
                 */
                'document_type_id' => [
                    'required',
                    'uuid',

                    Rule::exists(
                        'document_types',
                        'id'
                    )->where(
                        function ($query): void {
                            $query
                                ->where(
                                    'is_active',
                                    true
                                )
                                ->whereNull(
                                    'deleted_at'
                                );
                        }
                    ),
                ],

                'document_name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'document_number' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'description' => [
                    'nullable',
                    'string',
                ],

                'owner_name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'owner_phone' => [
                    'required',
                    'string',
                    'max:30',
                ],

                'owner_email' => [
                    'nullable',
                    'email',
                    'max:255',
                ],

                'object_name' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'object_identity' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'issued_date' => [
                    'nullable',
                    'date',
                ],

                'reminder_date' => [
                    'required',
                    'date',
                ],

                'expired_date' => [
                    'required',
                    'date',
                    'after_or_equal:reminder_date',
                ],

                'reminder_days_before' => [
                    'nullable',
                    'integer',
                    'min:0',
                    'max:3650',
                ],

                'repeat_type' => [
                    'required',
                    Rule::in([
                        'none',
                        'daily',
                        'weekly',
                        'monthly',
                        'yearly',
                        'custom_days',
                    ]),
                ],

                'repeat_every_days' => [
                    'nullable',
                    'required_if:repeat_type,custom_days',
                    'integer',
                    'min:1',
                    'max:3650',
                ],

                'send_whatsapp' => [
                    'nullable',
                    'boolean',
                ],

                'whatsapp_message' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'status' => [
                    'nullable',

                    Rule::in([
                        'active',
                        'sent',
                        'done',
                        'expired',
                        'cancelled',
                    ]),
                ],
            ],
            [
                'document_type_id.required' =>
                    'Jenis dokumen wajib dipilih.',

                'document_type_id.uuid' =>
                    'Format ID jenis dokumen tidak valid.',

                'document_type_id.exists' =>
                    'Jenis dokumen tidak tersedia, tidak aktif, atau sudah dihapus.',

                'document_name.required' =>
                    'Nama dokumen wajib diisi.',

                'owner_name.required' =>
                    'Nama pemilik wajib diisi.',

                'owner_phone.required' =>
                    'Nomor WhatsApp pemilik wajib diisi.',

                'owner_email.email' =>
                    'Format email pemilik tidak valid.',

                'reminder_date.required' =>
                    'Tanggal reminder wajib diisi.',

                'expired_date.required' =>
                    'Tanggal expired wajib diisi.',

                'expired_date.after_or_equal' =>
                    'Tanggal expired tidak boleh sebelum tanggal reminder.',

                'repeat_type.required' =>
                    'Tipe pengulangan wajib dipilih.',

                'repeat_every_days.required_if' =>
                    'Jumlah hari wajib diisi untuk tipe pengulangan custom.',
            ]
        );
    }

    /**
     * Response validasi gagal.
     */
    private function validationErrorResponse(
        ValidationValidator $validator
    ): JsonResponse {
        return response()->json([
            'message' => 'Validasi gagal.',
            'errors' => $validator->errors(),
        ], 422);
    }

    /**
     * Data jenis dokumen untuk React Select.
     */
    private function getDocumentTypeOptions(): array
    {
        return DocumentType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'description',
            ])
            ->map(
                fn (DocumentType $type): array => [
                    'id' =>
                        (string) $type->id,

                    /*
                     * Format langsung untuk react-select.
                     */
                    'value' =>
                        (string) $type->id,

                    'label' =>
                        $type->code
                            ? "{$type->name} ({$type->code})"
                            : $type->name,

                    'code' =>
                        $type->code,

                    'name' =>
                        $type->name,

                    'description' =>
                        $type->description,
                ]
            )
            ->values()
            ->all();
    }

    /**
     * Normalisasi nomor WhatsApp Indonesia.
     */
    private function normalizePhoneOnly(
        ?string $phone
    ): ?string {
        if (!$phone) {
            return null;
        }

        $phone = preg_replace(
            '/[^0-9]/',
            '',
            $phone
        );

        if (!$phone) {
            return null;
        }

        if (str_starts_with($phone, '0')) {
            $phone =
                '62' . substr($phone, 1);
        } elseif (
            str_starts_with($phone, '8')
        ) {
            $phone = '62' . $phone;
        }

        return preg_match(
            '/^62[0-9]{8,15}$/',
            $phone
        )
            ? $phone
            : null;
    }

    /**
     * Format response reminder.
     */
    private function formatReminder(
        DocumentReminder $reminder
    ): array {
        $reminder->loadMissing(
            'documentType'
        );

        return [
            'id' =>
                (string) $reminder->id,

            'parent_id' =>
                $reminder->parent_id
                    ? (string) $reminder->parent_id
                    : null,

            'root_id' =>
                $reminder->root_id
                    ? (string) $reminder->root_id
                    : null,

            'cycle_number' =>
                (int) $reminder->cycle_number,

            /*
             * UUID foreign key.
             */
            'document_type_id' =>
                $reminder->document_type_id
                    ? (string) $reminder
                        ->document_type_id
                    : null,

            /*
             * Object lengkap.
             */
            'document_type' =>
                $reminder->documentType
                    ? [
                        'id' =>
                            (string) $reminder
                                ->documentType
                                ->id,

                        'value' =>
                            (string) $reminder
                                ->documentType
                                ->id,

                        'label' =>
                            $reminder
                                ->documentType
                                ->code
                                ? $reminder
                                    ->documentType
                                    ->name
                                    . ' ('
                                    . $reminder
                                        ->documentType
                                        ->code
                                    . ')'
                                : $reminder
                                    ->documentType
                                    ->name,

                        'code' =>
                            $reminder
                                ->documentType
                                ->code,

                        'name' =>
                            $reminder
                                ->documentType
                                ->name,

                        'description' =>
                            $reminder
                                ->documentType
                                ->description,
                    ]
                    : null,

            /*
             * Field praktis untuk tabel frontend.
             */
            'document_type_code' =>
                $reminder
                    ->documentType
                    ?->code,

            'document_type_name' =>
                $reminder
                    ->documentType
                    ?->name,

            'document_name' =>
                $reminder->document_name,

            'document_number' =>
                $reminder->document_number,

            'description' =>
                $reminder->description,

            'owner_name' =>
                $reminder->owner_name,

            'owner_phone' =>
                $reminder->owner_phone,

            'owner_email' =>
                $reminder->owner_email,

            'object_name' =>
                $reminder->object_name,

            'object_identity' =>
                $reminder->object_identity,

            'issued_date' =>
                $reminder->issued_date
                    ?->format('Y-m-d'),

            'reminder_date' =>
                $reminder->reminder_date
                    ?->format('Y-m-d'),

            'expired_date' =>
                $reminder->expired_date
                    ?->format('Y-m-d'),

            'reminder_days_before' =>
                (int) $reminder
                    ->reminder_days_before,

            'repeat_type' =>
                $reminder->repeat_type,

            'repeat_every_days' =>
                $reminder->repeat_every_days
                    !== null
                    ? (int) $reminder
                        ->repeat_every_days
                    : null,

            'send_whatsapp' =>
                (bool) $reminder
                    ->send_whatsapp,

            'whatsapp_message' =>
                $reminder
                    ->whatsapp_message,

            'status' =>
                $reminder->status,

            'is_current_cycle' =>
                (bool) $reminder
                    ->is_current_cycle,

            'last_sent_at' =>
                $reminder->last_sent_at
                    ?->format('Y-m-d H:i:s'),

            'next_reminder_at' =>
                $reminder->next_reminder_at
                    ?->format('Y-m-d H:i:s'),

            'completed_at' =>
                $reminder->completed_at
                    ?->format('Y-m-d H:i:s'),

            'superseded_at' =>
                $reminder->superseded_at
                    ?->format('Y-m-d H:i:s'),

            'logs_count' =>
                isset($reminder->logs_count)
                    ? (int) $reminder
                        ->logs_count
                    : null,

            'children_count' =>
                isset($reminder->children_count)
                    ? (int) $reminder
                        ->children_count
                    : null,

            'created_by' =>
                $reminder->created_by,

            'created_at' =>
                $reminder->created_at
                    ?->format('Y-m-d H:i:s'),

            'updated_at' =>
                $reminder->updated_at
                    ?->format('Y-m-d H:i:s'),
        ];
    }
}
