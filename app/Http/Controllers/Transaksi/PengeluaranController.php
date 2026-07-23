<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\JenisPembayaran;
use App\Models\Pengeluaran;
use App\Models\PengeluaranItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengeluaranController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $pengeluarans = Pengeluaran::query()
            ->with(['items.jenisPembayaran', 'deposits.jenisPembayaran'])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('tanggal', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhere('catatan_buka', 'like', "%{$search}%")
                        ->orWhere('catatan_tutup', 'like', "%{$search}%")
                        ->orWhereHas('items', function ($itemQuery) use ($search) {
                            $itemQuery->where('jenis_pengeluaran', 'like', "%{$search}%")
                                ->orWhere('deskripsi', 'like', "%{$search}%");
                        })
                        ->orWhereHas('items.jenisPembayaran', function ($paymentQuery) use ($search) {
                            $paymentQuery->where('nama', 'like', "%{$search}%")
                                ->orWhere('kode', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('tanggal')
            ->latest()
            ->get();

        $active = Pengeluaran::query()
            ->with(['items.jenisPembayaran', 'deposits.jenisPembayaran'])
            ->where('status', 'open')
            ->orderByDesc('tanggal')
            ->first();

        return response()->json([
            'message' => 'Data mutasi transaksi berhasil diambil.',
            'active' => $active ? $this->formatPengeluaran($active) : null,
            'data' => $pengeluarans
                ->map(fn ($pengeluaran) => $this->formatPengeluaran($pengeluaran))
                ->values(),
        ]);
    }

    public function paymentOptions(): JsonResponse
    {
        $data = JenisPembayaran::query()
            ->where('is_active', true)
            ->orderBy('is_cash', 'desc')
            ->orderBy('nama')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'nama' => $item->nama,
                'kode' => $item->kode,
                'is_cash' => (bool) $item->is_cash,
            ])
            ->values();

        return response()->json([
            'message' => 'Jenis pembayaran berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function active(): JsonResponse
    {
        $active = Pengeluaran::query()
            ->with(['items.jenisPembayaran', 'deposits.jenisPembayaran'])
            ->where('status', 'open')
            ->orderByDesc('tanggal')
            ->first();

        return response()->json([
            'message' => 'Kasir aktif berhasil diambil.',
            'data' => $active ? $this->formatPengeluaran($active) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOpenRequest($request);
        $tanggal = $validated['tanggal'];

        $existing = Pengeluaran::query()
            ->withTrashed()
            ->whereDate('tanggal', $tanggal)
            ->first();

        if ($existing && !$existing->trashed()) {
            return response()->json([
                'message' => $existing->status === 'open'
                    ? 'Kasir untuk tanggal ini sudah dibuka.'
                    : 'Kasir untuk tanggal ini sudah ditutup dan tidak bisa dibuka ulang.',
                'data' => $this->formatPengeluaran($existing->load(['items.jenisPembayaran', 'deposits.jenisPembayaran'])),
            ], 422);
        }

        $pengeluaran = DB::transaction(function () use ($validated, $existing) {
            if ($existing && $existing->trashed()) {
                $existing->restore();
                $existing->items()->delete();
                $existing->deposits()->delete();

                $pengeluaran = $existing;
                $pengeluaran->update([
                    'tanggal' => $validated['tanggal'],
                    'status' => 'open',
                    'opened_at' => now(),
                    'closed_at' => null,
                    'catatan_buka' => $validated['catatan_buka'] ?? null,
                    'catatan_tutup' => null,
                    'deposit_cash' => 0,
                    'total_cash' => 0,
                    'total_tf' => 0,
                    'sisa_cash' => 0,
                ]);
            } else {
                $pengeluaran = Pengeluaran::create([
                    'tanggal' => $validated['tanggal'],
                    'deposit_cash' => 0,
                    'total_cash' => 0,
                    'total_tf' => 0,
                    'sisa_cash' => 0,
                    'status' => 'open',
                    'opened_at' => now(),
                    'catatan_buka' => $validated['catatan_buka'] ?? null,
                ]);
            }

            foreach ($validated['deposits'] as $deposit) {
                $pengeluaran->deposits()->create([
                    'jenis_pembayaran_id' => $deposit['jenis_pembayaran_id'],
                    'nominal' => $this->toDecimal($deposit['nominal'] ?? 0),
                    'catatan' => $deposit['catatan'] ?? null,
                ]);
            }

            return $this->recalculateTotals($pengeluaran)
                ->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Kasir berhasil dibuka.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ], 201);
    }

    public function show(Pengeluaran $pengeluaran): JsonResponse
    {
        $pengeluaran->load(['items.jenisPembayaran', 'deposits.jenisPembayaran']);

        return response()->json([
            'message' => 'Detail mutasi transaksi berhasil diambil.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ]);
    }

    public function update(Request $request, Pengeluaran $pengeluaran): JsonResponse
    {
        if ($pengeluaran->status === 'closed') {
            return response()->json([
                'message' => 'Kasir sudah ditutup. Deposit tidak bisa diubah.',
            ], 422);
        }

        $validated = $this->validateOpenRequest($request, false);

        $pengeluaran = DB::transaction(function () use ($validated, $pengeluaran) {
            $pengeluaran->update([
                'tanggal' => $validated['tanggal'] ?? optional($pengeluaran->tanggal)->format('Y-m-d'),
                'catatan_buka' => $validated['catatan_buka'] ?? $pengeluaran->catatan_buka,
            ]);

            $pengeluaran->deposits()->delete();

            foreach ($validated['deposits'] as $deposit) {
                $pengeluaran->deposits()->create([
                    'jenis_pembayaran_id' => $deposit['jenis_pembayaran_id'],
                    'nominal' => $this->toDecimal($deposit['nominal'] ?? 0),
                    'catatan' => $deposit['catatan'] ?? null,
                ]);
            }

            return $this->recalculateTotals($pengeluaran)
                ->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Data buka kasir berhasil diperbarui.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ]);
    }

    public function storeItem(Request $request, Pengeluaran $pengeluaran): JsonResponse
    {
        if ($pengeluaran->status === 'closed') {
            return response()->json([
                'message' => 'Kasir sudah ditutup. Mutasi transaksi tidak bisa ditambahkan.',
            ], 422);
        }

        $validated = $this->validateItemRequest($request);
        $nominal = $this->toDecimal($validated['nominal'] ?? 0);

        $jenisPembayaran = JenisPembayaran::query()
            ->where('id', $validated['jenis_pembayaran_id'])
            ->firstOrFail();

        $sisaLimit = $this->getSisaLimitPembayaran($pengeluaran, (int) $jenisPembayaran->id);

        if ($nominal > $sisaLimit) {
            return response()->json([
                'message' => 'Nominal mutasi transaksi melebihi sisa limit pembayaran ' . $jenisPembayaran->nama . '.',
                'sisa_limit' => $sisaLimit,
                'sisa_limit_format' => $this->formatRupiah($sisaLimit),
            ], 422);
        }

        $pengeluaran = DB::transaction(function () use ($validated, $pengeluaran, $jenisPembayaran, $nominal) {
            $pengeluaran->items()->create([
                'tanggal' => optional($pengeluaran->tanggal)->format('Y-m-d'),
                'jenis_pengeluaran' => $validated['jenis_pengeluaran'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'metode_pembayaran' => $jenisPembayaran->kode,
                'jenis_pembayaran_id' => $jenisPembayaran->id,
                'nominal' => $nominal,
            ]);

            return $this->recalculateTotals($pengeluaran)
                ->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Mutasi transaksi berhasil ditambahkan.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ], 201);
    }

    public function updateItem(Request $request, Pengeluaran $pengeluaran, PengeluaranItem $item): JsonResponse
    {
        if ($pengeluaran->status === 'closed') {
            return response()->json([
                'message' => 'Kasir sudah ditutup. Mutasi transaksi tidak bisa diubah.',
            ], 422);
        }

        if ($item->pengeluaran_id !== $pengeluaran->id) {
            return response()->json([
                'message' => 'Item mutasi transaksi tidak sesuai dengan kasir ini.',
            ], 404);
        }

        $validated = $this->validateItemRequest($request);
        $nominal = $this->toDecimal($validated['nominal'] ?? 0);

        $jenisPembayaran = JenisPembayaran::query()
            ->where('id', $validated['jenis_pembayaran_id'])
            ->firstOrFail();

        $sisaLimit = $this->getSisaLimitPembayaran(
            $pengeluaran,
            (int) $jenisPembayaran->id,
            $item->id
        );

        if ($nominal > $sisaLimit) {
            return response()->json([
                'message' => 'Nominal mutasi transaksi melebihi sisa limit pembayaran ' . $jenisPembayaran->nama . '.',
                'sisa_limit' => $sisaLimit,
                'sisa_limit_format' => $this->formatRupiah($sisaLimit),
            ], 422);
        }

        $pengeluaran = DB::transaction(function () use ($validated, $pengeluaran, $item, $jenisPembayaran, $nominal) {
            $item->update([
                'jenis_pengeluaran' => $validated['jenis_pengeluaran'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'metode_pembayaran' => $jenisPembayaran->kode,
                'jenis_pembayaran_id' => $jenisPembayaran->id,
                'nominal' => $nominal,
            ]);

            return $this->recalculateTotals($pengeluaran)
                ->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Mutasi transaksi berhasil diperbarui.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ]);
    }

    public function destroyItem(Pengeluaran $pengeluaran, PengeluaranItem $item): JsonResponse
    {
        if ($pengeluaran->status === 'closed') {
            return response()->json([
                'message' => 'Kasir sudah ditutup. Mutasi transaksi tidak bisa dihapus.',
            ], 422);
        }

        if ($item->pengeluaran_id !== $pengeluaran->id) {
            return response()->json([
                'message' => 'Item mutasi transaksi tidak sesuai dengan kasir ini.',
            ], 404);
        }

        $pengeluaran = DB::transaction(function () use ($pengeluaran, $item) {
            $item->delete();

            return $this->recalculateTotals($pengeluaran)
                ->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Mutasi transaksi berhasil dihapus.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ]);
    }

    public function close(Request $request, Pengeluaran $pengeluaran): JsonResponse
    {
        if ($pengeluaran->status === 'closed') {
            return response()->json([
                'message' => 'Kasir sudah ditutup.',
                'data' => $this->formatPengeluaran($pengeluaran->load(['items.jenisPembayaran', 'deposits.jenisPembayaran'])),
            ], 422);
        }

        $validated = $request->validate([
            'catatan_tutup' => ['nullable', 'string'],
        ]);

        $pengeluaran = DB::transaction(function () use ($validated, $pengeluaran) {
            $pengeluaran = $this->recalculateTotals($pengeluaran);

            $pengeluaran->update([
                'status' => 'closed',
                'closed_at' => now(),
                'catatan_tutup' => $validated['catatan_tutup'] ?? null,
            ]);

            return $pengeluaran->fresh(['items.jenisPembayaran', 'deposits.jenisPembayaran']);
        });

        return response()->json([
            'message' => 'Toko berhasil ditutup. Rekap mutasi transaksi harian sudah dibuat.',
            'data' => $this->formatPengeluaran($pengeluaran),
        ]);
    }

    public function destroy(Pengeluaran $pengeluaran): JsonResponse
    {
        DB::transaction(function () use ($pengeluaran) {
            $pengeluaran->items()->delete();
            $pengeluaran->deposits()->delete();
            $pengeluaran->delete();
        });

        return response()->json([
            'message' => 'Data mutasi transaksi harian berhasil dihapus.',
        ]);
    }

    private function validateOpenRequest(Request $request, bool $requireTanggal = true): array
    {
        return $request->validate([
            'tanggal' => [$requireTanggal ? 'required' : 'nullable', 'date'],
            'deposits' => ['required', 'array', 'min:1'],
            'deposits.*.jenis_pembayaran_id' => ['required', 'exists:jenis_pembayarans,id', 'distinct'],
            'deposits.*.nominal' => ['required', 'numeric', 'min:0'],
            'deposits.*.catatan' => ['nullable', 'string'],
            'catatan_buka' => ['nullable', 'string'],
        ], [
            'tanggal.required' => 'Tanggal buka kasir wajib diisi.',
            'tanggal.date' => 'Tanggal buka kasir tidak valid.',
            'deposits.required' => 'Minimal satu jenis pembayaran wajib diisi.',
            'deposits.array' => 'Format deposit pembayaran tidak valid.',
            'deposits.min' => 'Minimal satu jenis pembayaran wajib diisi.',
            'deposits.*.jenis_pembayaran_id.required' => 'Jenis pembayaran wajib dipilih.',
            'deposits.*.jenis_pembayaran_id.exists' => 'Jenis pembayaran tidak valid.',
            'deposits.*.jenis_pembayaran_id.distinct' => 'Jenis pembayaran tidak boleh duplikat.',
            'deposits.*.nominal.required' => 'Limit / deposit wajib diisi.',
            'deposits.*.nominal.numeric' => 'Limit / deposit harus berupa angka.',
            'deposits.*.nominal.min' => 'Limit / deposit minimal 0.',
        ]);
    }

    private function validateItemRequest(Request $request): array
    {
        return $request->validate([
            'jenis_pengeluaran' => ['required', 'string', 'max:150'],
            'deskripsi' => ['nullable', 'string'],
            'jenis_pembayaran_id' => ['required', 'exists:jenis_pembayarans,id'],
            'nominal' => ['required', 'numeric', 'min:1'],
        ], [
            'jenis_pengeluaran.required' => 'Jenis mutasi transaksi wajib diisi.',
            'jenis_pengeluaran.max' => 'Jenis mutasi transaksi maksimal 150 karakter.',
            'jenis_pembayaran_id.required' => 'Jenis pembayaran wajib dipilih.',
            'jenis_pembayaran_id.exists' => 'Jenis pembayaran tidak valid.',
            'nominal.required' => 'Nominal mutasi transaksi wajib diisi.',
            'nominal.numeric' => 'Nominal mutasi transaksi harus berupa angka.',
            'nominal.min' => 'Nominal mutasi transaksi minimal 1.',
        ]);
    }

    private function recalculateTotals(Pengeluaran $pengeluaran): Pengeluaran
    {
        $pengeluaran->load(['items.jenisPembayaran', 'deposits.jenisPembayaran']);

        $totalCash = round((float) $pengeluaran->items
            ->filter(fn ($item) => optional($item->jenisPembayaran)->is_cash)
            ->sum('nominal'), 2);

        $totalTf = round((float) $pengeluaran->items
            ->filter(fn ($item) => !optional($item->jenisPembayaran)->is_cash)
            ->sum('nominal'), 2);

        $depositCash = round((float) $pengeluaran->deposits
            ->filter(fn ($deposit) => optional($deposit->jenisPembayaran)->is_cash)
            ->sum('nominal'), 2);

        $sisaCash = round($depositCash - $totalCash, 2);

        $pengeluaran->update([
            'deposit_cash' => $depositCash,
            'total_cash' => $totalCash,
            'total_tf' => $totalTf,
            'sisa_cash' => $sisaCash,
        ]);

        return $pengeluaran;
    }

    private function getSisaLimitPembayaran(
        Pengeluaran $pengeluaran,
        int $jenisPembayaranId,
        ?string $excludeItemId = null
    ): float {
        $pengeluaran->load(['deposits', 'items']);

        $deposit = round((float) $pengeluaran->deposits
            ->where('jenis_pembayaran_id', $jenisPembayaranId)
            ->sum('nominal'), 2);

        $totalTerpakai = $pengeluaran->items
            ->where('jenis_pembayaran_id', $jenisPembayaranId)
            ->when($excludeItemId, fn ($items) => $items->where('id', '!=', $excludeItemId))
            ->sum('nominal');

        return round($deposit - (float) $totalTerpakai, 2);
    }

    private function formatPengeluaran(Pengeluaran $pengeluaran): array
    {
        $pengeluaran->loadMissing(['items.jenisPembayaran', 'deposits.jenisPembayaran']);

        $itemsFormatted = $pengeluaran->items
            ->sortByDesc('created_at')
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'pengeluaran_id' => $item->pengeluaran_id,
                    'tanggal' => optional($item->tanggal)->format('Y-m-d'),
                    'jenis_pengeluaran' => $item->jenis_pengeluaran,
                    'deskripsi' => $item->deskripsi,
                    'jenis_pembayaran_id' => $item->jenis_pembayaran_id,
                    'metode_pembayaran' => $item->metode_pembayaran,
                    'jenis_pembayaran_label' => optional($item->jenisPembayaran)->nama,
                    'nominal' => $this->toDecimal($item->nominal),
                    'nominal_format' => $this->formatRupiah($item->nominal),
                    'source_type' => $item->source_type,
                    'source_id' => $item->source_id,
                    'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
                    'updated_at' => optional($item->updated_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values();

        $depositsFormatted = $pengeluaran->deposits
            ->sortBy(fn ($deposit) => optional($deposit->jenisPembayaran)->nama)
            ->map(function ($deposit) use ($pengeluaran) {
                $totalPengeluaran = round((float) $pengeluaran->items
                    ->where('jenis_pembayaran_id', $deposit->jenis_pembayaran_id)
                    ->sum('nominal'), 2);

                $nominal = $this->toDecimal($deposit->nominal);
                $sisa = round($nominal - $totalPengeluaran, 2);

                return [
                    'id' => $deposit->id,
                    'jenis_pembayaran_id' => $deposit->jenis_pembayaran_id,
                    'jenis_pembayaran_label' => optional($deposit->jenisPembayaran)->nama,
                    'kode' => optional($deposit->jenisPembayaran)->kode,
                    'is_cash' => (bool) optional($deposit->jenisPembayaran)->is_cash,
                    'nominal' => $nominal,
                    'nominal_format' => $this->formatRupiah($nominal),
                    'total_pengeluaran' => $totalPengeluaran,
                    'total_pengeluaran_format' => $this->formatRupiah($totalPengeluaran),
                    'sisa' => $sisa,
                    'sisa_format' => $this->formatRupiah($sisa),
                    'catatan' => $deposit->catatan,
                    'source_type' => $deposit->source_type,
                    'source_id' => $deposit->source_id,
                    'created_at' => optional($deposit->created_at)->format('Y-m-d H:i:s'),
                    'updated_at' => optional($deposit->updated_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values();

        $totalDeposit = round((float) $depositsFormatted->sum('nominal'), 2);
        $totalPengeluaran = round((float) $itemsFormatted->sum('nominal'), 2);
        $sisaTotal = round($totalDeposit - $totalPengeluaran, 2);

        return [
            'id' => $pengeluaran->id,
            'tanggal' => optional($pengeluaran->tanggal)->format('Y-m-d'),

            'deposit_cash' => $this->toDecimal($pengeluaran->deposit_cash),
            'total_cash' => $this->toDecimal($pengeluaran->total_cash),
            'total_tf' => $this->toDecimal($pengeluaran->total_tf),
            'sisa_cash' => $this->toDecimal($pengeluaran->sisa_cash),

            'total_deposit' => $totalDeposit,
            'total_deposit_format' => $this->formatRupiah($totalDeposit),
            'total_pengeluaran' => $totalPengeluaran,
            'total_pengeluaran_format' => $this->formatRupiah($totalPengeluaran),
            'sisa_total' => $sisaTotal,
            'sisa_total_format' => $this->formatRupiah($sisaTotal),

            'status' => $pengeluaran->status,
            'opened_at' => optional($pengeluaran->opened_at)->format('Y-m-d H:i:s'),
            'closed_at' => optional($pengeluaran->closed_at)->format('Y-m-d H:i:s'),
            'catatan_buka' => $pengeluaran->catatan_buka,
            'catatan_tutup' => $pengeluaran->catatan_tutup,

            'deposits' => $depositsFormatted,
            'items' => $itemsFormatted,

            'created_at' => optional($pengeluaran->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($pengeluaran->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($pengeluaran->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function toDecimal($value): float
    {
        if ($value === null || $value === '') {
            return 0.00;
        }

        if (is_int($value) || is_float($value)) {
            return round((float) $value, 2);
        }

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' '], '', $value);

        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } else {
            $value = str_replace(',', '.', $value);
        }

        if (!is_numeric($value)) {
            return 0.00;
        }

        return round((float) $value, 2);
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }
}
