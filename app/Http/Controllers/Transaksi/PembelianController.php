<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\DataBarang;
use App\Models\JenisPembayaran;
use App\Models\DataKaryawan;
use App\Models\DataCustomer;
use App\Models\Pembelian;
use App\Models\Pengeluaran;
use App\Models\PengeluaranItem;
use App\Models\StockMovement;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class PembelianController extends Controller
{
    private const FONNTE_SEND_URL = 'https://api.fonnte.com/send';

    private const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ], [
            'start_date.date' => 'Format tanggal dari tidak valid.',
            'end_date.date' => 'Format tanggal sampai tidak valid.',
            'end_date.after_or_equal' => 'Tanggal sampai tidak boleh lebih kecil dari tanggal dari.',
        ]);

        $search = $validated['search'] ?? null;
        $startDate = $validated['start_date'] ?? now()->toDateString();
        $endDate = $validated['end_date'] ?? $startDate;

        $pembelians = Pembelian::query()
            ->with(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer'])
            ->whereDate('tanggal', '>=', $startDate)
            ->whereDate('tanggal', '<=', $endDate)
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nomor_nota', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery->where('nama_customer', 'like', "%{$search}%")
                                ->orWhere('no_wa', 'like', "%{$search}%")
                                ->orWhere('alamat', 'like', "%{$search}%");
                        })
                        ->orWhere('tanggal', 'like', "%{$search}%")
                        ->orWhere('total_akhir', 'like', "%{$search}%")
                        ->orWhereHas('items', function ($itemQuery) use ($search) {
                            $itemQuery->where('kode_barang', 'like', "%{$search}%")
                                ->orWhere('jenis_barang', 'like', "%{$search}%")
                                ->orWhereHas('dataBarang', function ($barangQuery) use ($search) {
                                    $barangQuery->where('kode', 'like', "%{$search}%")
                                        ->orWhere('nama_barang', 'like', "%{$search}%");
                                });
                        })
                        ->orWhereHas('catatans', function ($catatanQuery) use ($search) {
                            $catatanQuery->where('catatan', 'like', "%{$search}%")
                                ->orWhere('nominal', 'like', "%{$search}%");
                        })
                        ->orWhereHas('jenisPembayaran', function ($paymentQuery) use ($search) {
                            $paymentQuery->where('nama', 'like', "%{$search}%")
                                ->orWhere('kode', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('tanggal')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'message' => 'Data pembelian berhasil diambil.',
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'data' => $pembelians
                ->map(fn ($pembelian) => $this->formatPembelian($pembelian))
                ->values(),
        ]);
    }

    public function barangOptions(): JsonResponse
    {
        $barangs = DataBarang::query()
            ->orderBy('nama_barang')
            ->get(['id', 'kode', 'nama_barang']);

        return response()->json([
            'message' => 'Data barang berhasil diambil.',
            'data' => $barangs->map(function ($barang) {
                return [
                    'id' => (string) $barang->id,
                    'kode' => $barang->kode ?? '-',
                    'kode_barang' => $barang->kode ?? '-',
                    'nama_barang' => $barang->nama_barang,
                    'harga' => 0,
                ];
            })->values(),
        ]);
    }


    public function customerOptions(): JsonResponse
    {
        $customers = DataCustomer::query()
            ->orderBy('nama_customer')
            ->get(['id', 'nama_customer', 'no_wa', 'alamat']);

        return response()->json([
            'message' => 'Data customer berhasil diambil.',
            'data' => $customers->map(fn ($customer) => [
                'id' => (string) $customer->id,
                'nama_customer' => $customer->nama_customer,
                'no_wa' => $customer->no_wa,
                'alamat' => $customer->alamat,
            ])->values(),
        ]);
    }


    public function karyawanOptions(): JsonResponse
    {
        $karyawans = DataKaryawan::query()
            ->orderBy('nama')
            ->get(['id', 'nama', 'no_wa']);

        return response()->json([
            'message' => 'Data karyawan berhasil diambil.',
            'data' => $karyawans->map(fn ($karyawan) => [
                'id' => (string) $karyawan->id,
                'nama' => $karyawan->nama,
                'no_wa' => $karyawan->no_wa,
            ])->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $pembelian = DB::transaction(function () use ($validated) {
            $items = $this->prepareItems($validated['items']);

            $catatanTransaksiItems = $this->prepareCatatans(
                $validated['catatan_transaksi_items'] ?? [],
                'transaksi'
            );

            $catatanPowerBoxItems = $this->prepareCatatans(
                $validated['catatan_power_box_items'] ?? [],
                'power_box'
            );

            $totals = $this->calculateTotals(
                $items,
                $catatanTransaksiItems,
                $catatanPowerBoxItems,
                $validated['penyesuaian'] ?? 0
            );

            $paymentContext = $this->resolvePaymentContext(
                $validated['tanggal'],
                (string) $validated['jenis_pembayaran_id'],
                $totals['total_akhir']
            );

            $pembelian = Pembelian::create([
                'nomor_nota' => $this->generateNomorNota(),
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $paymentContext['jenis_pembayaran']->id,
                'metode_pembayaran' => $paymentContext['jenis_pembayaran']->kode,
                'subtotal' => $totals['subtotal'],

                'catatan_transaksi' => collect($catatanTransaksiItems)
                    ->pluck('catatan')
                    ->filter()
                    ->implode("\n"),
                'nilai_catatan_transaksi' => $totals['total_catatan_transaksi'],

                'catatan_power_box' => collect($catatanPowerBoxItems)
                    ->pluck('catatan')
                    ->filter()
                    ->implode("\n"),
                'nilai_catatan_power_box' => $totals['total_power_box'],

                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'] ?? null,
            ]);

            $pembelian->items()->createMany($items);

            $pembelian->catatans()->createMany([
                ...$catatanTransaksiItems,
                ...$catatanPowerBoxItems,
            ]);

            $pembelian = $pembelian->fresh(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer']);

            $this->syncStockMovements($pembelian);
            $this->syncPembelianMutasi($pembelian);

            return $pembelian;
        });

        $whatsappResult = $this->sendNotaWhatsapp($pembelian);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data pembelian berhasil ditambahkan dan nota berhasil dikirim melalui WhatsApp.'
                : 'Data pembelian berhasil ditambahkan, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatPembelian($pembelian),
            'whatsapp' => $whatsappResult,
        ], 201);
    }

    public function show(Pembelian $pembelian): JsonResponse
    {
        $pembelian->load(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer']);

        return response()->json([
            'message' => 'Detail pembelian berhasil diambil.',
            'data' => $this->formatPembelian($pembelian),
        ]);
    }

    public function update(Request $request, Pembelian $pembelian): JsonResponse
    {
        $validated = $this->validateRequest($request, $pembelian);

        $pembelian = DB::transaction(function () use ($validated, $pembelian) {
            $items = $this->prepareItems($validated['items']);

            $catatanTransaksiItems = $this->prepareCatatans(
                $validated['catatan_transaksi_items'] ?? [],
                'transaksi'
            );

            $catatanPowerBoxItems = $this->prepareCatatans(
                $validated['catatan_power_box_items'] ?? [],
                'power_box'
            );

            $totals = $this->calculateTotals(
                $items,
                $catatanTransaksiItems,
                $catatanPowerBoxItems,
                $validated['penyesuaian'] ?? 0
            );

            $paymentContext = $this->resolvePaymentContext(
                $validated['tanggal'],
                (string) $validated['jenis_pembayaran_id'],
                $totals['total_akhir'],
                $pembelian->id
            );

            $pembelian->update([
                'nomor_nota' => $pembelian->nomor_nota,
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $paymentContext['jenis_pembayaran']->id,
                'metode_pembayaran' => $paymentContext['jenis_pembayaran']->kode,
                'subtotal' => $totals['subtotal'],

                'catatan_transaksi' => collect($catatanTransaksiItems)
                    ->pluck('catatan')
                    ->filter()
                    ->implode("\n"),
                'nilai_catatan_transaksi' => $totals['total_catatan_transaksi'],

                'catatan_power_box' => collect($catatanPowerBoxItems)
                    ->pluck('catatan')
                    ->filter()
                    ->implode("\n"),
                'nilai_catatan_power_box' => $totals['total_power_box'],

                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'] ?? null,
            ]);

            StockMovement::query()
                ->where('source_type', 'pembelian')
                ->where('source_id', $pembelian->id)
                ->delete();

            $pembelian->items()->delete();
            $pembelian->catatans()->delete();

            $pembelian->items()->createMany($items);

            $pembelian->catatans()->createMany([
                ...$catatanTransaksiItems,
                ...$catatanPowerBoxItems,
            ]);

            $pembelian = $pembelian->fresh(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer']);

            $this->syncStockMovements($pembelian);
            $this->syncPembelianMutasi($pembelian);

            return $pembelian;
        });

        $whatsappResult = $this->sendNotaWhatsapp($pembelian);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data pembelian berhasil diperbarui dan nota berhasil dikirim melalui WhatsApp.'
                : 'Data pembelian berhasil diperbarui, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatPembelian($pembelian),
            'whatsapp' => $whatsappResult,
        ]);
    }

    public function destroy(Pembelian $pembelian): JsonResponse
    {
        DB::transaction(function () use ($pembelian) {
            StockMovement::query()
                ->where('source_type', 'pembelian')
                ->where('source_id', $pembelian->id)
                ->delete();

            $pengeluaranIds = PengeluaranItem::query()
                ->where('source_type', 'pembelian')
                ->where('source_id', $pembelian->id)
                ->pluck('pengeluaran_id')
                ->filter()
                ->unique()
                ->values();

            PengeluaranItem::query()
                ->where('source_type', 'pembelian')
                ->where('source_id', $pembelian->id)
                ->delete();

            foreach ($pengeluaranIds as $pengeluaranId) {
                $pengeluaran = Pengeluaran::query()->find($pengeluaranId);

                if ($pengeluaran) {
                    $this->recalculatePengeluaranTotals($pengeluaran);
                }
            }

            $pembelian->items()->delete();
            $pembelian->catatans()->delete();

            $pembelian->forceDelete();
        });

        return response()->json([
            'message' => 'Data pembelian berhasil dihapus permanen.',
        ]);
    }

    private function validateRequest(Request $request, ?Pembelian $pembelian = null): array
    {
        $request->merge([
            'nomor_nota' => null,
            'jenis_pembayaran_id' => trim(
                (string) $request->input('jenis_pembayaran_id', '')
            ),
            'penyesuaian' => $this->toDecimal($request->input('penyesuaian', 0)),

            'items' => collect($request->input('items', []))
                ->map(function ($item) {
                    return [
                        'data_barang_id' => $item['data_barang_id'] ?? null,
                        'jenis_barang' => $item['jenis_barang'] ?? 'mentah',
                        'qty' => $this->toDecimal($item['qty'] ?? 0),
                        'harga' => $this->toInteger($item['harga'] ?? 0),
                    ];
                })
                ->values()
                ->toArray(),

            /*
            |--------------------------------------------------------------------------
            | Catatan Transaksi biasa
            |--------------------------------------------------------------------------
            | Tidak lagi menyimpan karyawan dan pembagian fee.
            | Karyawan + pembagian fee dipindahkan ke Catatan Transaksi Power Box Group.
            */
            'catatan_transaksi_items' => collect($request->input('catatan_transaksi_items', []))
                ->map(function ($item) {
                    return [
                        'catatan' => $item['catatan'] ?? null,
                        'nominal' => $this->toDecimal($item['nominal'] ?? 0),
                    ];
                })
                ->filter(fn ($item) => filled($item['catatan']) || $item['nominal'] > 0)
                ->values()
                ->toArray(),

            /*
            |--------------------------------------------------------------------------
            | Catatan Transaksi Power Box Group
            |--------------------------------------------------------------------------
            | Di sinilah pilihan karyawan dan pembagian fee disimpan.
            */
            'catatan_power_box_items' => collect($request->input('catatan_power_box_items', []))
                ->map(function ($item) {
                    return [
                        'catatan' => $item['catatan'] ?? null,
                        'nominal' => $this->toDecimal($item['nominal'] ?? 0),
                        'karyawan_ids' => collect($item['karyawan_ids'] ?? [])
                            ->filter()
                            ->map(fn ($id) => (string) $id)
                            ->unique()
                            ->values()
                            ->toArray(),
                    ];
                })
                ->filter(fn ($item) => filled($item['catatan']) || $item['nominal'] > 0 || !empty($item['karyawan_ids']))
                ->values()
                ->toArray(),
        ]);

        return $request->validate([
            'customer_id' => [
                'required',
                'uuid',
                Rule::exists('data_customers', 'id')->whereNull('deleted_at'),
            ],
            'tanggal' => ['required', 'date'],
            'jenis_pembayaran_id' => [
                'required',
                'uuid',
                Rule::exists('jenis_pembayarans', 'id')
                    ->where(fn ($query) => $query->where('is_active', true)),
            ],
            'penyesuaian' => ['nullable', 'numeric'],
            'catatan' => ['nullable', 'string'],
            'kota' => ['nullable', 'string', 'max:100'],
            'tanggal_ttd' => ['nullable', 'date'],
            'nama_ttd' => ['required', 'string', 'max:150'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.data_barang_id' => ['required', 'uuid', Rule::exists('data_barangs', 'id')],
            'items.*.jenis_barang' => ['required', 'string', Rule::in(['mentah', 'jadi'])],
            'items.*.qty' => ['required', 'numeric', 'min:0.01', 'decimal:0,2'],
            'items.*.harga' => ['required', 'integer', 'min:0'],

            'catatan_transaksi_items' => ['nullable', 'array'],
            'catatan_transaksi_items.*.catatan' => ['nullable', 'string'],
            'catatan_transaksi_items.*.nominal' => ['nullable', 'numeric', 'min:0'],

            'catatan_power_box_items' => ['nullable', 'array'],
            'catatan_power_box_items.*.catatan' => ['nullable', 'string'],
            'catatan_power_box_items.*.nominal' => ['nullable', 'numeric', 'min:0'],
            'catatan_power_box_items.*.karyawan_ids' => ['nullable', 'array'],
            'catatan_power_box_items.*.karyawan_ids.*' => ['uuid', Rule::exists('data_karyawans', 'id')->whereNull('deleted_at')],
        ], [
            'customer_id.required' => 'Data customer wajib dipilih.',
            'customer_id.uuid' => 'Format ID customer tidak valid.',
            'customer_id.exists' => 'Data customer tidak ditemukan atau sudah dihapus.',
            'tanggal.required' => 'Tanggal wajib diisi.',
            'tanggal.date' => 'Format tanggal tidak valid.',
            'jenis_pembayaran_id.required' => 'Jenis pembayaran wajib dipilih.',
            'jenis_pembayaran_id.uuid' => 'Format ID jenis pembayaran tidak valid.',
            'jenis_pembayaran_id.exists' => 'Jenis pembayaran tidak valid atau tidak aktif.',

            'items.required' => 'Minimal satu produk harus diisi.',
            'items.array' => 'Format produk tidak valid.',
            'items.min' => 'Minimal satu produk harus diisi.',

            'items.*.data_barang_id.required' => 'Barang wajib dipilih.',
            'items.*.data_barang_id.uuid' => 'ID barang harus berupa UUID.',
            'items.*.data_barang_id.exists' => 'Barang tidak ditemukan di database.',

            'items.*.jenis_barang.required' => 'Status barang wajib dipilih.',
            'items.*.jenis_barang.in' => 'Status barang harus Barang Mentah atau Barang Jadi.',

            'items.*.qty.required' => 'Qty wajib diisi.',
            'items.*.qty.numeric' => 'Qty harus berupa angka.',
            'items.*.qty.min' => 'Qty minimal 0.01.',
            'items.*.qty.decimal' => 'Qty maksimal 2 angka di belakang koma.',

            'items.*.harga.required' => 'Harga wajib diisi.',
            'items.*.harga.integer' => 'Harga harus berupa angka bulat.',
            'items.*.harga.min' => 'Harga minimal 0.',

            'catatan_transaksi_items.*.nominal.numeric' => 'Nominal catatan transaksi harus berupa angka.',
            'catatan_transaksi_items.*.nominal.min' => 'Nominal catatan transaksi minimal 0.',

            'catatan_power_box_items.*.nominal.numeric' => 'Nominal catatan Power Box harus berupa angka.',
            'catatan_power_box_items.*.nominal.min' => 'Nominal catatan Power Box minimal 0.',
            'catatan_power_box_items.*.karyawan_ids.array' => 'Format pilihan karyawan Power Box tidak valid.',
            'catatan_power_box_items.*.karyawan_ids.*.exists' => 'Karyawan Power Box yang dipilih tidak valid.',
        ]);
    }

    private function prepareItems(array $items): array
    {
        $barangIds = collect($items)
            ->pluck('data_barang_id')
            ->filter()
            ->unique()
            ->values();

        $barangs = DataBarang::query()
            ->whereIn('id', $barangIds)
            ->get(['id', 'kode', 'nama_barang'])
            ->keyBy('id');

        return collect($items)
            ->map(function ($item) use ($barangs) {
                $barang = $barangs->get($item['data_barang_id']);

                $qty = max(0.01, $this->toDecimal($item['qty'] ?? 0));
                $harga = max(0, $this->toInteger($item['harga'] ?? 0));
                $total = round($qty * $harga, 2);

                return [
                    'data_barang_id' => $barang?->id,
                    'kode_barang' => $barang?->kode ?? '-',
                    'jenis_barang' => $item['jenis_barang'] ?? 'mentah',
                    'qty' => $qty,
                    'harga' => $harga,
                    'total' => $total,
                ];
            })
            ->values()
            ->toArray();
    }

    private function prepareCatatans(array $items, string $tipe): array
    {
        return collect($items)
            ->map(function ($item) use ($tipe) {
                $isPowerBox = $tipe === 'power_box';

                $karyawanIds = $isPowerBox
                    ? collect($item['karyawan_ids'] ?? [])
                        ->filter()
                        ->map(fn ($id) => (string) $id)
                        ->unique()
                        ->values()
                        ->toArray()
                    : [];

                $nominal = max(0, $this->toDecimal($item['nominal'] ?? 0));
                $jumlahKaryawan = count($karyawanIds);

                return [
                    'tipe' => $tipe,
                    'catatan' => $item['catatan'] ?? null,
                    'nominal' => $nominal,
                    'karyawan_ids' => $isPowerBox ? $karyawanIds : null,
                    'nominal_per_karyawan' => $isPowerBox && $jumlahKaryawan > 0
                        ? round($nominal / $jumlahKaryawan, 2)
                        : 0,
                ];
            })
            ->filter(fn ($item) => filled($item['catatan']) || $item['nominal'] > 0 || !empty($item['karyawan_ids']))
            ->values()
            ->toArray();
    }

    private function calculateTotals(
        array $items,
        array $catatanTransaksiItems,
        array $catatanPowerBoxItems,
        mixed $penyesuaianValue
    ): array {
        $subtotal = round((float) collect($items)->sum('total'), 2);

        // Catatan Transaksi = PENAMBAH total
        $totalCatatanTransaksi = round((float) collect($catatanTransaksiItems)->sum('nominal'), 2);

        // Catatan Transaksi Power Box Group = PENGURANG total
        $totalPowerBox = round((float) collect($catatanPowerBoxItems)->sum('nominal'), 2);

        $penyesuaian = $this->toDecimal($penyesuaianValue);

        $totalAkhir = round(
            $subtotal + $totalCatatanTransaksi - $totalPowerBox + $penyesuaian,
            2
        );

        return [
            'subtotal' => $subtotal,
            'total_catatan_transaksi' => $totalCatatanTransaksi,
            'total_power_box' => $totalPowerBox,
            'penyesuaian' => $penyesuaian,
            'total_akhir' => $totalAkhir,
        ];
    }


    private function resolvePaymentContext(
        string $tanggal,
        string $jenisPembayaranId,
        float $totalAkhir,
        ?string $excludePembelianId = null
    ): array {
        $jenisPembayaran = JenisPembayaran::query()
            ->where('id', $jenisPembayaranId)
            ->where('is_active', true)
            ->first();

        if (!$jenisPembayaran) {
            abort(422, 'Jenis pembayaran tidak valid atau tidak aktif.');
        }

        $pengeluaran = Pengeluaran::query()
            ->with(['deposits', 'items'])
            ->whereDate('tanggal', $tanggal)
            ->where('status', 'open')
            ->orderByDesc('tanggal')
            ->first();

        if (!$pengeluaran) {
            abort(422, 'Deposit mutasi kasir untuk tanggal ' . $tanggal . ' belum dibuat atau kasir sudah ditutup. Buka kasir terlebih dahulu di menu Mutasi Transaksi.');
        }

        $deposit = round((float) $pengeluaran->deposits
            ->where('jenis_pembayaran_id', $jenisPembayaranId)
            ->sum('nominal'), 2);

        if ($deposit <= 0) {
            abort(422, 'Deposit untuk jenis pembayaran ' . $jenisPembayaran->nama . ' pada tanggal ' . $tanggal . ' belum dibuat.');
        }

        $itemsTerpakai = $pengeluaran->items
            ->where('jenis_pembayaran_id', $jenisPembayaranId);

        if ($excludePembelianId) {
            $itemsTerpakai = $itemsTerpakai->reject(function ($item) use ($excludePembelianId) {
                return $item->source_type === 'pembelian'
                    && (string) $item->source_id === (string) $excludePembelianId;
            });
        }

        $totalTerpakai = round((float) $itemsTerpakai->sum('nominal'), 2);
        $sisaLimit = round($deposit - $totalTerpakai, 2);

        if ($totalAkhir > $sisaLimit) {
            abort(422, 'Saldo deposit ' . $jenisPembayaran->nama . ' tidak cukup untuk pembelian ini. Sisa saldo: ' . $this->formatRupiah($sisaLimit) . ', total pembelian: ' . $this->formatRupiah($totalAkhir) . '.');
        }

        return [
            'pengeluaran' => $pengeluaran,
            'jenis_pembayaran' => $jenisPembayaran,
            'deposit' => $deposit,
            'total_terpakai' => $totalTerpakai,
            'sisa_limit' => $sisaLimit,
        ];
    }

    private function syncPembelianMutasi(Pembelian $pembelian): void
    {
        $pembelian->loadMissing(['jenisPembayaran', 'customer']);

        $oldPengeluaranIds = PengeluaranItem::query()
            ->where('source_type', 'pembelian')
            ->where('source_id', $pembelian->id)
            ->pluck('pengeluaran_id')
            ->filter()
            ->unique()
            ->values();

        PengeluaranItem::query()
            ->where('source_type', 'pembelian')
            ->where('source_id', $pembelian->id)
            ->delete();

        foreach ($oldPengeluaranIds as $pengeluaranId) {
            $oldPengeluaran = Pengeluaran::query()->find($pengeluaranId);

            if ($oldPengeluaran) {
                $this->recalculatePengeluaranTotals($oldPengeluaran);
            }
        }

        $paymentContext = $this->resolvePaymentContext(
            optional($pembelian->tanggal)->format('Y-m-d'),
            (string) $pembelian->jenis_pembayaran_id,
            $this->toDecimal($pembelian->total_akhir),
            $pembelian->id
        );

        $paymentContext['pengeluaran']->items()->create([
            'tanggal' => optional($pembelian->tanggal)->format('Y-m-d'),
            'jenis_pengeluaran' => 'Pembelian',
            'deskripsi' => trim('Pembelian ' . ($pembelian->nomor_nota ?: '-') . ' - ' . ($pembelian->customer?->nama_customer ?: '-')),
            'metode_pembayaran' => $paymentContext['jenis_pembayaran']->kode,
            'jenis_pembayaran_id' => $paymentContext['jenis_pembayaran']->id,
            'nominal' => $this->toDecimal($pembelian->total_akhir),
            'catatan' => 'Otomatis dari transaksi pembelian.',
            'source_type' => 'pembelian',
            'source_id' => $pembelian->id,
        ]);

        $this->recalculatePengeluaranTotals($paymentContext['pengeluaran']);
    }

    private function recalculatePengeluaranTotals(Pengeluaran $pengeluaran): Pengeluaran
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

    private function syncStockMovements(Pembelian $pembelian): void
    {
        StockMovement::query()
            ->where('source_type', 'pembelian')
            ->where('source_id', $pembelian->id)
            ->delete();

        $pembelian->loadMissing(['items.dataBarang']);

        foreach ($pembelian->items as $item) {
            StockMovement::create([
                'data_barang_id' => $item->data_barang_id,
                'barang_variant_id' => null,
                'jenis_barang' => $item->jenis_barang ?: 'mentah',
                'qty_masuk' => $this->toDecimal($item->qty),
                'qty_keluar' => 0,
                'source_type' => 'pembelian',
                'source_id' => $pembelian->id,
                'source_item_id' => $item->id,
                'source_output_id' => null,
                'tanggal' => $pembelian->tanggal,
                'keterangan' => $pembelian->nomor_nota . ' - pembelian ' . $this->jenisBarangLabel($item->jenis_barang),
            ]);
        }
    }

    private function formatPembelian(Pembelian $pembelian): array
    {
        $pembelian->loadMissing(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer']);

        $catatans = $pembelian->catatans ?? collect();

        /*
        |--------------------------------------------------------------------------
        | Karyawan fee sekarang diambil dari Catatan Transaksi Power Box Group.
        |--------------------------------------------------------------------------
        */
        $karyawanIds = $catatans
            ->where('tipe', 'power_box')
            ->flatMap(fn ($item) => $item->karyawan_ids ?? [])
            ->filter()
            ->unique()
            ->values();

        $karyawans = DataKaryawan::query()
            ->whereIn('id', $karyawanIds)
            ->get(['id', 'nama', 'no_wa'])
            ->keyBy(fn ($karyawan) => (string) $karyawan->id);

        $catatanTransaksiItems = $catatans
            ->where('tipe', 'transaksi')
            ->map(function ($item) {
                $nominal = $this->toDecimal($item->nominal);

                return [
                    'id' => $item->id,
                    'catatan' => $item->catatan,
                    'nominal' => $nominal,
                    'karyawan_ids' => collect()->values(),
                    'jumlah_karyawan' => 0,
                    'nominal_per_karyawan' => 0,
                    'karyawans' => collect()->values(),
                ];
            })
            ->values();

        $catatanPowerBoxItems = $catatans
            ->where('tipe', 'power_box')
            ->map(function ($item) use ($karyawans) {
                $selectedIds = collect($item->karyawan_ids ?? [])
                    ->filter()
                    ->map(fn ($id) => (string) $id)
                    ->unique()
                    ->values();

                $nominal = $this->toDecimal($item->nominal);
                $jumlahKaryawan = $selectedIds->count();
                $nominalPerKaryawan = $jumlahKaryawan > 0
                    ? round($nominal / $jumlahKaryawan, 2)
                    : 0;

                return [
                    'id' => $item->id,
                    'catatan' => $item->catatan,
                    'nominal' => $nominal,
                    'karyawan_ids' => $selectedIds->values(),
                    'jumlah_karyawan' => $jumlahKaryawan,
                    'nominal_per_karyawan' => $nominalPerKaryawan,
                    'nominal_per_karyawan_format' => $this->formatRupiah($nominalPerKaryawan),
                    'karyawans' => $selectedIds
                        ->map(function ($id) use ($karyawans, $nominalPerKaryawan) {
                            $karyawan = $karyawans->get((string) $id);

                            return [
                                'id' => (string) $id,
                                'nama' => $karyawan?->nama ?? '-',
                                'no_wa' => $karyawan?->no_wa,
                                'nominal_bagian' => $nominalPerKaryawan,
                                'nominal_bagian_format' => $this->formatRupiah($nominalPerKaryawan),
                            ];
                        })
                        ->values(),
                ];
            })
            ->values();

        return [
            'id' => $pembelian->id,
            'nomor_nota' => $pembelian->nomor_nota,
            'customer_id' => $pembelian->customer_id,
            'customer' => $pembelian->customer ? [
                'id' => (string) $pembelian->customer->id,
                'nama_customer' => $pembelian->customer->nama_customer,
                'no_wa' => $pembelian->customer->no_wa,
                'alamat' => $pembelian->customer->alamat,
            ] : null,
            'nama_customer' => $pembelian->customer?->nama_customer,
            'no_wa_customer' => $pembelian->customer?->no_wa,
            'tanggal' => optional($pembelian->tanggal)->format('Y-m-d'),
            'jenis_pembayaran_id' => $pembelian->jenis_pembayaran_id,
            'metode_pembayaran' => $pembelian->metode_pembayaran,
            'jenis_pembayaran_label' => optional($pembelian->jenisPembayaran)->nama,

            'subtotal' => $this->toDecimal($pembelian->subtotal),

            'catatan_transaksi' => $pembelian->catatan_transaksi,
            'nilai_catatan_transaksi' => $this->toDecimal($pembelian->nilai_catatan_transaksi),

            'catatan_power_box' => $pembelian->catatan_power_box,
            'nilai_catatan_power_box' => $this->toDecimal($pembelian->nilai_catatan_power_box),

            'catatan_transaksi_items' => $catatanTransaksiItems,
            'catatan_power_box_items' => $catatanPowerBoxItems,

            'penyesuaian' => $this->toDecimal($pembelian->penyesuaian),
            'total_akhir' => $this->toDecimal($pembelian->total_akhir),

            'catatan' => $pembelian->catatan,
            'kota' => $pembelian->kota,
            'tanggal_ttd' => optional($pembelian->tanggal_ttd)->format('Y-m-d'),
            'nama_ttd' => $pembelian->nama_ttd,

            'items' => $pembelian->items
                ->map(function ($item) {
                    $barang = $item->dataBarang;
                    $jenisBarang = $item->jenis_barang ?: 'mentah';

                    return [
                        'id' => $item->id,
                        'pembelian_id' => $item->pembelian_id,
                        'data_barang_id' => $item->data_barang_id,
                        'kode_barang' => $item->kode_barang ?: ($barang?->kode ?? '-'),
                        'nama_barang' => $barang?->nama_barang ?? '-',
                        'jenis_barang' => $jenisBarang,
                        'jenis_barang_label' => $this->jenisBarangLabel($jenisBarang),
                        'qty' => $this->toDecimal($item->qty),
                        'harga' => $this->toInteger($item->harga),
                        'total' => $this->toDecimal($item->total),
                    ];
                })
                ->values(),

            'created_at' => optional($pembelian->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($pembelian->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($pembelian->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }


    private function sendNotaWhatsapp(Pembelian $pembelian): array
    {
        $pembelian->loadMissing(['items.dataBarang', 'catatans', 'jenisPembayaran', 'customer']);

        $target = $this->normalizeWhatsappNumber($pembelian->customer?->no_wa);

        if (!$target) {
            return $this->whatsappResult(
                false,
                'target_invalid',
                'Nota WhatsApp tidak dikirim karena nomor WhatsApp customer kosong atau tidak valid.'
            );
        }

        $profile = CompanyProfile::query()->first();

        if (!$profile) {
            return $this->whatsappResult(
                false,
                'company_profile_missing',
                'Profil perusahaan belum dibuat.',
                $target
            );
        }

        if (!$profile->fonnte_enabled) {
            return $this->whatsappResult(
                false,
                'fonnte_disabled',
                'Integrasi Fonnte belum diaktifkan pada Profil Perusahaan.',
                $target,
                $profile
            );
        }

        $token = trim((string) $profile->fonnte_api_token);

        if ($token === '') {
            return $this->whatsappResult(
                false,
                'fonnte_token_empty',
                'Token API Fonnte belum diisi pada Profil Perusahaan.',
                $target,
                $profile
            );
        }

        $nomorPerusahaan = $this->normalizeWhatsappNumber($profile->no_wa);

        if (!$nomorPerusahaan) {
            return $this->whatsappResult(
                false,
                'company_number_invalid',
                'Nomor WhatsApp perusahaan kosong atau tidak valid.',
                $target,
                $profile
            );
        }

        $deviceResult = $this->checkFonnteDevice($token);

        if (!$deviceResult['success']) {
            $this->updateCompanyFonnteStatus(
                $profile,
                'disconnected',
                $deviceResult['message'],
                false
            );

            return $this->whatsappResult(
                false,
                'fonnte_disconnected',
                $deviceResult['message'],
                $target,
                $profile->fresh(),
                $deviceResult['response']
            );
        }

        $nomorDevice = $this->normalizeWhatsappNumber($deviceResult['device_number']);

        if ($nomorDevice && $nomorDevice !== $nomorPerusahaan) {
            $message = "Token Fonnte terhubung ke nomor {$nomorDevice}, sedangkan nomor perusahaan adalah {$nomorPerusahaan}.";

            $this->updateCompanyFonnteStatus(
                $profile,
                'mismatch',
                $message,
                false
            );

            return $this->whatsappResult(
                false,
                'device_number_mismatch',
                $message,
                $target,
                $profile->fresh(),
                $deviceResult['response']
            );
        }

        $this->updateCompanyFonnteStatus(
            $profile,
            'connected',
            'Token Fonnte valid dan device perusahaan terhubung.',
            true
        );

        $profile = $profile->fresh();
        $message = $this->buildNotaWhatsappMessage($pembelian, $profile);

        try {
            $response = Http::withoutVerifying()
                ->withOptions(['verify' => false])
                ->acceptJson()
                ->asForm()
                ->withHeaders([
                    'Authorization' => $token,
                ])
                ->connectTimeout((int) env('FONNTE_CONNECT_TIMEOUT', 10))
                ->timeout((int) env('FONNTE_TIMEOUT', 30))
                ->post(
                    env('FONNTE_SEND_URL', self::FONNTE_SEND_URL),
                    [
                        'target' => $target,
                        'message' => $message,
                        'countryCode' => '62',
                    ]
                );

            $json = $response->json();
            $responseData = is_array($json)
                ? $json
                : ['raw_body' => $response->body()];

            if (!$response->successful()) {
                $errorMessage = (string) (
                    $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte mengembalikan HTTP ' . $response->status() . '.'
                );

                Log::error('HTTP Fonnte gagal mengirim nota pembelian.', [
                    'pembelian_id' => $pembelian->id,
                    'nomor_nota' => $pembelian->nomor_nota,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'http_status' => $response->status(),
                    'response' => $this->sanitizeFonnteResponse($responseData),
                ]);

                return $this->whatsappResult(
                    false,
                    'http_error',
                    $errorMessage,
                    $target,
                    $profile,
                    $responseData,
                    $response->status()
                );
            }

            $apiSuccess = filter_var(
                $responseData['status'] ?? $responseData['success'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            if (!$apiSuccess) {
                $errorMessage = (string) (
                    $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte menolak pengiriman nota WhatsApp.'
                );

                Log::error('Fonnte menolak pengiriman nota pembelian.', [
                    'pembelian_id' => $pembelian->id,
                    'nomor_nota' => $pembelian->nomor_nota,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'response' => $this->sanitizeFonnteResponse($responseData),
                ]);

                return $this->whatsappResult(
                    false,
                    'api_rejected',
                    $errorMessage,
                    $target,
                    $profile,
                    $responseData,
                    $response->status()
                );
            }

            Log::info('Nota pembelian berhasil dikirim melalui Fonnte.', [
                'pembelian_id' => $pembelian->id,
                'nomor_nota' => $pembelian->nomor_nota,
                'sender' => $nomorPerusahaan,
                'target' => $target,
                'http_status' => $response->status(),
                'response' => $this->sanitizeFonnteResponse($responseData),
            ]);

            return $this->whatsappResult(
                true,
                'sent',
                'Nota pembelian berhasil dikirim melalui WhatsApp.',
                $target,
                $profile,
                $responseData,
                $response->status()
            );
        } catch (ConnectionException $exception) {
            Log::error('Koneksi API Fonnte gagal saat mengirim nota pembelian.', [
                'pembelian_id' => $pembelian->id,
                'nomor_nota' => $pembelian->nomor_nota,
                'sender' => $nomorPerusahaan,
                'target' => $target,
                'error' => $exception->getMessage(),
            ]);

            return $this->whatsappResult(
                false,
                'connection_error',
                'Tidak dapat terhubung ke API Fonnte: ' . $exception->getMessage(),
                $target,
                $profile
            );
        } catch (Throwable $exception) {
            report($exception);

            Log::error('Terjadi kesalahan saat mengirim nota pembelian melalui Fonnte.', [
                'pembelian_id' => $pembelian->id,
                'nomor_nota' => $pembelian->nomor_nota,
                'sender' => $nomorPerusahaan,
                'target' => $target,
                'error' => $exception->getMessage(),
            ]);

            return $this->whatsappResult(
                false,
                'system_error',
                'Terjadi kesalahan saat mengirim nota WhatsApp: ' . $exception->getMessage(),
                $target,
                $profile
            );
        }
    }

    private function checkFonnteDevice(string $token): array
    {
        try {
            $response = Http::withoutVerifying()
                ->withOptions(['verify' => false])
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => trim($token),
                ])
                ->connectTimeout((int) env('FONNTE_CONNECT_TIMEOUT', 10))
                ->timeout((int) env('FONNTE_TIMEOUT', 30))
                ->post(env('FONNTE_DEVICE_URL', self::FONNTE_DEVICE_URL));

            $json = $response->json();
            $payload = is_array($json) ? $json : [];

            if (!$response->successful()) {
                $message = match ($response->status()) {
                    401 => 'Token API Fonnte tidak valid.',
                    403 => 'Token API Fonnte tidak memiliki akses.',
                    404 => 'Endpoint device Fonnte tidak ditemukan.',
                    405 => 'Endpoint device Fonnte harus dipanggil menggunakan POST.',
                    429 => 'Terlalu banyak request ke Fonnte.',
                    default => (string) (
                        $payload['reason']
                        ?? $payload['message']
                        ?? 'Fonnte mengembalikan HTTP ' . $response->status() . '.'
                    ),
                };

                return [
                    'success' => false,
                    'status' => 'error',
                    'message' => $message,
                    'device_number' => null,
                    'device_status' => null,
                    'response' => $payload ?: $response->body(),
                ];
            }

            $apiSuccess = filter_var(
                $payload['status'] ?? $payload['success'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            $deviceNumber = $this->extractFonnteNumber($payload);
            $deviceStatus = strtolower(trim((string) (
                $payload['device_status']
                ?? $payload['deviceStatus']
                ?? $payload['connection']
                ?? $payload['status_device']
                ?? data_get($payload, 'data.device_status')
                ?? data_get($payload, 'data.status')
                ?? ''
            )));

            $connectedStatuses = [
                'connect',
                'connected',
                'ready',
                'online',
                'authenticated',
                'working',
                'active',
            ];

            $connected = $apiSuccess && (
                in_array($deviceStatus, $connectedStatuses, true)
                || ($deviceStatus === '' && $deviceNumber !== null)
            );

            if (!$connected) {
                return [
                    'success' => false,
                    'status' => 'disconnected',
                    'message' => (string) (
                        $payload['reason']
                        ?? $payload['message']
                        ?? $payload['detail']
                        ?? data_get($payload, 'data.message')
                        ?? 'Device Fonnte belum terhubung.'
                    ),
                    'device_number' => $deviceNumber,
                    'device_status' => $deviceStatus ?: null,
                    'response' => $payload,
                ];
            }

            return [
                'success' => true,
                'status' => 'connected',
                'message' => 'Device Fonnte terhubung.',
                'device_number' => $deviceNumber,
                'device_status' => $deviceStatus ?: 'connected',
                'response' => $payload,
            ];
        } catch (ConnectionException $exception) {
            return [
                'success' => false,
                'status' => 'connection_error',
                'message' => 'Tidak dapat menghubungi API Fonnte: ' . $exception->getMessage(),
                'device_number' => null,
                'device_status' => null,
                'response' => null,
            ];
        } catch (Throwable $exception) {
            report($exception);

            return [
                'success' => false,
                'status' => 'system_error',
                'message' => 'Gagal memeriksa device Fonnte: ' . $exception->getMessage(),
                'device_number' => null,
                'device_status' => null,
                'response' => null,
            ];
        }
    }

    private function extractFonnteNumber(array $payload): ?string
    {
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
            if (!is_scalar($candidate)) {
                continue;
            }

            $number = $this->normalizeWhatsappNumber((string) $candidate);

            if ($number) {
                return $number;
            }
        }

        return null;
    }

    private function updateCompanyFonnteStatus(
        CompanyProfile $profile,
        string $status,
        string $message,
        bool $enabled
    ): void {
        $profile->fonnte_connection_status = $status;
        $profile->fonnte_connection_message = $message;
        $profile->fonnte_last_checked_at = now();
        $profile->fonnte_enabled = $enabled;
        $profile->save();
    }

    private function whatsappResult(
        bool $success,
        string $status,
        string $message,
        ?string $target = null,
        ?CompanyProfile $profile = null,
        mixed $response = null,
        ?int $httpStatus = null
    ): array {
        return [
            'success' => $success,
            'status' => $status,
            'message' => $message,
            'sender' => $profile
                ? $this->normalizeWhatsappNumber($profile->no_wa)
                : null,
            'sender_name' => $profile?->nama_perusahaan,
            'target' => $target,
            'http_status' => $httpStatus,
            'response' => $this->sanitizeFonnteResponse($response),
        ];
    }

    private function sanitizeFonnteResponse(mixed $response): mixed
    {
        if (!is_array($response)) {
            return $response;
        }

        unset(
            $response['token'],
            $response['api_token'],
            $response['authorization'],
            $response['Authorization']
        );

        if (isset($response['data']) && is_array($response['data'])) {
            unset(
                $response['data']['token'],
                $response['data']['api_token'],
                $response['data']['authorization'],
                $response['data']['Authorization']
            );
        }

        return $response;
    }

  private function buildNotaWhatsappMessage(
    Pembelian $pembelian,
    CompanyProfile $profile
): string {
    $pembelian->loadMissing([
        'items.dataBarang',
        'catatans',
        'jenisPembayaran',
        'customer',
    ]);

    /*
    |--------------------------------------------------------------------------
    | Informasi perusahaan
    |--------------------------------------------------------------------------
    */
    $namaPerusahaan = trim(
        (string) (
            $profile->nama_perusahaan
            ?: config('app.name', 'Perusahaan')
        )
    );

    $alamatPerusahaan = trim((string) $profile->alamat);

    $nomorPerusahaan = $this->normalizeWhatsappNumber(
        $profile->no_wa
    ) ?: '-';

    /*
    |--------------------------------------------------------------------------
    | Informasi transaksi
    |--------------------------------------------------------------------------
    */
    $tanggal = optional($pembelian->tanggal)->format('d/m/Y') ?: '-';

    $namaCustomer = trim(
        (string) ($pembelian->customer?->nama_customer ?: '-')
    );

    $pembayaran = trim(
        (string) (
            optional($pembelian->jenisPembayaran)->nama
            ?: ($pembelian->metode_pembayaran ?: '-')
        )
    );

    /*
    |--------------------------------------------------------------------------
    | Informasi tanda tangan
    |--------------------------------------------------------------------------
    */
    $kota = trim(
        (string) ($pembelian->kota ?: 'Kendal')
    );

    $tanggalTtd = optional($pembelian->tanggal_ttd)
        ->format('d/m/Y') ?: $tanggal;

    $namaTtd = trim(
        (string) ($pembelian->nama_ttd ?: 'Admin')
    );

    /*
    |--------------------------------------------------------------------------
    | Ambil karyawan dari Catatan Power Box
    |--------------------------------------------------------------------------
    */
    $karyawanIds = collect($pembelian->catatans ?? [])
        ->where('tipe', 'power_box')
        ->flatMap(function ($catatan) {
            return $catatan->karyawan_ids ?? [];
        })
        ->filter()
        ->map(fn ($id) => (string) $id)
        ->unique()
        ->values();

    $namaKaryawans = collect();

    if ($karyawanIds->isNotEmpty()) {
        $namaKaryawans = DataKaryawan::query()
            ->whereIn('id', $karyawanIds)
            ->orderBy('nama')
            ->pluck('nama')
            ->filter()
            ->map(fn ($nama) => trim((string) $nama))
            ->values();
    }

    /*
    |--------------------------------------------------------------------------
    | Susun pesan WhatsApp
    |--------------------------------------------------------------------------
    */
    $lines = [];

    $lines[] = '*' . strtoupper($namaPerusahaan) . '*';

    if ($alamatPerusahaan !== '') {
        $lines[] = $alamatPerusahaan;
    }

    $lines[] = 'Wa: ' . $nomorPerusahaan;
    $lines[] = '';

    $lines[] = '*NOTA TRANSAKSI PEMBELIAN*';
    $lines[] = '━━━━━━━━━━━━━━━━━━━━';

    $lines[] = '*Informasi Transaksi*';
    $lines[] = 'Tanggal    : ' . $tanggal;
    $lines[] = 'Customer   : ' . $namaCustomer;
    $lines[] = 'Pembayaran : ' . $pembayaran;
    $lines[] = '';

    $lines[] = '*Rincian Barang*';

    if ($pembelian->items->isEmpty()) {
        $lines[] = '-';
    } else {
        foreach ($pembelian->items->values() as $index => $item) {
            $namaBarang = trim(
                (string) ($item->dataBarang?->nama_barang ?: '-')
            );

            $qty = $this->formatQty($item->qty);

            $harga = $this->formatAngkaNotaWhatsapp(
                $item->harga
            );

            $total = $this->formatAngkaNotaWhatsapp(
                $item->total
            );

            /*
             * Contoh:
             * 1. *Dus* : 1 Kg x 2000 = *2000*
             */
            $lines[] = sprintf(
                '%d. *%s* : %s Kg x %s = *%s*',
                $index + 1,
                $namaBarang,
                $qty,
                $harga,
                $total
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Ringkasan pembayaran
    |--------------------------------------------------------------------------
    */
    $subtotal = $this->formatRupiah(
        $pembelian->subtotal
    );

    $catatanTransaksi = $this->toDecimal(
        $pembelian->nilai_catatan_transaksi
    );

    $catatanPowerBox = $this->toDecimal(
        $pembelian->nilai_catatan_power_box
    );

    $penyesuaian = $this->toDecimal(
        $pembelian->penyesuaian
    );

    $totalAkhir = $this->formatRupiah(
        $pembelian->total_akhir
    );

    $lines[] = '';
    $lines[] = '*Ringkasan Pembayaran*';
    $lines[] = 'Subtotal          : ' . $subtotal;

    if ($catatanTransaksi > 0) {
        $lines[] = 'Catatan Transaksi : +'
            . $this->formatRupiah($catatanTransaksi);
    }

    if ($catatanPowerBox > 0) {
        $lines[] = 'Power Box         : -'
            . $this->formatRupiah($catatanPowerBox);
    }

    if ($penyesuaian != 0.0) {
        $prefix = $penyesuaian > 0 ? '+' : '-';

        $lines[] = 'Penyesuaian       : '
            . $prefix
            . $this->formatRupiah(abs($penyesuaian));
    }

    $lines[] = 'Total Akhir       : *' . $totalAkhir . '*';

    /*
    |--------------------------------------------------------------------------
    | Catatan transaksi
    |--------------------------------------------------------------------------
    */
    if (filled($pembelian->catatan)) {
        $lines[] = '';
        $lines[] = '*Catatan*';
        $lines[] = trim((string) $pembelian->catatan);
    }

  /*
|--------------------------------------------------------------------------
| Tanda tangan
|--------------------------------------------------------------------------
*/
$lines[] = '';
$lines[] = '━━━━━━━━━━━━━━━━━━━━';
$lines[] = $kota . ', ' . $tanggalTtd;
$lines[] = 'Hormat kami,';
$lines[] = '';
$lines[] = '*' . $namaTtd . '*';

if ($namaKaryawans->isNotEmpty()) {
    $lines[] = '';

    foreach ($namaKaryawans as $namaKaryawan) {
        $lines[] = '*' . $namaKaryawan . '*';
    }
}

$lines[] = '';
$lines[] = 'Terima kasih atas kepercayaan Anda.';
    return implode("\n", $lines);
}

/**
 * Format angka khusus rincian barang WhatsApp.
 *
 * Contoh:
 * 2000    menjadi 2000
 * 2500.50 menjadi 2500,5
 * 2500.75 menjadi 2500,75
 */
private function formatAngkaNotaWhatsapp(mixed $value): string
{
    $number = $this->toDecimal($value);

    if (floor($number) == $number) {
        return number_format($number, 0, ',', '');
    }

    return rtrim(
        rtrim(
            number_format($number, 2, ',', ''),
            '0'
        ),
        ','
    );
}


    private function normalizeWhatsappNumber(?string $number): ?string
    {
        if (!$number) {
            return null;
        }

        $number = preg_replace('/[^0-9]/', '', $number);

        if (!$number) {
            return null;
        }

        // 081234567890 => 6281234567890
        if (str_starts_with($number, '0')) {
            return '62' . substr($number, 1);
        }

        // 81234567890 => 6281234567890
        if (str_starts_with($number, '8')) {
            return '62' . $number;
        }

        // 6281234567890 tetap.
        if (str_starts_with($number, '62')) {
            return $number;
        }

        return $number;
    }

    private function generateNomorNota(): string
    {
        $date = now()->format('Ymd');

        $countToday = Pembelian::withTrashed()
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->count() + 1;

        return 'PB-' . $date . '-' . str_pad((string) $countToday, 4, '0', STR_PAD_LEFT);
    }

    private function jenisBarangLabel(?string $jenisBarang): string
    {
        return match ($jenisBarang) {
            'mentah' => 'Barang Mentah',
            'jadi' => 'Barang Jadi',
            default => '-',
        };
    }


    private function formatQty($qty): string
    {
        $qty = $this->toDecimal($qty);

        return rtrim(rtrim(number_format($qty, 2, ',', '.'), '0'), ',');
    }


    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }

    private function toInteger($value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return (int) $value;
        }

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' ', '.', ','], '', $value);

        return is_numeric($value) ? (int) $value : 0;
    }

    private function toDecimal($value): float
    {
        if ($value === null || $value === '') {
            return 0.00;
        }

        if (is_float($value) || is_int($value)) {
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

        return is_numeric($value) ? round((float) $value, 2) : 0.00;
    }
}
