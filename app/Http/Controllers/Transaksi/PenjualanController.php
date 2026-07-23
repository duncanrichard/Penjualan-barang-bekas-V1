<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\BarangVariant;
use App\Models\CompanyProfile;
use App\Models\DataBarang;
use App\Models\DataCustomer;
use App\Models\DataKaryawan;
use App\Models\JenisPembayaran;
use App\Models\Pengeluaran;
use App\Models\PengeluaranDeposit;
use App\Models\Penjualan;
use App\Models\StockMovement;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class PenjualanController extends Controller
{
    private const FONNTE_SEND_URL = 'https://api.fonnte.com/send';
    private const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        /*
         * Default halaman Penjualan menampilkan data hari ini.
         * Jika frontend mengirim start_date/end_date kosong, berarti user memilih "Semua Data".
         */
        $hasStartDateParameter = $request->query->has('start_date');
        $hasEndDateParameter = $request->query->has('end_date');

        if (!$hasStartDateParameter && !$hasEndDateParameter) {
            $startDate = now()->toDateString();
            $endDate = now()->toDateString();
        }

        $penjualans = Penjualan::query()
            ->with(['items.dataBarang', 'items.variant', 'catatans', 'jenisPembayaran', 'customer'])
            ->when($startDate, function ($query) use ($startDate) {
                $query->whereDate('tanggal', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                $query->whereDate('tanggal', '<=', $endDate);
            })
            ->when($search !== '', function ($query) use ($search) {
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
                                ->orWhere('nama_barang', 'like', "%{$search}%")
                                ->orWhere('nama_varian', 'like', "%{$search}%")
                                ->orWhereHas('dataBarang', function ($barangQuery) use ($search) {
                                    $barangQuery->where('kode', 'like', "%{$search}%")
                                        ->orWhere('nama_barang', 'like', "%{$search}%");
                                })
                                ->orWhereHas('variant', function ($variantQuery) use ($search) {
                                    $variantQuery->where('nama', 'like', "%{$search}%")
                                        ->orWhere('kode', 'like', "%{$search}%");
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
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data penjualan berhasil diambil.',
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'data' => $penjualans->map(fn ($penjualan) => $this->formatPenjualan($penjualan))->values(),
        ]);
    }

    public function barangOptions(): JsonResponse
    {
        $stokTanpaVariant = StockMovement::query()
            ->where('jenis_barang', 'jadi')
            ->whereNull('barang_variant_id')
            ->select('data_barang_id')
            ->selectRaw('COALESCE(SUM(qty_masuk),0) - COALESCE(SUM(qty_keluar),0) as stok')
            ->groupBy('data_barang_id')
            ->get()
            ->mapWithKeys(fn ($row) => [
                (string) $row->data_barang_id => round((float) $row->stok, 2),
            ]);

        $stokVariantMap = StockMovement::query()
            ->where('jenis_barang', 'jadi')
            ->whereNotNull('barang_variant_id')
            ->select('data_barang_id', 'barang_variant_id')
            ->selectRaw('COALESCE(SUM(qty_masuk),0) - COALESCE(SUM(qty_keluar),0) as stok')
            ->groupBy('data_barang_id', 'barang_variant_id')
            ->get()
            ->groupBy(fn ($row) => (string) $row->data_barang_id)
            ->map(function ($rows) {
                return $rows->mapWithKeys(fn ($row) => [
                    (string) $row->barang_variant_id => round((float) $row->stok, 2),
                ]);
            });

        $barangs = DataBarang::query()
            ->with(['variants' => fn ($query) => $query->where('is_active', true)->orderBy('nama')])
            ->orderBy('nama_barang')
            ->get(['id', 'kode', 'nama_barang']);

        $data = $barangs
            ->map(function ($barang) use ($stokTanpaVariant, $stokVariantMap) {
                $barangId = (string) $barang->id;
                $stokJadiTanpaVariant = round((float) ($stokTanpaVariant[$barangId] ?? 0), 2);
                $stokByVariant = $stokVariantMap->get($barangId, collect());

                $variants = $barang->variants
                    ->map(function ($variant) use ($stokByVariant) {
                        $variantId = (string) $variant->id;
                        $stok = round((float) ($stokByVariant[$variantId] ?? 0), 2);

                        return [
                            'id' => $variantId,
                            'data_barang_id' => (string) $variant->data_barang_id,
                            'nama' => $variant->nama,
                            'kode' => $variant->kode,
                            'is_active' => (bool) $variant->is_active,
                            'stok_jadi' => $stok,
                        ];
                    })
                    ->filter(fn ($variant) => $variant['stok_jadi'] > 0)
                    ->values();

                $totalVariant = round((float) $variants->sum('stok_jadi'), 2);
                $totalStok = round($stokJadiTanpaVariant + $totalVariant, 2);

                return [
                    'id' => $barangId,
                    'kode' => $barang->kode ?? '-',
                    'kode_barang' => $barang->kode ?? '-',
                    'nama_barang' => $barang->nama_barang ?? '-',
                    'jenis_barang' => 'jadi',
                    'jenis_barang_label' => 'Barang Jadi',
                    'stok_jadi_tanpa_varian' => $stokJadiTanpaVariant,
                    'stok_jadi_varian' => $totalVariant,
                    'stok_jadi' => $totalStok,
                    'stok_tersedia' => $totalStok,
                    'harga' => 0,
                    'variants' => $variants,
                    'bisa_jual_tanpa_varian' => $stokJadiTanpaVariant > 0,
                ];
            })
            ->filter(fn ($barang) => $barang['stok_tersedia'] > 0)
            ->values();

        return response()->json([
            'message' => 'Data barang jadi berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function customerOptions(): JsonResponse
    {
        $customers = DataCustomer::query()
            ->orderBy('nama_customer')
            ->get(['id', 'nama_customer', 'no_wa', 'alamat']);

        return response()->json([
            'message' => 'Data customer berhasil diambil.',
            'data' => $customers->map(fn (DataCustomer $customer) => [
                'id' => (string) $customer->id,
                'value' => (string) $customer->id,
                'label' => $customer->nama_customer,
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

        $penjualan = DB::transaction(function () use ($validated) {
            $items = $this->prepareItems($validated['items']);

            $this->assertStokAvailable($items);

            $catatanTransaksiItems = $this->prepareCatatans($validated['catatan_transaksi_items'] ?? [], 'transaksi');
            $catatanPowerBoxItems = $this->prepareCatatans($validated['catatan_power_box_items'] ?? [], 'power_box');

            $totals = $this->calculateTotals(
                $items,
                $catatanTransaksiItems,
                $catatanPowerBoxItems,
                $validated['penyesuaian'] ?? 0
            );

            $jenisPembayaran = $this->getJenisPembayaran($validated['jenis_pembayaran_id']);
            $this->assertKasirDepositExists($validated['tanggal'], (string) $jenisPembayaran->id);

            $penjualan = Penjualan::create([
                'nomor_nota' => $this->generateNomorNota(),
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $jenisPembayaran->id,
                'metode_pembayaran' => $jenisPembayaran->kode,
                'subtotal' => $totals['subtotal'],
                'catatan_transaksi' => collect($catatanTransaksiItems)->pluck('catatan')->filter()->implode("\n"),
                'nilai_catatan_transaksi' => $totals['total_catatan_transaksi'],
                'catatan_power_box' => collect($catatanPowerBoxItems)->pluck('catatan')->filter()->implode("\n"),
                'nilai_catatan_power_box' => $totals['total_power_box'],
                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'] ?? null,
            ]);

            $penjualan->items()->createMany($items);
            $penjualan->catatans()->createMany([
                ...$catatanTransaksiItems,
                ...$catatanPowerBoxItems,
            ]);

            $penjualan = $penjualan->fresh(['items.dataBarang', 'items.variant', 'catatans', 'jenisPembayaran', 'customer']);

            $this->syncStockMovements($penjualan);
            $this->syncMutasiMasuk($penjualan);

            return $penjualan;
        });

        $whatsappResult = $this->sendNotaWhatsapp($penjualan);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data penjualan berhasil ditambahkan dan nota berhasil dikirim melalui WhatsApp.'
                : 'Data penjualan berhasil ditambahkan, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatPenjualan($penjualan),
            'whatsapp' => $whatsappResult,
        ], 201);
    }

    public function show(Penjualan $penjualan): JsonResponse
    {
        $penjualan->load(['items.dataBarang', 'items.variant', 'catatans', 'jenisPembayaran', 'customer']);

        return response()->json([
            'message' => 'Detail penjualan berhasil diambil.',
            'data' => $this->formatPenjualan($penjualan),
        ]);
    }

    public function update(Request $request, Penjualan $penjualan): JsonResponse
    {
        $validated = $this->validateRequest($request, $penjualan);

        $penjualan = DB::transaction(function () use ($validated, $penjualan) {
            $items = $this->prepareItems($validated['items']);

            $this->assertStokAvailable($items, $penjualan);

            $catatanTransaksiItems = $this->prepareCatatans($validated['catatan_transaksi_items'] ?? [], 'transaksi');
            $catatanPowerBoxItems = $this->prepareCatatans($validated['catatan_power_box_items'] ?? [], 'power_box');

            $totals = $this->calculateTotals(
                $items,
                $catatanTransaksiItems,
                $catatanPowerBoxItems,
                $validated['penyesuaian'] ?? 0
            );

            $jenisPembayaran = $this->getJenisPembayaran($validated['jenis_pembayaran_id']);
            $this->assertKasirDepositExists($validated['tanggal'], (string) $jenisPembayaran->id, $penjualan);
            $this->deleteMutasiMasuk($penjualan);

            $penjualan->update([
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $jenisPembayaran->id,
                'metode_pembayaran' => $jenisPembayaran->kode,
                'subtotal' => $totals['subtotal'],
                'catatan_transaksi' => collect($catatanTransaksiItems)->pluck('catatan')->filter()->implode("\n"),
                'nilai_catatan_transaksi' => $totals['total_catatan_transaksi'],
                'catatan_power_box' => collect($catatanPowerBoxItems)->pluck('catatan')->filter()->implode("\n"),
                'nilai_catatan_power_box' => $totals['total_power_box'],
                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'] ?? null,
            ]);

            StockMovement::query()
                ->where('source_type', 'penjualan')
                ->where('source_id', $penjualan->id)
                ->delete();

            $penjualan->items()->delete();
            $penjualan->catatans()->delete();

            $penjualan->items()->createMany($items);
            $penjualan->catatans()->createMany([
                ...$catatanTransaksiItems,
                ...$catatanPowerBoxItems,
            ]);

            $penjualan = $penjualan->fresh(['items.dataBarang', 'items.variant', 'catatans', 'jenisPembayaran', 'customer']);

            $this->syncStockMovements($penjualan);
            $this->syncMutasiMasuk($penjualan);

            return $penjualan;
        });

        $whatsappResult = $this->sendNotaWhatsapp($penjualan);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data penjualan berhasil diperbarui dan nota berhasil dikirim melalui WhatsApp.'
                : 'Data penjualan berhasil diperbarui, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatPenjualan($penjualan),
            'whatsapp' => $whatsappResult,
        ]);
    }

    public function destroy(Penjualan $penjualan): JsonResponse
    {
        DB::transaction(function () use ($penjualan) {
            $this->deleteMutasiMasuk($penjualan);

            StockMovement::query()
                ->where('source_type', 'penjualan')
                ->where('source_id', $penjualan->id)
                ->delete();

            $penjualan->items()->delete();
            $penjualan->catatans()->delete();
            $penjualan->delete();
        });

        return response()->json([
            'message' => 'Data penjualan berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request, ?Penjualan $penjualan = null): array
    {
        $request->merge([
            'nomor_nota' => null,
            'jenis_pembayaran_id' => trim(
                (string) $request->input('jenis_pembayaran_id', '')
            ),
            'penyesuaian' => $this->toDecimal($request->input('penyesuaian', 0)),
            'items' => collect($request->input('items', []))
                ->map(function ($item) {
                    $variantId = $item['barang_variant_id'] ?? null;
                    $variantId = blank($variantId) ? null : $variantId;

                    return [
                        'data_barang_id' => $item['data_barang_id'] ?? null,
                        'barang_variant_id' => $variantId,
                        'qty' => $this->toDecimal($item['qty'] ?? 0),
                        'harga' => $this->toInteger($item['harga'] ?? 0),
                    ];
                })
                ->values()
                ->toArray(),
            'catatan_transaksi_items' => collect($request->input('catatan_transaksi_items', []))
                ->map(fn ($item) => [
                    'catatan' => $item['catatan'] ?? null,
                    'nominal' => $this->toDecimal($item['nominal'] ?? 0),
                    'karyawan_ids' => [],
                ])
                ->filter(fn ($item) => filled($item['catatan']) || $item['nominal'] > 0)
                ->values()
                ->toArray(),
            'catatan_power_box_items' => collect($request->input('catatan_power_box_items', []))
                ->map(fn ($item) => [
                    'catatan' => $item['catatan'] ?? null,
                    'nominal' => $this->toDecimal($item['nominal'] ?? 0),
                    'karyawan_ids' => collect($item['karyawan_ids'] ?? [])
                        ->filter()
                        ->map(fn ($id) => (string) $id)
                        ->unique()
                        ->values()
                        ->toArray(),
                ])
                ->filter(fn ($item) => filled($item['catatan']) || $item['nominal'] > 0 || !empty($item['karyawan_ids']))
                ->values()
                ->toArray(),
        ]);

        $validated = $request->validate([
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
                    ->where(
                        fn ($query) => $query->where('is_active', true)
                    ),
            ],
            'penyesuaian' => ['nullable', 'numeric'],
            'catatan' => ['nullable', 'string'],
            'kota' => ['nullable', 'string', 'max:100'],
            'tanggal_ttd' => ['nullable', 'date'],
            'nama_ttd' => ['nullable', 'string', 'max:150'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.data_barang_id' => ['required', 'uuid', Rule::exists('data_barangs', 'id')],
            'items.*.barang_variant_id' => ['nullable', 'uuid', Rule::exists('barang_variants', 'id')],
            'items.*.qty' => ['required', 'numeric', 'min:0.01', 'decimal:0,2'],
            'items.*.harga' => ['required', 'integer', 'min:0'],

            'catatan_transaksi_items' => ['nullable', 'array'],
            'catatan_transaksi_items.*.catatan' => ['nullable', 'string'],
            'catatan_transaksi_items.*.nominal' => ['nullable', 'numeric', 'min:0'],

            'catatan_power_box_items' => ['nullable', 'array'],
            'catatan_power_box_items.*.catatan' => ['nullable', 'string'],
            'catatan_power_box_items.*.nominal' => ['nullable', 'numeric', 'min:0'],
            'catatan_power_box_items.*.karyawan_ids' => ['nullable', 'array'],
            'catatan_power_box_items.*.karyawan_ids.*' => [
                'uuid',
                Rule::exists('data_karyawans', 'id')->whereNull('deleted_at'),
            ],
        ], [
            'customer_id.required' => 'Data customer wajib dipilih.',
            'customer_id.uuid' => 'Format ID customer tidak valid.',
            'customer_id.exists' => 'Data customer tidak ditemukan atau sudah dihapus.',
            'tanggal.required' => 'Tanggal wajib diisi.',
            'jenis_pembayaran_id.required' => 'Jenis pembayaran wajib dipilih.',
            'jenis_pembayaran_id.uuid' => 'Format ID jenis pembayaran tidak valid.',
            'jenis_pembayaran_id.exists' => 'Jenis pembayaran tidak valid atau tidak aktif.',
            'items.required' => 'Minimal satu produk harus diisi.',
            'items.*.data_barang_id.required' => 'Barang wajib dipilih.',
            'items.*.qty.required' => 'Qty wajib diisi.',
            'items.*.harga.required' => 'Harga wajib diisi.',
            'catatan_power_box_items.*.karyawan_ids.array' => 'Format pilihan karyawan tidak valid.',
            'catatan_power_box_items.*.karyawan_ids.*.exists' => 'Karyawan yang dipilih tidak valid.',
        ]);

        $this->assertVariantBelongsToBarang($validated['items']);

        return $validated;
    }

    private function assertVariantBelongsToBarang(array $items): void
    {
        $variantIds = collect($items)
            ->pluck('barang_variant_id')
            ->filter()
            ->unique()
            ->values();

        if ($variantIds->isEmpty()) {
            return;
        }

        $variants = BarangVariant::query()
            ->whereIn('id', $variantIds)
            ->get(['id', 'data_barang_id', 'nama'])
            ->keyBy(fn ($variant) => (string) $variant->id);

        foreach ($items as $index => $item) {
            if (blank($item['barang_variant_id'] ?? null)) {
                continue;
            }

            $variant = $variants->get((string) $item['barang_variant_id']);

            if (!$variant) {
                abort(422, 'Baris produk nomor ' . ($index + 1) . ': varian tidak ditemukan.');
            }

            if ((string) $variant->data_barang_id !== (string) $item['data_barang_id']) {
                abort(422, 'Baris produk nomor ' . ($index + 1) . ': varian tidak sesuai dengan barang yang dipilih.');
            }
        }
    }

    private function prepareItems(array $items): array
    {
        $barangIds = collect($items)->pluck('data_barang_id')->filter()->unique()->values();
        $variantIds = collect($items)->pluck('barang_variant_id')->filter()->unique()->values();

        $barangs = DataBarang::query()
            ->whereIn('id', $barangIds)
            ->get(['id', 'kode', 'nama_barang'])
            ->keyBy(fn ($barang) => (string) $barang->id);

        $variants = BarangVariant::query()
            ->whereIn('id', $variantIds)
            ->get(['id', 'data_barang_id', 'nama', 'kode'])
            ->keyBy(fn ($variant) => (string) $variant->id);

        return collect($items)
            ->map(function ($item) use ($barangs, $variants) {
                $barang = $barangs->get((string) $item['data_barang_id']);

                if (!$barang) {
                    abort(422, 'Barang tidak ditemukan.');
                }

                $variant = null;

                if (filled($item['barang_variant_id'] ?? null)) {
                    $variant = $variants->get((string) $item['barang_variant_id']);

                    if (!$variant) {
                        abort(422, 'Varian tidak ditemukan.');
                    }

                    if ((string) $variant->data_barang_id !== (string) $barang->id) {
                        abort(422, 'Varian "' . $variant->nama . '" tidak sesuai dengan barang "' . $barang->nama_barang . '".');
                    }
                }

                $qty = max(0.01, $this->toDecimal($item['qty'] ?? 0));
                $harga = max(0, $this->toInteger($item['harga'] ?? 0));
                $total = round($qty * $harga, 2);

                return [
                    'data_barang_id' => $barang->id,
                    'barang_variant_id' => $variant?->id,
                    'kode_barang' => $barang->kode ?? '-',
                    'nama_barang' => $barang->nama_barang ?? '-',
                    'nama_varian' => $variant?->nama,
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
                $karyawanIds = $tipe === 'power_box'
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
                    'karyawan_ids' => $tipe === 'power_box' ? $karyawanIds : null,
                    'nominal_per_karyawan' => $jumlahKaryawan > 0
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
        $totalCatatanTransaksi = round((float) collect($catatanTransaksiItems)->sum('nominal'), 2);
        $totalPowerBox = round((float) collect($catatanPowerBoxItems)->sum('nominal'), 2);
        $penyesuaian = $this->toDecimal($penyesuaianValue);

        return [
            'subtotal' => $subtotal,
            'total_catatan_transaksi' => $totalCatatanTransaksi,
            'total_power_box' => $totalPowerBox,
            'penyesuaian' => $penyesuaian,
            'total_akhir' => round($subtotal + $totalCatatanTransaksi - $totalPowerBox + $penyesuaian, 2),
        ];
    }

    private function assertStokAvailable(array $items, ?Penjualan $currentPenjualan = null): void
    {
        $currentQtyMap = collect();

        if ($currentPenjualan) {
            $currentPenjualan->loadMissing('items');

            $currentQtyMap = $currentPenjualan->items
                ->groupBy(fn ($item) => $this->stokKey($item->data_barang_id, $item->barang_variant_id))
                ->map(fn ($rows) => round((float) $rows->sum('qty'), 2));
        }

        $neededMap = collect($items)
            ->groupBy(fn ($item) => $this->stokKey($item['data_barang_id'], $item['barang_variant_id'] ?? null))
            ->map(fn ($rows) => round((float) collect($rows)->sum('qty'), 2));

        foreach ($neededMap as $key => $qtyNeeded) {
            [$dataBarangId, $variantKey] = explode(':', $key, 2);
            $variantId = $variantKey === 'none' ? null : $variantKey;

            $stokAvailable = $this->getStokJadi($dataBarangId, $variantId)
                + (float) ($currentQtyMap[$key] ?? 0);

            if ($qtyNeeded > $stokAvailable) {
                $barang = DataBarang::find($dataBarangId);
                $variant = $variantId ? BarangVariant::find($variantId) : null;

                $namaBarang = $barang?->nama_barang ?: $dataBarangId;
                $namaVarian = $variant ? ' varian ' . $variant->nama : ' tanpa varian';

                abort(422, "Stok {$namaBarang}{$namaVarian} tidak cukup. Stok tersedia {$stokAvailable} KG, diminta {$qtyNeeded} KG.");
            }
        }
    }

    private function getJenisPembayaran(
        mixed $jenisPembayaranId
    ): JenisPembayaran {
        $jenisPembayaranId = trim(
            (string) $jenisPembayaranId
        );

        if ($jenisPembayaranId === '') {
            abort(
                422,
                'Jenis pembayaran wajib dipilih.'
            );
        }

        $jenisPembayaran = JenisPembayaran::query()
            ->where('id', $jenisPembayaranId)
            ->where('is_active', true)
            ->first();

        if (!$jenisPembayaran) {
            abort(
                422,
                'Jenis pembayaran tidak ditemukan atau tidak aktif.'
            );
        }

        return $jenisPembayaran;
    }

    private function getKasirOpenForDate(string $tanggal): ?Pengeluaran
    {
        return Pengeluaran::query()
            ->with(['deposits.jenisPembayaran', 'items.jenisPembayaran'])
            ->whereDate('tanggal', $tanggal)
            ->where('status', 'open')
            ->first();
    }

    private function assertKasirDepositExists(
        string $tanggal,
        string $jenisPembayaranId,
        ?Penjualan $currentPenjualan = null
    ): Pengeluaran {
        $tanggal = trim($tanggal);
        $jenisPembayaranId = trim($jenisPembayaranId);

        if ($tanggal === '') {
            abort(
                422,
                'Tanggal penjualan tidak valid.'
            );
        }

        if ($jenisPembayaranId === '') {
            abort(
                422,
                'Jenis pembayaran wajib dipilih.'
            );
        }

        $kasir = $this->getKasirOpenForDate($tanggal);

        if (!$kasir) {
            abort(
                422,
                'Kasir / deposit untuk tanggal penjualan ini belum dibuka. '
                . 'Buka deposit di Mutasi Transaksi terlebih dahulu.'
            );
        }

        $hasDeposit = $kasir->deposits->contains(
            function ($deposit) use ($jenisPembayaranId): bool {
                return trim(
                    (string) $deposit->jenis_pembayaran_id
                ) === $jenisPembayaranId;
            }
        );

        $sameOldPayment = false;

        if ($currentPenjualan) {
            $sameDate = optional(
                $currentPenjualan->tanggal
            )->format('Y-m-d') === $tanggal;

            $samePayment = trim(
                (string) $currentPenjualan->jenis_pembayaran_id
            ) === $jenisPembayaranId;

            $sameOldPayment = $sameDate && $samePayment;
        }

        if (!$hasDeposit && !$sameOldPayment) {
            $jenisPembayaran = JenisPembayaran::query()
                ->find($jenisPembayaranId);

            $namaPembayaran = $jenisPembayaran?->nama
                ?: 'yang dipilih';

            abort(
                422,
                'Jenis pembayaran '
                . $namaPembayaran
                . ' belum dibuat depositnya pada Mutasi Transaksi tanggal '
                . $tanggal
                . '.'
            );
        }

        return $kasir;
    }

    private function syncMutasiMasuk(
        Penjualan $penjualan
    ): void {
        $penjualan->loadMissing(['jenisPembayaran', 'customer']);

        $tanggal = optional(
            $penjualan->tanggal
        )->format('Y-m-d');

        if (!$tanggal) {
            abort(
                422,
                'Tanggal penjualan tidak valid.'
            );
        }

        $jenisPembayaranId = trim(
            (string) $penjualan->jenis_pembayaran_id
        );

        if ($jenisPembayaranId === '') {
            abort(
                422,
                'Jenis pembayaran penjualan tidak valid.'
            );
        }

        $kasir = $this->assertKasirDepositExists(
            $tanggal,
            $jenisPembayaranId,
            $penjualan
        );

        $nominal = $this->toDecimal(
            $penjualan->total_akhir
        );

        $this->deleteMutasiMasuk(
            $penjualan,
            false
        );

        if ($nominal > 0) {
            PengeluaranDeposit::query()->create([
                'pengeluaran_id' => (string) $kasir->id,
                'jenis_pembayaran_id' => $jenisPembayaranId,
                'nominal' => $nominal,
                'catatan' => 'Penjualan '
                    . $penjualan->nomor_nota
                    . ' - '
                    . ($penjualan->customer?->nama_customer ?: '-'),
                'source_type' => 'penjualan',
                'source_id' => (string) $penjualan->id,
            ]);
        }

        $this->recalculateKasirTotals($kasir);
    }

    private function deleteMutasiMasuk(Penjualan $penjualan, bool $recalculate = true): void
    {
        $oldDeposits = PengeluaranDeposit::query()
            ->where('source_type', 'penjualan')
            ->where('source_id', $penjualan->id)
            ->get();

        $pengeluaranIds = $oldDeposits->pluck('pengeluaran_id')->filter()->unique()->values();

        PengeluaranDeposit::query()
            ->where('source_type', 'penjualan')
            ->where('source_id', $penjualan->id)
            ->delete();

        if ($recalculate) {
            Pengeluaran::query()
                ->whereIn('id', $pengeluaranIds)
                ->get()
                ->each(fn ($pengeluaran) => $this->recalculateKasirTotals($pengeluaran));
        }
    }

    private function recalculateKasirTotals(Pengeluaran $pengeluaran): void
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

        $pengeluaran->update([
            'deposit_cash' => $depositCash,
            'total_cash' => $totalCash,
            'total_tf' => $totalTf,
            'sisa_cash' => round($depositCash - $totalCash, 2),
        ]);
    }

    private function syncStockMovements(Penjualan $penjualan): void
    {
        StockMovement::query()
            ->where('source_type', 'penjualan')
            ->where('source_id', $penjualan->id)
            ->delete();

        $penjualan->loadMissing(['items.dataBarang', 'items.variant']);

        foreach ($penjualan->items as $item) {
            StockMovement::create([
                'data_barang_id' => $item->data_barang_id,
                'barang_variant_id' => $item->barang_variant_id,
                'jenis_barang' => 'jadi',
                'qty_masuk' => 0,
                'qty_keluar' => $this->toDecimal($item->qty),
                'source_type' => 'penjualan',
                'source_id' => $penjualan->id,
                'source_item_id' => $item->id,
                'source_output_id' => null,
                'tanggal' => $penjualan->tanggal,
                'keterangan' => $penjualan->nomor_nota . ' - ' .
                    ($item->nama_barang ?: optional($item->dataBarang)->nama_barang) .
                    ($item->barang_variant_id ? ' - ' . ($item->nama_varian ?: optional($item->variant)->nama) : ' - tanpa varian'),
            ]);
        }
    }

    private function getStokJadi(string $dataBarangId, ?string $barangVariantId = null): float
    {
        $row = StockMovement::query()
            ->where('data_barang_id', $dataBarangId)
            ->where('jenis_barang', 'jadi')
            ->when(
                $barangVariantId,
                fn ($query) => $query->where('barang_variant_id', $barangVariantId),
                fn ($query) => $query->whereNull('barang_variant_id')
            )
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->first();

        return round((float) ($row->stok ?? 0), 2);
    }

    private function stokKey(string $dataBarangId, ?string $barangVariantId = null): string
    {
        return $dataBarangId . ':' . ($barangVariantId ?: 'none');
    }

    private function formatPenjualan(Penjualan $penjualan): array
    {
        $penjualan->loadMissing(['items.dataBarang', 'items.variant', 'catatans', 'jenisPembayaran', 'customer']);

        $catatans = $penjualan->catatans ?? collect();

        $powerBoxKaryawanIds = $catatans
            ->where('tipe', 'power_box')
            ->flatMap(fn ($item) => $item->karyawan_ids ?? [])
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values();

        $karyawanMap = DataKaryawan::query()
            ->whereIn('id', $powerBoxKaryawanIds)
            ->get(['id', 'nama', 'no_wa'])
            ->keyBy(fn ($karyawan) => (string) $karyawan->id);

        $catatanTransaksiItems = $catatans
            ->where('tipe', 'transaksi')
            ->map(fn ($item) => [
                'id' => $item->id,
                'catatan' => $item->catatan,
                'nominal' => $this->toDecimal($item->nominal),
                'nominal_format' => $this->formatRupiah($item->nominal),
            ])
            ->values();

        $catatanPowerBoxItems = $catatans
            ->where('tipe', 'power_box')
            ->map(function ($item) use ($karyawanMap) {
                $selectedIds = collect($item->karyawan_ids ?? [])
                    ->filter()
                    ->map(fn ($id) => (string) $id)
                    ->unique()
                    ->values();

                $nominal = $this->toDecimal($item->nominal);
                $jumlahKaryawan = $selectedIds->count();
                $nominalPerKaryawan = $jumlahKaryawan > 0
                    ? ($this->toDecimal($item->nominal_per_karyawan) ?: round($nominal / $jumlahKaryawan, 2))
                    : 0;

                return [
                    'id' => $item->id,
                    'catatan' => $item->catatan,
                    'nominal' => $nominal,
                    'nominal_format' => $this->formatRupiah($nominal),
                    'karyawan_ids' => $selectedIds->values()->toArray(),
                    'jumlah_karyawan' => $jumlahKaryawan,
                    'nominal_per_karyawan' => $nominalPerKaryawan,
                    'nominal_per_karyawan_format' => $this->formatRupiah($nominalPerKaryawan),
                    'karyawans' => $selectedIds
                        ->map(function ($id) use ($karyawanMap, $nominalPerKaryawan) {
                            $karyawan = $karyawanMap->get($id);

                            return [
                                'id' => $id,
                                'nama' => $karyawan?->nama ?? '-',
                                'no_wa' => $karyawan?->no_wa,
                                'nominal_bagian' => $nominalPerKaryawan,
                                'nominal_bagian_format' => $this->formatRupiah($nominalPerKaryawan),
                            ];
                        })
                        ->values()
                        ->toArray(),
                ];
            })
            ->values();

        return [
            'id' => $penjualan->id,
            'nomor_nota' => $penjualan->nomor_nota,
            'customer_id' => $penjualan->customer_id,
            'customer' => $penjualan->customer ? [
                'id' => (string) $penjualan->customer->id,
                'nama_customer' => $penjualan->customer->nama_customer,
                'no_wa' => $penjualan->customer->no_wa,
                'alamat' => $penjualan->customer->alamat,
            ] : null,
            'nama_pelanggan' => $penjualan->customer?->nama_customer,
            'no_wa_pelanggan' => $penjualan->customer?->no_wa,
            'tanggal' => optional($penjualan->tanggal)->format('Y-m-d'),
            'jenis_pembayaran_id' => $penjualan->jenis_pembayaran_id,
            'metode_pembayaran' => $penjualan->metode_pembayaran,
            'jenis_pembayaran_label' => optional($penjualan->jenisPembayaran)->nama,
            'jenis_pembayaran_kode' => optional($penjualan->jenisPembayaran)->kode,
            'subtotal' => $this->toDecimal($penjualan->subtotal),
            'subtotal_format' => $this->formatRupiah($penjualan->subtotal),
            'catatan_transaksi' => $penjualan->catatan_transaksi,
            'nilai_catatan_transaksi' => $this->toDecimal($penjualan->nilai_catatan_transaksi),
            'nilai_catatan_transaksi_format' => $this->formatRupiah($penjualan->nilai_catatan_transaksi),
            'catatan_power_box' => $penjualan->catatan_power_box,
            'nilai_catatan_power_box' => $this->toDecimal($penjualan->nilai_catatan_power_box),
            'nilai_catatan_power_box_format' => $this->formatRupiah($penjualan->nilai_catatan_power_box),
            'catatan_transaksi_items' => $catatanTransaksiItems,
            'catatan_power_box_items' => $catatanPowerBoxItems,
            'penyesuaian' => $this->toDecimal($penjualan->penyesuaian),
            'penyesuaian_format' => $this->formatRupiah($penjualan->penyesuaian),
            'total_akhir' => $this->toDecimal($penjualan->total_akhir),
            'total_akhir_format' => $this->formatRupiah($penjualan->total_akhir),
            'catatan' => $penjualan->catatan,
            'kota' => $penjualan->kota,
            'tanggal_ttd' => optional($penjualan->tanggal_ttd)->format('Y-m-d'),
            'nama_ttd' => $penjualan->nama_ttd,
            'items' => $penjualan->items
                ->map(function ($item) {
                    $barang = $item->dataBarang;
                    $variant = $item->variant;

                    return [
                        'id' => $item->id,
                        'penjualan_id' => $item->penjualan_id,
                        'data_barang_id' => $item->data_barang_id,
                        'barang_variant_id' => $item->barang_variant_id,
                        'kode_barang' => $item->kode_barang ?: ($barang?->kode ?? '-'),
                        'nama_barang' => $item->nama_barang ?: ($barang?->nama_barang ?? '-'),
                        'nama_varian' => $item->nama_varian ?: ($variant?->nama),
                        'kode_varian' => $variant?->kode,
                        'jenis_barang' => 'jadi',
                        'jenis_barang_label' => 'Barang Jadi',
                        'qty' => $this->toDecimal($item->qty),
                        'harga' => $this->toInteger($item->harga),
                        'harga_format' => $this->formatRupiah($item->harga),
                        'total' => $this->toDecimal($item->total),
                        'total_format' => $this->formatRupiah($item->total),
                    ];
                })
                ->values(),
            'created_at' => optional($penjualan->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($penjualan->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($penjualan->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }


    /**
     * Mengirim nota penjualan melalui Fonnte.
     *
     * Token diambil dari profil perusahaan. Nomor pengirim mengikuti device
     * yang terhubung pada token Fonnte dan harus sama dengan nomor perusahaan.
     */
    private function sendNotaWhatsapp(Penjualan $penjualan): array
    {
        $penjualan->loadMissing([
            'items.dataBarang',
            'items.variant',
            'catatans',
            'jenisPembayaran',
            'customer',
        ]);

        $target = $this->normalizeWhatsappNumber(
            $penjualan->customer?->no_wa
        );

        if (!$target) {
            $message = 'Nota WhatsApp tidak dikirim karena nomor WhatsApp pelanggan kosong atau tidak valid.';

            Log::warning($message, [
                'penjualan_id' => $penjualan->id,
                'nomor_nota' => $penjualan->nomor_nota,
                'nomor_input' => $penjualan->customer?->no_wa,
            ]);

            return $this->whatsappResult(
                false,
                'target_invalid',
                $message
            );
        }

        $profile = CompanyProfile::query()->first();

        if (!$profile) {
            $message = 'Nota WhatsApp tidak dikirim karena profil perusahaan belum dibuat.';

            Log::warning($message, [
                'penjualan_id' => $penjualan->id,
                'nomor_nota' => $penjualan->nomor_nota,
                'target' => $target,
            ]);

            return $this->whatsappResult(
                false,
                'company_profile_missing',
                $message,
                $target
            );
        }

        if (!$profile->fonnte_enabled) {
            $message = 'Nota WhatsApp tidak dikirim karena integrasi Fonnte belum diaktifkan pada Profil Perusahaan.';

            Log::warning($message, [
                'penjualan_id' => $penjualan->id,
                'nomor_nota' => $penjualan->nomor_nota,
                'company_profile_id' => $profile->id,
                'target' => $target,
            ]);

            return $this->whatsappResult(
                false,
                'fonnte_disabled',
                $message,
                $target,
                $profile
            );
        }

        $token = trim((string) $profile->fonnte_api_token);

        if ($token === '') {
            $message = 'Nota WhatsApp tidak dikirim karena token API Fonnte belum diisi pada Profil Perusahaan.';

            Log::warning($message, [
                'penjualan_id' => $penjualan->id,
                'nomor_nota' => $penjualan->nomor_nota,
                'company_profile_id' => $profile->id,
                'target' => $target,
            ]);

            return $this->whatsappResult(
                false,
                'fonnte_token_empty',
                $message,
                $target,
                $profile
            );
        }

        $nomorPerusahaan = $this->normalizeWhatsappNumber(
            $profile->no_wa
        );

        if (!$nomorPerusahaan) {
            $message = 'Nota WhatsApp tidak dikirim karena nomor WhatsApp perusahaan belum valid.';

            Log::warning($message, [
                'penjualan_id' => $penjualan->id,
                'nomor_nota' => $penjualan->nomor_nota,
                'company_profile_id' => $profile->id,
                'target' => $target,
            ]);

            return $this->whatsappResult(
                false,
                'company_number_invalid',
                $message,
                $target,
                $profile
            );
        }

        $deviceResult = $this->checkFonnteDevice($token);

        if (!$deviceResult['success']) {
            $profile->fonnte_connection_status = 'disconnected';
            $profile->fonnte_connection_message = $deviceResult['message'];
            $profile->fonnte_last_checked_at = now();
            $profile->save();

            Log::warning(
                'Nota WhatsApp tidak dikirim karena device Fonnte tidak terhubung.',
                [
                    'penjualan_id' => $penjualan->id,
                    'nomor_nota' => $penjualan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'target' => $target,
                    'device_result' => $deviceResult,
                ]
            );

            return $this->whatsappResult(
                false,
                'fonnte_disconnected',
                $deviceResult['message'],
                $target,
                $profile,
                $deviceResult
            );
        }

        $nomorDevice = $this->normalizeWhatsappNumber(
            $deviceResult['device_number']
        );

        if ($nomorDevice && $nomorPerusahaan !== $nomorDevice) {
            $message = "Token Fonnte terhubung ke nomor {$nomorDevice}, sedangkan nomor perusahaan adalah {$nomorPerusahaan}.";

            $profile->fonnte_connection_status = 'mismatch';
            $profile->fonnte_connection_message = $message;
            $profile->fonnte_last_checked_at = now();
            $profile->fonnte_enabled = false;
            $profile->save();

            Log::warning(
                'Nota WhatsApp tidak dikirim karena nomor device Fonnte berbeda.',
                [
                    'penjualan_id' => $penjualan->id,
                    'nomor_nota' => $penjualan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'nomor_perusahaan' => $nomorPerusahaan,
                    'nomor_device' => $nomorDevice,
                    'target' => $target,
                ]
            );

            return $this->whatsappResult(
                false,
                'device_number_mismatch',
                $message,
                $target,
                $profile,
                $deviceResult
            );
        }

        $profile->fonnte_connection_status = 'connected';
        $profile->fonnte_connection_message = 'Token Fonnte valid dan device perusahaan terhubung.';
        $profile->fonnte_last_checked_at = now();
        $profile->save();

        $message = $this->buildNotaWhatsappMessage(
            $penjualan,
            $profile
        );

        try {
            $response = Http::withoutVerifying()
                ->withOptions([
                    'verify' => false,
                ])
                ->acceptJson()
                ->asForm()
                ->withHeaders([
                    'Authorization' => $token,
                ])
                ->connectTimeout(
                    (int) env('FONNTE_CONNECT_TIMEOUT', 10)
                )
                ->timeout(
                    (int) env('FONNTE_TIMEOUT', 30)
                )
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
                $errorMessage = $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte mengembalikan HTTP ' . $response->status() . '.';

                Log::error(
                    'HTTP Fonnte gagal mengirim nota penjualan.',
                    [
                        'penjualan_id' => $penjualan->id,
                        'nomor_nota' => $penjualan->nomor_nota,
                        'company_profile_id' => $profile->id,
                        'sender' => $nomorPerusahaan,
                        'target' => $target,
                        'http_status' => $response->status(),
                        'response' => $responseData,
                    ]
                );

                return $this->whatsappResult(
                    false,
                    'http_error',
                    (string) $errorMessage,
                    $target,
                    $profile,
                    $responseData,
                    $response->status()
                );
            }

            $apiSuccess = filter_var(
                $responseData['status']
                    ?? $responseData['success']
                    ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            if (!$apiSuccess) {
                $errorMessage = $responseData['reason']
                    ?? $responseData['message']
                    ?? 'Fonnte menolak pengiriman nota WhatsApp.';

                Log::error(
                    'Fonnte menolak pengiriman nota penjualan.',
                    [
                        'penjualan_id' => $penjualan->id,
                        'nomor_nota' => $penjualan->nomor_nota,
                        'company_profile_id' => $profile->id,
                        'sender' => $nomorPerusahaan,
                        'target' => $target,
                        'response' => $responseData,
                    ]
                );

                return $this->whatsappResult(
                    false,
                    'api_rejected',
                    (string) $errorMessage,
                    $target,
                    $profile,
                    $responseData,
                    $response->status()
                );
            }

            Log::info(
                'Nota penjualan berhasil dikirim melalui Fonnte.',
                [
                    'penjualan_id' => $penjualan->id,
                    'nomor_nota' => $penjualan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'company_name' => $profile->nama_perusahaan,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'http_status' => $response->status(),
                    'response' => $responseData,
                ]
            );

            return $this->whatsappResult(
                true,
                'sent',
                'Nota penjualan berhasil dikirim melalui WhatsApp.',
                $target,
                $profile,
                $responseData,
                $response->status()
            );
        } catch (ConnectionException $exception) {
            Log::error(
                'Tidak dapat terhubung ke API Fonnte saat mengirim nota penjualan.',
                [
                    'penjualan_id' => $penjualan->id,
                    'nomor_nota' => $penjualan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'error' => $exception->getMessage(),
                ]
            );

            return $this->whatsappResult(
                false,
                'connection_error',
                'Tidak dapat terhubung ke API Fonnte: ' . $exception->getMessage(),
                $target,
                $profile
            );
        } catch (Throwable $exception) {
            report($exception);

            Log::error(
                'Terjadi kesalahan saat mengirim nota penjualan melalui Fonnte.',
                [
                    'penjualan_id' => $penjualan->id,
                    'nomor_nota' => $penjualan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'error' => $exception->getMessage(),
                ]
            );

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
                ->withOptions([
                    'verify' => false,
                ])
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => trim($token),
                ])
                ->connectTimeout(
                    (int) env('FONNTE_CONNECT_TIMEOUT', 10)
                )
                ->timeout(
                    (int) env('FONNTE_TIMEOUT', 30)
                )
                ->post(
                    env('FONNTE_DEVICE_URL', self::FONNTE_DEVICE_URL)
                );

            $json = $response->json();
            $payload = is_array($json) ? $json : [];

            if (!$response->successful()) {
                $message = match ($response->status()) {
                    401 => 'Token API Fonnte tidak valid.',
                    403 => 'Token API Fonnte tidak memiliki akses.',
                    404 => 'Endpoint device Fonnte tidak ditemukan.',
                    405 => 'Endpoint device Fonnte harus dipanggil menggunakan POST.',
                    429 => 'Terlalu banyak request ke Fonnte.',
                    default => $payload['reason']
                        ?? $payload['message']
                        ?? 'Fonnte mengembalikan HTTP ' . $response->status() . '.',
                };

                return [
                    'success' => false,
                    'status' => 'error',
                    'message' => (string) $message,
                    'device_number' => null,
                    'device_status' => null,
                    'response' => $payload ?: $response->body(),
                ];
            }

            $apiSuccess = filter_var(
                $payload['status']
                    ?? $payload['success']
                    ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            $deviceNumber = $this->extractFonnteNumber($payload);

            $deviceStatus = strtolower(
                trim(
                    (string) (
                        $payload['device_status']
                        ?? $payload['deviceStatus']
                        ?? $payload['connection']
                        ?? $payload['status_device']
                        ?? data_get($payload, 'data.device_status')
                        ?? data_get($payload, 'data.status')
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

            if (!$connected) {
                return [
                    'success' => false,
                    'status' => 'disconnected',
                    'message' => (string) (
                        $payload['reason']
                        ?? $payload['message']
                        ?? $payload['detail']
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

            $number = $this->normalizeWhatsappNumber(
                (string) $candidate
            );

            if ($number) {
                return $number;
            }
        }

        return null;
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

    private function buildNotaWhatsappMessage(
        Penjualan $penjualan,
        CompanyProfile $profile
    ): string {
        $penjualan->loadMissing([
            'items.dataBarang',
            'items.variant',
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

        $alamatPerusahaan = trim(
            (string) $profile->alamat
        );

        $nomorPerusahaan = $this->normalizeWhatsappNumber(
            $profile->no_wa
        ) ?: '-';

        /*
        |--------------------------------------------------------------------------
        | Informasi transaksi
        |--------------------------------------------------------------------------
        */

        $tanggal = optional($penjualan->tanggal)
            ->format('d/m/Y') ?: '-';

        $namaCustomer = trim(
            (string) (
                $penjualan->customer?->nama_customer ?: '-'
            )
        );

        $nomorCustomer = $this->normalizeWhatsappNumber(
            $penjualan->customer?->no_wa
        ) ?: '-';

        $alamatCustomer = trim(
            (string) ($penjualan->customer?->alamat ?? '')
        );

        $pembayaran = trim(
            (string) (
                optional($penjualan->jenisPembayaran)->nama
                ?: ($penjualan->metode_pembayaran ?: '-')
            )
        );

        /*
        |--------------------------------------------------------------------------
        | Informasi tanda tangan
        |--------------------------------------------------------------------------
        */

        $kota = trim(
            (string) ($penjualan->kota ?: 'Kendal')
        );

        $tanggalTtd = optional(
            $penjualan->tanggal_ttd ?: $penjualan->tanggal
        )->format('d/m/Y') ?: $tanggal;

        $namaTtd = trim(
            (string) (
                $penjualan->nama_ttd
                ?: $namaPerusahaan
            )
        );

        /*
        |--------------------------------------------------------------------------
        | Ambil karyawan dari Catatan Power Box
        |--------------------------------------------------------------------------
        */

        $karyawanIds = collect($penjualan->catatans ?? [])
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
        | Format angka nota
        |--------------------------------------------------------------------------
        */

        $formatQty = function (mixed $qty): string {
            $qty = $this->toDecimal($qty);

            return rtrim(
                rtrim(
                    number_format($qty, 2, ',', '.'),
                    '0'
                ),
                ','
            );
        };

        $formatAngka = function (mixed $nominal): string {
            return number_format(
                $this->toDecimal($nominal),
                0,
                ',',
                '.'
            );
        };

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

        $lines[] = '*NOTA TRANSAKSI PENJUALAN*';
        $lines[] = '━━━━━━━━━━━━━━━━━━━━';

        $lines[] = '*Informasi Transaksi*';
        $lines[] = 'No. Nota   : ' . ($penjualan->nomor_nota ?: '-');
        $lines[] = 'Tanggal    : ' . $tanggal;
        $lines[] = 'Customer   : ' . $namaCustomer;
        $lines[] = 'No. WA     : ' . $nomorCustomer;
        $lines[] = 'Pembayaran : ' . $pembayaran;

        if ($alamatCustomer !== '') {
            $lines[] = 'Alamat     : ' . $alamatCustomer;
        }

        $lines[] = '';
        $lines[] = '*Rincian Barang*';

        if ($penjualan->items->isEmpty()) {
            $lines[] = '-';
        } else {
            foreach ($penjualan->items->values() as $index => $item) {
                $namaBarang = trim(
                    (string) (
                        $item->nama_barang
                        ?: $item->dataBarang?->nama_barang
                        ?: '-'
                    )
                );

                $namaVarian = trim(
                    (string) (
                        $item->nama_varian
                        ?: $item->variant?->nama
                        ?: ''
                    )
                );

                $namaProduk = $namaVarian !== ''
                    ? $namaBarang . ' - ' . $namaVarian
                    : $namaBarang;

                $qty = $formatQty($item->qty);
                $harga = $formatAngka($item->harga);
                $total = $formatAngka($item->total);

                $lines[] = sprintf(
                    '%d. *%s* : %s Kg x %s = *%s*',
                    $index + 1,
                    $namaProduk,
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

        $subtotal = $this->toDecimal(
            $penjualan->subtotal
        );

        $catatanTransaksi = $this->toDecimal(
            $penjualan->nilai_catatan_transaksi
        );

        $catatanPowerBox = $this->toDecimal(
            $penjualan->nilai_catatan_power_box
        );

        $penyesuaian = $this->toDecimal(
            $penjualan->penyesuaian
        );

        $totalAkhir = $this->toDecimal(
            $penjualan->total_akhir
        );

        $lines[] = '';
        $lines[] = '*Ringkasan Pembayaran*';
        $lines[] = 'Subtotal          : '
            . $this->formatRupiah($subtotal);

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

        $lines[] = 'Total Akhir       : *'
            . $this->formatRupiah($totalAkhir)
            . '*';

        /*
        |--------------------------------------------------------------------------
        | Catatan transaksi
        |--------------------------------------------------------------------------
        */

        if (filled($penjualan->catatan)) {
            $lines[] = '';
            $lines[] = '*Catatan*';
            $lines[] = trim(
                (string) $penjualan->catatan
            );
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

    private function normalizeWhatsappNumber(?string $number): ?string
    {
        if (!$number) {
            return null;
        }

        $number = preg_replace('/[^0-9]/', '', $number);

        if (!$number) {
            return null;
        }

        if (str_starts_with($number, '0')) {
            return '62' . substr($number, 1);
        }

        if (str_starts_with($number, '8')) {
            return '62' . $number;
        }

        return $number;
    }

    private function generateNomorNota(): string
    {
        $date = now()->format('Ymd');

        $countToday = Penjualan::withTrashed()
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->count() + 1;

        return 'PJ-' . $date . '-' . str_pad((string) $countToday, 4, '0', STR_PAD_LEFT);
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }

    private function toInteger($value): int
    {
        if ($value === null || $value === '') return 0;
        if (is_int($value)) return $value;
        if (is_float($value)) return (int) $value;

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' ', '.', ','], '', $value);

        return is_numeric($value) ? (int) $value : 0;
    }

    private function toDecimal($value): float
    {
        if ($value === null || $value === '') return 0.00;
        if (is_int($value) || is_float($value)) return round((float) $value, 2);

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
