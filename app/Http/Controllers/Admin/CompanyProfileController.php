<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class CompanyProfileController extends Controller
{
    /**
     * Mengambil profil perusahaan.
     */
    public function show(): JsonResponse
    {
        $profile = CompanyProfile::query()->first();

        if (! $profile) {
            return response()->json([
                'success' => true,
                'message' => 'Profil perusahaan belum dibuat.',
                'data' => $this->emptyProfile(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil perusahaan berhasil diambil.',
            'data' => $this->formatProfile($profile),
        ]);
    }

    /**
     * Membuat atau memperbarui profil perusahaan.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_perusahaan' => [
                'required',
                'string',
                'max:150',
            ],
            'alamat' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'no_wa' => [
                'required',
                'string',
                'max:30',
            ],
            'fonnte_api_token' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'fonnte_enabled' => [
                'required',
                'boolean',
            ],
        ], [
            'nama_perusahaan.required' =>
                'Nama perusahaan wajib diisi.',

            'nama_perusahaan.string' =>
                'Nama perusahaan harus berupa teks.',

            'nama_perusahaan.max' =>
                'Nama perusahaan maksimal 150 karakter.',

            'alamat.string' =>
                'Alamat perusahaan harus berupa teks.',

            'alamat.max' =>
                'Alamat perusahaan maksimal 2.000 karakter.',

            'no_wa.required' =>
                'Nomor WhatsApp wajib diisi.',

            'no_wa.string' =>
                'Nomor WhatsApp harus berupa teks.',

            'no_wa.max' =>
                'Nomor WhatsApp maksimal 30 karakter.',

            'fonnte_api_token.string' =>
                'Token API Fonnte tidak valid.',

            'fonnte_api_token.max' =>
                'Token API Fonnte maksimal 1.000 karakter.',

            'fonnte_enabled.required' =>
                'Status integrasi Fonnte wajib dikirim.',

            'fonnte_enabled.boolean' =>
                'Status integrasi Fonnte tidak valid.',
        ]);

        $nomorWhatsapp = $this->normalizeWhatsappNumber(
            $validated['no_wa']
        );

        if (! $nomorWhatsapp) {
            throw ValidationException::withMessages([
                'no_wa' => [
                    'Format nomor WhatsApp tidak valid. Gunakan 08xxx, 628xxx, atau +628xxx.',
                ],
            ]);
        }

        $profile = CompanyProfile::query()->first();

        if (! $profile) {
            $profile = new CompanyProfile();
            $profile->id = (string) Str::uuid();
        }

        $profile->nama_perusahaan = trim(
            $validated['nama_perusahaan']
        );

        $profile->alamat = $this->nullableTrim(
            $validated['alamat'] ?? null
        );

        $profile->no_wa = $nomorWhatsapp;

        $newToken = trim(
            (string) ($validated['fonnte_api_token'] ?? '')
        );

        /*
         * Token hanya diganti jika user mengisi token baru.
         * Form token kosong berarti token lama tetap digunakan.
         */
        if ($newToken !== '') {
            $profile->fonnte_api_token = $newToken;

            $profile->fonnte_connection_status =
                'unchecked';

            $profile->fonnte_connection_message =
                'Token Fonnte diperbarui. Silakan lakukan tes koneksi.';

            $profile->fonnte_last_checked_at = null;
        }

        $profile->fonnte_enabled = (bool) $validated[
            'fonnte_enabled'
        ];

        if (
            $profile->fonnte_enabled
            && blank($profile->fonnte_api_token)
        ) {
            throw ValidationException::withMessages([
                'fonnte_api_token' => [
                    'Token API Fonnte wajib diisi sebelum integrasi diaktifkan.',
                ],
            ]);
        }

        if (! $profile->fonnte_enabled) {
            $profile->fonnte_connection_status =
                'disconnected';

            $profile->fonnte_connection_message =
                'Integrasi Fonnte dinonaktifkan dari aplikasi.';
        }

        $profile->save();

        return response()->json([
            'success' => true,
            'message' =>
                'Profil perusahaan berhasil disimpan.',
            'data' => $this->formatProfile(
                $profile->fresh()
            ),
        ]);
    }

    /**
     * Mengaktifkan atau menonaktifkan integrasi Fonnte.
     */
    public function toggleFonnte(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'enabled' => [
                'required',
                'boolean',
            ],
        ], [
            'enabled.required' =>
                'Status integrasi wajib dikirim.',

            'enabled.boolean' =>
                'Status integrasi tidak valid.',
        ]);

        $profile = CompanyProfile::query()->first();

        if (! $profile) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Simpan profil perusahaan terlebih dahulu.',
            ], 404);
        }

        $enabled = (bool) $validated['enabled'];

        if (
            $enabled
            && blank($profile->fonnte_api_token)
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Token API Fonnte belum tersedia.',
                'errors' => [
                    'fonnte_api_token' => [
                        'Isi dan simpan token API Fonnte terlebih dahulu.',
                    ],
                ],
            ], 422);
        }

        /*
         * Saat akan mengaktifkan integrasi,
         * periksa koneksi Fonnte terlebih dahulu.
         */
        if ($enabled) {
            $result = $this->checkFonnteDevice(
                $profile->fonnte_api_token
            );

            if (! $result['success']) {
                $this->saveFonnteStatus(
                    $profile,
                    $result
                );

                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'data' => $this->formatProfile(
                        $profile->fresh()
                    ),
                    'fonnte_response' =>
                        $result['response'],
                ], 422);
            }

            $nomorDatabase =
                $this->normalizeWhatsappNumber(
                    $profile->no_wa
                );

            $nomorDevice =
                $this->normalizeWhatsappNumber(
                    $result['device_number']
                );

            if (
                $nomorDatabase
                && $nomorDevice
                && $nomorDatabase !== $nomorDevice
            ) {
                $result = [
                    ...$result,
                    'success' => false,
                    'status' => 'mismatch',
                    'label' => 'Nomor Beda',
                    'message' =>
                        "Token Fonnte terhubung ke nomor {$nomorDevice}, sedangkan nomor perusahaan adalah {$nomorDatabase}.",
                ];

                $this->saveFonnteStatus(
                    $profile,
                    $result
                );

                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'data' => $this->formatProfile(
                        $profile->fresh()
                    ),
                    'fonnte_response' =>
                        $result['response'],
                ], 422);
            }

            $profile->fonnte_enabled = true;

            $this->saveFonnteStatus(
                $profile,
                $result
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'Integrasi Fonnte berhasil diaktifkan.',
                'data' => $this->formatProfile(
                    $profile->fresh()
                ),
            ]);
        }

        $profile->fonnte_enabled = false;

        $profile->fonnte_connection_status =
            'disconnected';

        $profile->fonnte_connection_message =
            'Integrasi Fonnte dinonaktifkan dari aplikasi.';

        $profile->fonnte_last_checked_at = now();

        $profile->save();

        return response()->json([
            'success' => true,
            'message' =>
                'Integrasi Fonnte berhasil dinonaktifkan.',
            'data' => $this->formatProfile(
                $profile->fresh()
            ),
        ]);
    }

    /**
     * Tes koneksi Fonnte.
     *
     * Tidak menggunakan verifikasi sertifikat SSL.
     */
    public function testFonnteConnection(): JsonResponse
    {
        $profile = CompanyProfile::query()->first();

        if (! $profile) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Profil perusahaan belum tersedia.',
            ], 404);
        }

        if (blank($profile->fonnte_api_token)) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Token API Fonnte belum diisi.',
                'data' =>
                    $this->formatProfile($profile),
            ], 422);
        }

        $result = $this->checkFonnteDevice(
            $profile->fonnte_api_token
        );

        $nomorDatabase =
            $this->normalizeWhatsappNumber(
                $profile->no_wa
            );

        $nomorDevice =
            $this->normalizeWhatsappNumber(
                $result['device_number']
            );

        /*
         * Pastikan nomor dari token sama dengan nomor perusahaan.
         */
        if (
            $result['success']
            && $nomorDatabase
            && $nomorDevice
            && $nomorDatabase !== $nomorDevice
        ) {
            $result = [
                ...$result,
                'success' => false,
                'status' => 'mismatch',
                'label' => 'Nomor Beda',
                'message' =>
                    "Token Fonnte terhubung ke nomor {$nomorDevice}, sedangkan nomor perusahaan adalah {$nomorDatabase}.",
            ];
        }

        $this->saveFonnteStatus(
            $profile,
            $result
        );

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],

            'data' => [
                ...$this->formatProfile(
                    $profile->fresh()
                ),

                'nomor_database' =>
                    $nomorDatabase,

                'nomor_device' =>
                    $nomorDevice,

                'device_status' =>
                    $result['device_status'],

                'wa_status' =>
                    $result['status'],

                'wa_status_label' =>
                    $result['label'],

                'wa_status_message' =>
                    $result['message'],
            ],

            'fonnte_response' =>
                $this->sanitizeFonnteResponse(
                    $result['response']
                ),
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Menghapus token Fonnte.
     */
    public function removeFonnteToken(): JsonResponse
    {
        $profile = CompanyProfile::query()->first();

        if (! $profile) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Profil perusahaan belum tersedia.',
            ], 404);
        }

        $profile->fonnte_api_token = null;
        $profile->fonnte_enabled = false;

        $profile->fonnte_connection_status =
            'disconnected';

        $profile->fonnte_connection_message =
            'Token API Fonnte telah dihapus.';

        $profile->fonnte_last_checked_at = now();

        $profile->save();

        return response()->json([
            'success' => true,
            'message' =>
                'Token API Fonnte berhasil dihapus.',
            'data' => $this->formatProfile(
                $profile->fresh()
            ),
        ]);
    }

    /**
     * Pengecekan device Fonnte.
     *
     * Endpoint /device menggunakan POST.
     * Verifikasi certificate dimatikan.
     */
    private function checkFonnteDevice(
        ?string $token
    ): array {
        if (! $token || trim($token) === '') {
            return $this->fonnteResult(
                false,
                'token_empty',
                'Token Kosong',
                'Token API Fonnte belum diisi.'
            );
        }

        try {
            $deviceUrl = env(
                'FONNTE_DEVICE_URL',
                'https://api.fonnte.com/device'
            );

            $connectTimeout = (int) env(
                'FONNTE_CONNECT_TIMEOUT',
                10
            );

            $timeout = (int) env(
                'FONNTE_TIMEOUT',
                30
            );

            /*
             * Tanpa verifikasi certificate.
             *
             * withoutVerifying() sebenarnya sudah memberikan
             * verify=false. withOptions ditambahkan untuk memastikan
             * Guzzle juga tidak melakukan verifikasi SSL.
             */
            $response = Http::withoutVerifying()
                ->withOptions([
                    'verify' => false,
                ])
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => trim($token),
                ])
                ->connectTimeout($connectTimeout)
                ->timeout($timeout)
                ->post($deviceUrl);

            $json = $response->json();

            $payload = is_array($json)
                ? $json
                : [];

            if (! $response->successful()) {
                $message = match (
                    $response->status()
                ) {
                    401 =>
                        'Token API Fonnte tidak valid atau tidak memiliki akses.',

                    403 =>
                        'Akses ke API Fonnte ditolak.',

                    404 =>
                        'Endpoint device Fonnte tidak ditemukan.',

                    405 =>
                        'Metode request Fonnte ditolak. Endpoint /device harus menggunakan POST.',

                    429 =>
                        'Terlalu banyak request ke Fonnte. Silakan coba kembali beberapa saat lagi.',

                    default =>
                        $payload['reason']
                        ?? $payload['message']
                        ?? 'Fonnte mengembalikan HTTP '
                            . $response->status()
                            . '.',
                };

                return $this->fonnteResult(
                    false,
                    'error',
                    'Gagal Cek',
                    (string) $message,
                    null,
                    null,
                    $payload ?: $response->body()
                );
            }

            /*
             * Fonnte umumnya mengembalikan:
             *
             * status: true
             * device: 628xxx
             * device_status: connect
             */
            $apiSuccess = filter_var(
                $payload['status']
                    ?? $payload['success']
                    ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            $deviceNumber =
                $this->extractFonnteNumber(
                    $payload
                );

            $deviceStatus = strtolower(
                trim(
                    (string) (
                        $payload['device_status']
                        ?? $payload['deviceStatus']
                        ?? $payload['connection']
                        ?? $payload['status_device']
                        ?? data_get(
                            $payload,
                            'data.device_status'
                        )
                        ?? data_get(
                            $payload,
                            'data.status'
                        )
                        ?? ''
                    )
                )
            );

            $connectedStatuses = [
                'connect',
                'connected',
                'ready',
                'online',
                'authenticated',
                'working',
                'active',
            ];

            /*
             * Sebagian response hanya mengembalikan:
             * status=true dan nomor device.
             */
            $connected = $apiSuccess && (
                in_array(
                    $deviceStatus,
                    $connectedStatuses,
                    true
                )
                || (
                    $deviceStatus === ''
                    && $deviceNumber !== null
                )
            );

            if (! $connected) {
                $message = (string) (
                    $payload['reason']
                    ?? $payload['message']
                    ?? $payload['detail']
                    ?? data_get(
                        $payload,
                        'data.message'
                    )
                    ?? 'Device Fonnte belum terhubung.'
                );

                return $this->fonnteResult(
                    false,
                    'disconnected',
                    'Belum Connect',
                    $message,
                    $deviceNumber,
                    $deviceStatus ?: null,
                    $payload
                );
            }

            return $this->fonnteResult(
                true,
                'connected',
                'Connected',
                'Token Fonnte valid dan device sudah terhubung.',
                $deviceNumber,
                $deviceStatus ?: 'connected',
                $payload
            );
        } catch (ConnectionException $exception) {
            report($exception);

            return $this->fonnteResult(
                false,
                'error',
                'Koneksi Gagal',
                'Tidak dapat terhubung ke API Fonnte: '
                    . $exception->getMessage()
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->fonnteResult(
                false,
                'error',
                'Gagal Cek',
                'Gagal memvalidasi Fonnte: '
                    . $exception->getMessage()
            );
        }
    }

    /**
     * Simpan hasil tes koneksi ke profil.
     */
    private function saveFonnteStatus(
        CompanyProfile $profile,
        array $result
    ): void {
        $profile->fonnte_connection_status =
            $result['status'];

        $profile->fonnte_connection_message =
            $result['message'];

        $profile->fonnte_last_checked_at = now();

        /*
         * Apabila koneksi gagal atau nomor tidak sama,
         * integrasi otomatis dinonaktifkan.
         */
        if (! $result['success']) {
            $profile->fonnte_enabled = false;
        }

        $profile->save();
    }

    private function fonnteResult(
        bool $success,
        string $status,
        string $label,
        string $message,
        ?string $deviceNumber = null,
        ?string $deviceStatus = null,
        mixed $response = null
    ): array {
        return [
            'success' => $success,
            'status' => $status,
            'label' => $label,
            'message' => $message,
            'device_number' => $deviceNumber,
            'device_status' => $deviceStatus,
            'response' => $response,
        ];
    }

    /**
     * Ambil nomor WhatsApp dari berbagai bentuk response Fonnte.
     */
    private function extractFonnteNumber(
        array $payload
    ): ?string {
        $candidates = [
            $payload['device'] ?? null,
            $payload['number'] ?? null,
            $payload['phone'] ?? null,
            $payload['phone_number'] ?? null,
            $payload['device_number'] ?? null,

            data_get($payload, 'data.device'),
            data_get($payload, 'data.number'),
            data_get($payload, 'data.phone'),
            data_get($payload, 'data.phone_number'),
            data_get($payload, 'data.device_number'),
        ];

        foreach ($candidates as $candidate) {
            if (! is_scalar($candidate)) {
                continue;
            }

            $number =
                $this->normalizeWhatsappNumber(
                    (string) $candidate
                );

            if ($number) {
                return $number;
            }
        }

        return null;
    }

    /**
     * Format nomor:
     *
     * 0812xxx   => 62812xxx
     * 812xxx    => 62812xxx
     * +62812xxx => 62812xxx
     */
    private function normalizeWhatsappNumber(
        ?string $value
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = preg_replace(
            '/@.*/',
            '',
            trim($value)
        );

        $value = preg_replace(
            '/[^0-9+]/',
            '',
            $value
        );

        if (! $value) {
            return null;
        }

        $value = ltrim($value, '+');

        if (Str::startsWith($value, '0')) {
            $value = '62' . substr($value, 1);
        } elseif (Str::startsWith($value, '8')) {
            $value = '62' . $value;
        }

        return preg_match(
            '/^62[0-9]{8,15}$/',
            $value
        )
            ? $value
            : null;
    }

    /**
     * Format response profil untuk frontend.
     */
    private function formatProfile(
        CompanyProfile $profile
    ): array {
        $token = $profile->fonnte_api_token;

        return [
            'id' => (string) $profile->id,

            'nama_perusahaan' =>
                $profile->nama_perusahaan,

            'alamat' =>
                $profile->alamat,

            'no_wa' =>
                $profile->no_wa,

            /*
             * Token asli tidak dikirim ke frontend.
             */
            'has_fonnte_api_token' =>
                filled($token),

            'fonnte_api_token_masked' =>
                filled($token)
                    ? $this->maskToken($token)
                    : null,

            'fonnte_enabled' =>
                (bool) $profile->fonnte_enabled,

            'fonnte_connection_status' =>
                $profile->fonnte_connection_status
                    ?: 'unchecked',

            'fonnte_connection_message' =>
                $profile->fonnte_connection_message,

            'fonnte_last_checked_at' =>
                optional(
                    $profile->fonnte_last_checked_at
                )->format('Y-m-d H:i:s'),

            'created_at' =>
                optional(
                    $profile->created_at
                )->format('Y-m-d H:i:s'),

            'updated_at' =>
                optional(
                    $profile->updated_at
                )->format('Y-m-d H:i:s'),
        ];
    }

    private function emptyProfile(): array
    {
        return [
            'id' => null,
            'nama_perusahaan' => '',
            'alamat' => '',
            'no_wa' => '',

            'has_fonnte_api_token' => false,
            'fonnte_api_token_masked' => null,

            'fonnte_enabled' => false,

            'fonnte_connection_status' =>
                'unchecked',

            'fonnte_connection_message' =>
                'Profil perusahaan dan token Fonnte belum disimpan.',

            'fonnte_last_checked_at' => null,
            'created_at' => null,
            'updated_at' => null,
        ];
    }

    /**
     * Hilangkan kemungkinan data sensitif dari response.
     */
    private function sanitizeFonnteResponse(
        mixed $response
    ): mixed {
        if (! is_array($response)) {
            return $response;
        }

        unset(
            $response['token'],
            $response['api_token'],
            $response['authorization'],
            $response['Authorization']
        );

        if (
            isset($response['data'])
            && is_array($response['data'])
        ) {
            unset(
                $response['data']['token'],
                $response['data']['api_token'],
                $response['data']['authorization'],
                $response['data']['Authorization']
            );
        }

        return $response;
    }

    private function maskToken(
        string $token
    ): string {
        $length = mb_strlen($token);

        if ($length <= 8) {
            return str_repeat('•', $length);
        }

        return mb_substr($token, 0, 4)
            . str_repeat(
                '•',
                max(4, $length - 8)
            )
            . mb_substr($token, -4);
    }

    private function nullableTrim(
        ?string $value
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        return $value === ''
            ? null
            : $value;
    }
}
