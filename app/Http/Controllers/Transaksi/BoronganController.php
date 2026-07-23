<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\BarangVariant;
use App\Models\Borongan;
use App\Models\CompanyProfile;
use App\Models\DataBarang;
use App\Models\DataCustomer;
use App\Models\JenisPembayaran;
use App\Models\Pengeluaran;
use App\Models\PengeluaranItem;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class BoronganController extends Controller
{
    private const FONNTE_SEND_URL = 'https://api.fonnte.com/send';
    private const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $startDate = $request->query('start_date') ?: $request->query('from') ?: now()->toDateString();
        $endDate = $request->query('end_date') ?: $request->query('to') ?: $startDate;

        if ($startDate && $endDate && $startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $borongans = Borongan::query()
            ->with([
                'jenisPembayaran',
                'customer',
                'items.dataBarang',
                'items.outputs.dataBarang',
                'items.outputs.variant',
            ])
            ->when($startDate, function ($query) use ($startDate) {
                $query->whereDate('tanggal', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                $query->whereDate('tanggal', '<=', $endDate);
            })
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nomor_nota', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery
                                ->where('nama_customer', 'like', "%{$search}%")
                                ->orWhere('no_wa', 'like', "%{$search}%")
                                ->orWhere('alamat', 'like', "%{$search}%");
                        })
                        ->orWhere('tanggal', 'like', "%{$search}%")
                        ->orWhere('subtotal', 'like', "%{$search}%")
                        ->orWhere('total_akhir', 'like', "%{$search}%")
                        ->orWhereHas('items', function ($itemQuery) use ($search) {
                            $itemQuery->where('kode_barang', 'like', "%{$search}%")
                                ->orWhere('nama_barang', 'like', "%{$search}%")
                                ->orWhere('input_jenis_barang', 'like', "%{$search}%")
                                ->orWhereHas('outputs.variant', function ($variantQuery) use ($search) {
                                    $variantQuery->where('nama', 'like', "%{$search}%")
                                        ->orWhere('kode', 'like', "%{$search}%");
                                });
                        });
                });
            })
            ->orderByDesc('tanggal')
            ->latest('created_at')
            ->get();

        return response()->json([
            'message' => 'Data borongan berhasil diambil.',
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'data' => $borongans
                ->map(fn ($borongan) => $this->formatBorongan($borongan))
                ->values(),
        ]);
    }

    public function barangOptions(StockService $stockService): JsonResponse
    {
        $stokPerBarang = $stockService->stokPerBarangMap();
        $stokPerVariant = $stockService->stokPerVariantMap();

        $barangs = DataBarang::query()
            ->with(['variants' => function ($query) {
                $query->where('is_active', true)
                    ->orderBy('nama');
            }])
            ->orderBy('nama_barang')
            ->get(['id', 'kode', 'nama_barang']);

        return response()->json([
            'message' => 'Data barang berhasil diambil.',
            'data' => $barangs
                ->map(function ($barang) use ($stokPerBarang, $stokPerVariant) {
                    $barangId = (string) $barang->id;
                    $stokJenis = $stokPerBarang->get($barangId, []);

                    return [
                        'id' => $barangId,
                        'kode' => $barang->kode ?? '-',
                        'kode_barang' => $barang->kode ?? '-',
                        'nama_barang' => $barang->nama_barang,

                        'stok_mentah' => round((float) ($stokJenis['mentah'] ?? 0), 2),
                        'stok_jadi' => round((float) ($stokJenis['jadi'] ?? 0), 2),
                        'stok_tersedia' => round((float) ($stokJenis['mentah'] ?? 0), 2),

                        'stok_by_jenis' => collect($stokJenis)
                            ->map(fn ($value) => round((float) $value, 2))
                            ->toArray(),

                        'variants' => $barang->variants
                            ->map(function ($variant) use ($stokPerVariant) {
                                $variantId = (string) $variant->id;

                                return [
                                    'id' => $variantId,
                                    'data_barang_id' => $variant->data_barang_id,
                                    'nama' => $variant->nama,
                                    'kode' => $variant->kode,
                                    'is_active' => (bool) $variant->is_active,
                                    'stok_jadi' => round((float) ($stokPerVariant[$variantId] ?? 0), 2),
                                ];
                            })
                            ->values(),

                        'harga' => 0,
                    ];
                })
                ->values(),
        ]);
    }

    public function customerOptions(): JsonResponse
    {
        $customers = DataCustomer::query()
            ->orderBy('nama_customer')
            ->get([
                'id',
                'nama_customer',
                'no_wa',
                'alamat',
            ]);

        return response()->json([
            'message' => 'Data customer berhasil diambil.',
            'data' => $customers
                ->map(fn (DataCustomer $customer): array => [
                    'id' => (string) $customer->id,
                    'value' => (string) $customer->id,
                    'label' => $customer->nama_customer,
                    'nama_customer' => $customer->nama_customer,
                    'no_wa' => $customer->no_wa,
                    'alamat' => $customer->alamat,
                ])
                ->values(),
        ]);
    }

    public function storeVariant(Request $request, DataBarang $dataBarang): JsonResponse
    {
        $validated = $request->validate([
            'nama' => [
                'required',
                'string',
                'max:150',
                Rule::unique('barang_variants', 'nama')
                    ->where(fn ($query) => $query->where('data_barang_id', $dataBarang->id)),
            ],
            'kode' => [
                'nullable',
                'string',
                'max:150',
                Rule::unique('barang_variants', 'kode')
                    ->where(fn ($query) => $query->where('data_barang_id', $dataBarang->id)),
            ],
        ], [
            'nama.required' => 'Nama varian wajib diisi.',
            'nama.unique' => 'Varian ini sudah ada untuk barang tersebut.',
            'kode.unique' => 'Kode varian ini sudah digunakan untuk barang tersebut.',
        ]);

        $variant = BarangVariant::create([
            'data_barang_id' => $dataBarang->id,
            'nama' => $validated['nama'],
            'kode' => $this->normalizeKodeVarian($validated['kode'] ?? $validated['nama']),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Varian berhasil ditambahkan.',
            'data' => [
                'id' => $variant->id,
                'data_barang_id' => $variant->data_barang_id,
                'nama' => $variant->nama,
                'kode' => $variant->kode,
                'is_active' => (bool) $variant->is_active,
            ],
        ], 201);
    }

    public function store(Request $request, StockService $stockService): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $borongan = DB::transaction(function () use ($validated, $stockService) {
            $items = $this->prepareItems($validated['items']);

            $stockService->assertAvailable($items);

            $totals = $this->calculateTotals($items, $validated['penyesuaian'] ?? 0);

            $borongan = Borongan::create([
                'nomor_nota' => $this->generateNomorNota(),
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $validated['jenis_pembayaran_id'],
                'metode_pembayaran' => $this->resolveMetodePembayaran($validated['jenis_pembayaran_id']),
                'subtotal' => $totals['subtotal'],
                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'],
            ]);

            foreach ($items as $itemData) {
                $outputs = $itemData['outputs'];
                unset($itemData['outputs']);

                $item = $borongan->items()->create($itemData);
                $item->outputs()->createMany($outputs);
            }

            $borongan = $borongan->fresh([
                'jenisPembayaran',
                'customer',
                'items.dataBarang',
                'items.outputs.dataBarang',
                'items.outputs.variant',
            ]);

            $stockService->rebuildBorongan($borongan);

            $this->syncMutasiTransaksi($borongan);

            return $borongan;
        });

        $whatsappResult = $this->sendNotaWhatsapp($borongan);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data borongan berhasil ditambahkan dan nota WhatsApp berhasil dikirim.'
                : 'Data borongan berhasil ditambahkan, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatBorongan($borongan),
            'whatsapp' => $whatsappResult,
        ], 201);
    }

    public function show(Borongan $borongan): JsonResponse
    {
        $borongan->load([
            'jenisPembayaran',
            'customer',
            'items.dataBarang',
            'items.outputs.dataBarang',
            'items.outputs.variant',
        ]);

        return response()->json([
            'message' => 'Detail borongan berhasil diambil.',
            'data' => $this->formatBorongan($borongan),
        ]);
    }

    public function update(Request $request, Borongan $borongan, StockService $stockService): JsonResponse
    {
        $validated = $this->validateRequest($request, $borongan);

        $borongan = DB::transaction(function () use ($validated, $borongan, $stockService) {
            $items = $this->prepareItems($validated['items']);

            $stockService->assertAvailable($items, $borongan);

            $totals = $this->calculateTotals($items, $validated['penyesuaian'] ?? 0);

            $borongan->update([
                'customer_id' => $validated['customer_id'],
                'tanggal' => $validated['tanggal'],
                'jenis_pembayaran_id' => $validated['jenis_pembayaran_id'],
                'metode_pembayaran' => $this->resolveMetodePembayaran($validated['jenis_pembayaran_id']),
                'subtotal' => $totals['subtotal'],
                'penyesuaian' => $totals['penyesuaian'],
                'total_akhir' => $totals['total_akhir'],
                'catatan' => $validated['catatan'] ?? null,
                'kota' => $validated['kota'] ?? 'Kendal',
                'tanggal_ttd' => $validated['tanggal_ttd'] ?? $validated['tanggal'],
                'nama_ttd' => $validated['nama_ttd'],
            ]);

            StockMovement::query()
                ->whereIn('source_type', ['borongan_input', 'borongan_output'])
                ->where('source_id', $borongan->id)
                ->delete();

            $this->deleteMutasiTransaksi($borongan);

            $borongan->items()->delete();

            foreach ($items as $itemData) {
                $outputs = $itemData['outputs'];
                unset($itemData['outputs']);

                $item = $borongan->items()->create($itemData);
                $item->outputs()->createMany($outputs);
            }

            $borongan = $borongan->fresh([
                'jenisPembayaran',
                'customer',
                'items.dataBarang',
                'items.outputs.dataBarang',
                'items.outputs.variant',
            ]);

            $stockService->rebuildBorongan($borongan);

            $this->syncMutasiTransaksi($borongan);

            return $borongan;
        });

        $whatsappResult = $this->sendNotaWhatsapp($borongan);

        return response()->json([
            'message' => $whatsappResult['success']
                ? 'Data borongan berhasil diperbarui dan nota WhatsApp berhasil dikirim.'
                : 'Data borongan berhasil diperbarui, tetapi nota WhatsApp tidak terkirim.',
            'data' => $this->formatBorongan($borongan),
            'whatsapp' => $whatsappResult,
        ]);
    }

    public function destroy(Borongan $borongan): JsonResponse
    {
        DB::transaction(function () use ($borongan) {
            StockMovement::query()
                ->whereIn('source_type', ['borongan_input', 'borongan_output'])
                ->where('source_id', $borongan->id)
                ->delete();

            $this->deleteMutasiTransaksi($borongan);

            $borongan->items()->delete();
            $borongan->delete();
        });

        return response()->json([
            'message' => 'Data borongan berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request, ?Borongan $borongan = null): array
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
                        'input_jenis_barang' => $this->normalizeJenisBarang($item['input_jenis_barang'] ?? 'mentah'),
                        'qty' => $this->toDecimal($item['qty'] ?? 0),
                        'output_qty' => $this->toDecimal($item['output_qty'] ?? 0),
                        'outputs' => collect($item['outputs'] ?? [])
                            ->map(function ($output) {
                                return [
                                    'barang_variant_id' => $output['barang_variant_id'] ?? null,
                                    'qty' => $this->toDecimal($output['qty'] ?? 0),
                                    'harga' => $this->toInteger($output['harga'] ?? 0),
                                ];
                            })
                            ->values()
                            ->toArray(),
                    ];
                })
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
                    ->where(fn ($query) => $query->where('is_active', true)),
            ],
            'penyesuaian' => ['nullable', 'numeric'],
            'catatan' => ['nullable', 'string'],
            'kota' => ['nullable', 'string', 'max:100'],
            'tanggal_ttd' => ['nullable', 'date'],
            'nama_ttd' => ['required', 'string', 'max:150'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.data_barang_id' => ['required', 'uuid', Rule::exists('data_barangs', 'id')],
            'items.*.input_jenis_barang' => ['required', 'string', 'max:50'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01', 'decimal:0,2'],
            'items.*.output_qty' => ['required', 'numeric', 'min:0.01', 'decimal:0,2'],

            'items.*.outputs' => ['required', 'array', 'min:1'],
            'items.*.outputs.*.barang_variant_id' => ['required', 'uuid', Rule::exists('barang_variants', 'id')],
            'items.*.outputs.*.qty' => ['required', 'numeric', 'min:0.01', 'decimal:0,2'],
            'items.*.outputs.*.harga' => ['required', 'integer', 'min:0'],
        ], [
            'customer_id.required' => 'Data customer wajib dipilih.',
            'customer_id.uuid' => 'Format ID customer tidak valid.',
            'customer_id.exists' => 'Data customer tidak ditemukan atau sudah dihapus.',
            'tanggal.required' => 'Tanggal wajib diisi.',
            'nama_ttd.required' => 'Nama TTD wajib diisi.',
            'nama_ttd.string' => 'Nama TTD harus berupa teks.',
            'nama_ttd.max' => 'Nama TTD maksimal 150 karakter.',
            'jenis_pembayaran_id.required' => 'Jenis pembayaran wajib dipilih.',
            'jenis_pembayaran_id.uuid' => 'Format ID jenis pembayaran tidak valid.',
            'jenis_pembayaran_id.exists' => 'Jenis pembayaran tidak valid atau tidak aktif.',
            'items.required' => 'Minimal satu input borongan wajib diisi.',
            'items.*.data_barang_id.required' => 'Barang input wajib dipilih.',
            'items.*.qty.required' => 'Qty input wajib diisi.',
            'items.*.output_qty.required' => 'Total output wajib diisi.',
            'items.*.outputs.required' => 'Split varian wajib diisi.',
            'items.*.outputs.*.barang_variant_id.required' => 'Varian wajib dipilih.',
            'items.*.outputs.*.qty.required' => 'Qty varian wajib diisi.',
            'items.*.outputs.*.harga.required' => 'Harga varian wajib diisi.',
            'items.*.outputs.*.harga.integer' => 'Harga varian harus berupa angka bulat.',
        ]);

        foreach ($validated['items'] as $index => $item) {
            $totalSplit = round((float) collect($item['outputs'])->sum('qty'), 2);
            $outputQty = round((float) $item['output_qty'], 2);

            if ($totalSplit !== $outputQty) {
                abort(422, 'Baris input nomor ' . ($index + 1) . ': total split varian harus sama dengan total output. Total output '
                    . $outputQty . ' KG, total split ' . $totalSplit . ' KG.');
            }

            $variantCount = collect($item['outputs'])
                ->pluck('barang_variant_id')
                ->filter()
                ->count();

            $uniqueVariantCount = collect($item['outputs'])
                ->pluck('barang_variant_id')
                ->filter()
                ->unique()
                ->count();

            if ($variantCount !== $uniqueVariantCount) {
                abort(422, 'Baris input nomor ' . ($index + 1) . ': varian tidak boleh duplikat.');
            }
        }

        return $validated;
    }

    private function prepareItems(array $items): array
    {
        $barangIds = collect($items)
            ->pluck('data_barang_id')
            ->filter()
            ->unique()
            ->values();

        $variantIds = collect($items)
            ->flatMap(fn ($item) => collect($item['outputs'])->pluck('barang_variant_id'))
            ->filter()
            ->unique()
            ->values();

        $barangs = DataBarang::query()
            ->whereIn('id', $barangIds)
            ->get(['id', 'kode', 'nama_barang'])
            ->keyBy('id');

        $variants = BarangVariant::query()
            ->whereIn('id', $variantIds)
            ->get(['id', 'data_barang_id', 'nama', 'kode'])
            ->keyBy('id');

        return collect($items)
            ->map(function ($item) use ($barangs, $variants) {
                $barang = $barangs->get($item['data_barang_id']);

                $qtyInput = max(0.01, $this->toDecimal($item['qty']));
                $outputQty = max(0.01, $this->toDecimal($item['output_qty']));

                $outputs = collect($item['outputs'])
                    ->map(function ($output) use ($barang, $variants) {
                        $variant = $variants->get($output['barang_variant_id']);

                        if (!$variant || (string) $variant->data_barang_id !== (string) $barang?->id) {
                            abort(422, 'Varian tidak sesuai dengan barang input ' . ($barang?->nama_barang ?? '-'));
                        }

                        $qty = max(0.01, $this->toDecimal($output['qty']));
                        $harga = max(0, $this->toInteger($output['harga'] ?? 0));
                        $total = round($qty * $harga, 2);

                        return [
                            'data_barang_id' => $barang?->id,
                            'barang_variant_id' => $variant->id,
                            'kode_barang' => $barang?->kode ?? '-',
                            'nama_barang' => $barang?->nama_barang ?? '-',
                            'jenis_barang' => 'jadi',
                            'nama_varian' => $variant->nama,
                            'qty' => $qty,
                            'harga' => $harga,
                            'total' => $total,
                        ];
                    })
                    ->values()
                    ->toArray();

                return [
                    'data_barang_id' => $barang?->id,
                    'kode_barang' => $barang?->kode ?? '-',
                    'nama_barang' => $barang?->nama_barang ?? '-',
                    'input_jenis_barang' => $this->normalizeJenisBarang($item['input_jenis_barang'] ?? 'mentah'),
                    'qty' => $qtyInput,
                    'output_qty' => $outputQty,
                    'outputs' => $outputs,
                ];
            })
            ->values()
            ->toArray();
    }

    private function calculateTotals(array $items, mixed $penyesuaianValue): array
    {
        $subtotal = round((float) collect($items)
            ->flatMap(fn ($item) => $item['outputs'] ?? [])
            ->sum('total'), 2);

        $penyesuaian = $this->toDecimal($penyesuaianValue);
        $totalAkhir = round($subtotal + $penyesuaian, 2);

        return [
            'subtotal' => $subtotal,
            'penyesuaian' => $penyesuaian,
            'total_akhir' => $totalAkhir,
        ];
    }

    private function formatBorongan(Borongan $borongan): array
    {
        $borongan->loadMissing([
            'jenisPembayaran',
            'customer',
            'items.dataBarang',
            'items.outputs.dataBarang',
            'items.outputs.variant',
        ]);

        return [
            'id' => $borongan->id,
            'nomor_nota' => $borongan->nomor_nota,
            'customer_id' => $borongan->customer_id,
            'customer' => $borongan->customer ? [
                'id' => (string) $borongan->customer->id,
                'nama_customer' => $borongan->customer->nama_customer,
                'no_wa' => $borongan->customer->no_wa,
                'alamat' => $borongan->customer->alamat,
            ] : null,
            'nama_pelanggan' => $borongan->customer?->nama_customer,
            'no_wa_pelanggan' => $borongan->customer?->no_wa,
            'tanggal' => optional($borongan->tanggal)->format('Y-m-d'),
            'jenis_pembayaran_id' => $borongan->jenis_pembayaran_id,
            'metode_pembayaran' => $borongan->metode_pembayaran,
            'jenis_pembayaran_label' => optional($borongan->jenisPembayaran)->nama,
            'subtotal' => $this->toDecimal($borongan->subtotal),
            'penyesuaian' => $this->toDecimal($borongan->penyesuaian),
            'total_akhir' => $this->toDecimal($borongan->total_akhir),
            'catatan' => $borongan->catatan,
            'kota' => $borongan->kota,
            'tanggal_ttd' => optional($borongan->tanggal_ttd)->format('Y-m-d'),
            'nama_ttd' => $borongan->nama_ttd,
            'items' => $borongan->items
                ->map(function ($item) {
                    $barang = $item->dataBarang;

                    return [
                        'id' => $item->id,
                        'borongan_id' => $item->borongan_id,
                        'data_barang_id' => $item->data_barang_id,
                        'kode_barang' => $item->kode_barang ?: ($barang?->kode ?? '-'),
                        'nama_barang' => $barang?->nama_barang ?? $item->nama_barang ?? '-',
                        'input_jenis_barang' => $item->input_jenis_barang ?: 'mentah',
                        'qty' => $this->toDecimal($item->qty),

                        'output_qty' => $this->toDecimal($item->output_qty),

                        'outputs' => $item->outputs
                            ->map(function ($output) {
                                $barang = $output->dataBarang;
                                $variant = $output->variant;

                                return [
                                    'id' => $output->id,
                                    'borongan_item_id' => $output->borongan_item_id,
                                    'data_barang_id' => $output->data_barang_id,
                                    'barang_variant_id' => $output->barang_variant_id,
                                    'kode_barang' => $output->kode_barang ?: ($barang?->kode ?? '-'),
                                    'nama_barang' => $barang?->nama_barang ?? $output->nama_barang ?? '-',
                                    'jenis_barang' => $output->jenis_barang ?: 'jadi',
                                    'nama_varian' => $variant?->nama ?? $output->nama_varian ?? '-',
                                    'kode_varian' => $variant?->kode,
                                    'qty' => $this->toDecimal($output->qty),
                                    'harga' => $this->toInteger($output->harga),
                                    'total' => $this->toDecimal($output->total),
                                ];
                            })
                            ->values(),
                    ];
                })
                ->values(),
            'created_at' => optional($borongan->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($borongan->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($borongan->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }


    private function sendNotaWhatsapp(Borongan $borongan): array
    {
        $borongan->loadMissing([
            'jenisPembayaran',
            'customer',
            'items.dataBarang',
            'items.outputs.dataBarang',
            'items.outputs.variant',
        ]);

        $target = $this->normalizeWhatsappNumber($borongan->customer?->no_wa);

        if (!$target) {
            $message = 'Nota WhatsApp tidak dikirim karena nomor WhatsApp pelanggan kosong atau tidak valid.';

            Log::warning($message, [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'nomor_input' => $borongan->customer?->no_wa,
            ]);

            return $this->whatsappResult(false, 'target_invalid', $message);
        }

        $profile = CompanyProfile::query()->first();

        if (!$profile) {
            $message = 'Nota WhatsApp tidak dikirim karena profil perusahaan belum dibuat.';

            Log::warning($message, [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
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
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
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
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
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

        $nomorPerusahaan = $this->normalizeWhatsappNumber($profile->no_wa);

        if (!$nomorPerusahaan) {
            $message = 'Nota WhatsApp tidak dikirim karena nomor WhatsApp perusahaan belum valid.';

            Log::warning($message, [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
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
            $this->saveFonnteStatus($profile, $deviceResult);

            Log::warning('Nota WhatsApp borongan tidak dikirim karena device Fonnte tidak terhubung.', [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'company_profile_id' => $profile->id,
                'target' => $target,
                'device_result' => $deviceResult,
            ]);

            return $this->whatsappResult(
                false,
                'fonnte_disconnected',
                $deviceResult['message'],
                $target,
                $profile,
                $deviceResult
            );
        }

        $nomorDevice = $this->normalizeWhatsappNumber($deviceResult['device_number']);

        if ($nomorDevice && $nomorPerusahaan !== $nomorDevice) {
            $message = "Token Fonnte terhubung ke nomor {$nomorDevice}, sedangkan nomor perusahaan adalah {$nomorPerusahaan}.";

            $deviceResult = [
                ...$deviceResult,
                'success' => false,
                'status' => 'mismatch',
                'message' => $message,
            ];

            $this->saveFonnteStatus($profile, $deviceResult);

            Log::warning('Nota WhatsApp borongan tidak dikirim karena nomor device Fonnte berbeda.', [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'company_profile_id' => $profile->id,
                'nomor_perusahaan' => $nomorPerusahaan,
                'nomor_device' => $nomorDevice,
                'target' => $target,
            ]);

            return $this->whatsappResult(
                false,
                'device_number_mismatch',
                $message,
                $target,
                $profile,
                $deviceResult
            );
        }

        $this->saveFonnteStatus($profile, $deviceResult);

        $message = $this->buildNotaWhatsappMessage($borongan, $profile);

        try {
            $sendUrl = (string) env('FONNTE_SEND_URL', self::FONNTE_SEND_URL);
            $connectTimeout = (int) env('FONNTE_CONNECT_TIMEOUT', 10);
            $timeout = (int) env('FONNTE_TIMEOUT', 30);

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
                ->post($sendUrl, [
                    'target' => $target,
                    'message' => $message,
                    'countryCode' => '62',
                ]);

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

                Log::error('HTTP Fonnte gagal mengirim nota borongan.', [
                    'borongan_id' => $borongan->id,
                    'nomor_nota' => $borongan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'http_status' => $response->status(),
                    'response' => $responseData,
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

                Log::error('Fonnte menolak pengiriman nota borongan.', [
                    'borongan_id' => $borongan->id,
                    'nomor_nota' => $borongan->nomor_nota,
                    'company_profile_id' => $profile->id,
                    'sender' => $nomorPerusahaan,
                    'target' => $target,
                    'response' => $responseData,
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

            Log::info('Nota borongan berhasil dikirim melalui Fonnte.', [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'company_profile_id' => $profile->id,
                'company_name' => $profile->nama_perusahaan,
                'sender' => $nomorPerusahaan,
                'target' => $target,
                'http_status' => $response->status(),
                'response' => $responseData,
            ]);

            return $this->whatsappResult(
                true,
                'sent',
                'Nota borongan berhasil dikirim melalui WhatsApp.',
                $target,
                $profile,
                $responseData,
                $response->status()
            );
        } catch (ConnectionException $exception) {
            Log::error('Tidak dapat terhubung ke API Fonnte saat mengirim nota borongan.', [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'company_profile_id' => $profile->id,
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

            Log::error('Terjadi kesalahan saat mengirim nota borongan melalui Fonnte.', [
                'borongan_id' => $borongan->id,
                'nomor_nota' => $borongan->nomor_nota,
                'company_profile_id' => $profile->id,
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
            $deviceUrl = (string) env('FONNTE_DEVICE_URL', self::FONNTE_DEVICE_URL);
            $connectTimeout = (int) env('FONNTE_CONNECT_TIMEOUT', 10);
            $timeout = (int) env('FONNTE_TIMEOUT', 30);

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

    private function saveFonnteStatus(CompanyProfile $profile, array $result): void
    {
        $profile->fonnte_connection_status = $result['status'];
        $profile->fonnte_connection_message = $result['message'];
        $profile->fonnte_last_checked_at = now();

        if (!$result['success']) {
            $profile->fonnte_enabled = false;
        }

        $profile->save();
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
        Borongan $borongan,
        CompanyProfile $profile
    ): string {
        $borongan->loadMissing([
            'jenisPembayaran',
            'customer',
            'items.dataBarang',
            'items.outputs.dataBarang',
            'items.outputs.variant',
        ]);

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

        $tanggal = optional($borongan->tanggal)
            ->format('d/m/Y') ?: '-';

        $namaCustomer = trim(
            (string) (
                $borongan->customer?->nama_customer ?: '-'
            )
        );

        $nomorCustomer = $this->normalizeWhatsappNumber(
            $borongan->customer?->no_wa
        ) ?: '-';

        $alamatCustomer = trim(
            (string) ($borongan->customer?->alamat ?? '')
        );

        $pembayaran = trim(
            (string) (
                optional($borongan->jenisPembayaran)->nama
                ?: ($borongan->metode_pembayaran ?: '-')
            )
        );

        $kota = trim(
            (string) ($borongan->kota ?: 'Kendal')
        );

        $tanggalTtd = optional(
            $borongan->tanggal_ttd ?: $borongan->tanggal
        )->format('d/m/Y') ?: $tanggal;

        $namaTtd = trim((string) $borongan->nama_ttd);

        $formatAngka = function (mixed $nominal): string {
            return number_format(
                $this->toDecimal($nominal),
                0,
                ',',
                '.'
            );
        };

        $lines = [];

        $lines[] = '*' . strtoupper($namaPerusahaan) . '*';

        if ($alamatPerusahaan !== '') {
            $lines[] = $alamatPerusahaan;
        }

        $lines[] = 'Wa: ' . $nomorPerusahaan;
        $lines[] = '';

        $lines[] = '*NOTA TRANSAKSI BORONGAN*';
        $lines[] = '━━━━━━━━━━━━━━━━━━━━';

        $lines[] = '*Informasi Transaksi*';
        $lines[] = 'No. Nota   : ' . ($borongan->nomor_nota ?: '-');
        $lines[] = 'Tanggal    : ' . $tanggal;
        $lines[] = 'Customer   : ' . $namaCustomer;
        $lines[] = 'No. WA     : ' . $nomorCustomer;
        $lines[] = 'Pembayaran : ' . $pembayaran;

        if ($alamatCustomer !== '') {
            $lines[] = 'Alamat     : ' . $alamatCustomer;
        }

        $lines[] = '';
        $lines[] = '*Rincian Produksi*';

        if ($borongan->items->isEmpty()) {
            $lines[] = '-';
        } else {
            foreach ($borongan->items->values() as $index => $item) {
                $namaBarang = trim(
                    (string) (
                        $item->nama_barang
                        ?: $item->dataBarang?->nama_barang
                        ?: '-'
                    )
                );

                $lines[] = sprintf(
                    '%d. *%s*',
                    $index + 1,
                    $namaBarang
                );

                $lines[] = '   Input Bahan : '
                    . $this->formatQty($item->qty)
                    . ' Kg';

                $lines[] = '   Hasil Jadi  : '
                    . $this->formatQty($item->output_qty)
                    . ' Kg';

                if ($item->outputs->isNotEmpty()) {
                    $lines[] = '   Rincian Varian:';

                    foreach ($item->outputs->values() as $outputIndex => $output) {
                        $namaVarian = trim(
                            (string) (
                                $output->nama_varian
                                ?: $output->variant?->nama
                                ?: '-'
                            )
                        );

                        $qty = $this->formatQty($output->qty);
                        $harga = $formatAngka($output->harga);
                        $total = $formatAngka($output->total);

                        $lines[] = sprintf(
                            '   %d.%d *%s* : %s Kg x %s = *%s*',
                            $index + 1,
                            $outputIndex + 1,
                            $namaVarian,
                            $qty,
                            $harga,
                            $total
                        );
                    }
                }
            }
        }

        $subtotal = $this->toDecimal($borongan->subtotal);
        $penyesuaian = $this->toDecimal($borongan->penyesuaian);
        $totalAkhir = $this->toDecimal($borongan->total_akhir);

        $lines[] = '';
        $lines[] = '*Ringkasan Pembayaran*';
        $lines[] = 'Subtotal          : '
            . $this->formatRupiah($subtotal);

        if ($penyesuaian != 0.0) {
            $prefix = $penyesuaian > 0 ? '+' : '-';

            $lines[] = 'Penyesuaian       : '
                . $prefix
                . $this->formatRupiah(abs($penyesuaian));
        }

        $lines[] = 'Total Akhir       : *'
            . $this->formatRupiah($totalAkhir)
            . '*';

        if (filled($borongan->catatan)) {
            $lines[] = '';
            $lines[] = '*Catatan*';
            $lines[] = trim((string) $borongan->catatan);
        }

        $lines[] = '';
        $lines[] = '━━━━━━━━━━━━━━━━━━━━';
        $lines[] = $kota . ', ' . $tanggalTtd;
        $lines[] = 'Hormat kami,';
        $lines[] = '';
        $lines[] = '*' . $namaTtd . '*';
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

    private function formatQty($qty): string
    {
        $qty = $this->toDecimal($qty);

        return rtrim(rtrim(number_format($qty, 2, ',', '.'), '0'), ',');
    }

    private function syncMutasiTransaksi(Borongan $borongan): void
    {
        $borongan->loadMissing('customer');

        $tanggal = optional($borongan->tanggal)->format('Y-m-d');
        $jenisPembayaranId = $borongan->jenis_pembayaran_id;
        $nominal = $this->toDecimal($borongan->total_akhir);

        if (!$tanggal || !$jenisPembayaranId) {
            abort(422, 'Tanggal dan jenis pembayaran borongan wajib diisi.');
        }

        $this->deleteMutasiTransaksi($borongan);

        if ($nominal <= 0) {
            return;
        }

        $pengeluaran = Pengeluaran::query()
            ->with(['items', 'deposits.jenisPembayaran'])
            ->whereDate('tanggal', $tanggal)
            ->where('status', 'open')
            ->lockForUpdate()
            ->first();

        if (!$pengeluaran) {
            abort(422, 'Mutasi kasir/deposit untuk tanggal ' . $tanggal . ' belum dibuka. Buka kasir terlebih dahulu sebelum membuat transaksi borongan.');
        }

        $jenisPembayaran = JenisPembayaran::query()->findOrFail($jenisPembayaranId);
        $sisaLimit = $this->getSisaLimitPembayaran($pengeluaran, (string) $jenisPembayaran->id);

        if ($nominal > $sisaLimit) {
            abort(422, 'Saldo deposit ' . $jenisPembayaran->nama . ' tidak cukup untuk borongan ini. Sisa: ' . $this->formatRupiah($sisaLimit) . ', kebutuhan: ' . $this->formatRupiah($nominal) . '.');
        }

        $pengeluaran->items()->create([
            'tanggal' => $tanggal,
            'jenis_pengeluaran' => 'Borongan',
            'customer_id' => $borongan->customer_id,
            'deskripsi' => 'Borongan ' . ($borongan->nomor_nota ?: '-') . ' - ' . ($borongan->customer?->nama_customer ?: '-'),
            'metode_pembayaran' => $jenisPembayaran->kode,
            'jenis_pembayaran_id' => $jenisPembayaran->id,
            'nominal' => $nominal,
            'catatan' => 'Otomatis dari transaksi borongan.',
            'source_type' => 'borongan',
            'source_id' => $borongan->id,
        ]);

        $this->recalculateMutasiTotals($pengeluaran);
    }

    private function deleteMutasiTransaksi(Borongan $borongan): void
    {
        $items = PengeluaranItem::query()
            ->with('pengeluaran')
            ->where('source_type', 'borongan')
            ->where('source_id', $borongan->id)
            ->get();

        $pengeluarans = $items
            ->map(fn ($item) => $item->pengeluaran)
            ->filter()
            ->unique('id')
            ->values();

        foreach ($items as $item) {
            $item->delete();
        }

        foreach ($pengeluarans as $pengeluaran) {
            $this->recalculateMutasiTotals($pengeluaran);
        }
    }

    private function getSisaLimitPembayaran(
        Pengeluaran $pengeluaran,
        string $jenisPembayaranId
    ): float {
        $pengeluaran->loadMissing(['deposits', 'items']);

        $jenisPembayaranId = trim($jenisPembayaranId);

        $deposit = round(
            (float) $pengeluaran->deposits
                ->filter(
                    fn ($deposit): bool =>
                        (string) $deposit->jenis_pembayaran_id
                        === $jenisPembayaranId
                )
                ->sum('nominal'),
            2
        );

        $totalTerpakai = round(
            (float) $pengeluaran->items
                ->filter(
                    fn ($item): bool =>
                        (string) $item->jenis_pembayaran_id
                        === $jenisPembayaranId
                )
                ->sum('nominal'),
            2
        );

        return round($deposit - $totalTerpakai, 2);
    }

    private function recalculateMutasiTotals(Pengeluaran $pengeluaran): Pengeluaran
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

        return $pengeluaran;
    }

    private function resolveMetodePembayaran(
        ?string $jenisPembayaranId
    ): ?string {
        $jenisPembayaranId = trim((string) $jenisPembayaranId);

        if ($jenisPembayaranId === '') {
            return null;
        }

        return JenisPembayaran::query()
            ->where('id', $jenisPembayaranId)
            ->where('is_active', true)
            ->value('kode');
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }

    private function generateNomorNota(): string
    {
        $date = now()->format('Ymd');

        $countToday = Borongan::withTrashed()
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->count() + 1;

        return 'BR-' . $date . '-' . str_pad((string) $countToday, 4, '0', STR_PAD_LEFT);
    }

    private function normalizeJenisBarang(?string $value): string
    {
        $value = strtolower(trim((string) $value));
        $value = preg_replace('/\s+/', '_', $value);

        return $value ?: 'mentah';
    }

    private function normalizeKodeVarian(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return 'varian';
        }

        return Str::slug($value, '_') ?: 'varian';
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
        if (is_float($value) || is_int($value)) return round((float) $value, 2);

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
