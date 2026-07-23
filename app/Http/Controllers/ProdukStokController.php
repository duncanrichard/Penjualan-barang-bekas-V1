<?php

namespace App\Http\Controllers;

use App\Models\BoronganItemOutput;
use App\Models\DataBarang;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ProdukStokController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $jenisBarang = $request->query('jenis_barang');
        $barangVariantId = $request->query('barang_variant_id');

        $movementRows = StockMovement::query()
            ->select('data_barang_id', 'jenis_barang', 'barang_variant_id')
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->groupBy('data_barang_id', 'jenis_barang', 'barang_variant_id')
            ->get();

        $stokBarangMap = $this->buildStokBarangMap($movementRows);
        $stokVariantMap = $this->buildStokVariantMap($movementRows);

        $dataBarangs = DataBarang::query()
            ->with([
                'kategori',
                'variants' => fn ($query) => $query->orderBy('nama'),
            ])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('kode', 'like', "%{$search}%")
                        ->orWhere('nama_barang', 'like', "%{$search}%")
                        ->orWhereHas('kategori', function ($kategoriQuery) use ($search) {
                            $kategoriQuery->where('nama', 'like', "%{$search}%")
                                ->orWhere('kode', 'like', "%{$search}%");
                        })
                        ->orWhereHas('variants', function ($variantQuery) use ($search) {
                            $variantQuery->where('nama', 'like', "%{$search}%")
                                ->orWhere('kode', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy('nama_barang')
            ->get();

        $summary = $dataBarangs
            ->map(function ($barang) use ($stokBarangMap, $stokVariantMap) {
                $barangId = (string) $barang->id;

                $stokMentah = round((float) data_get($stokBarangMap, "{$barangId}.mentah", 0), 2);
                $stokJadiNonVarian = round((float) data_get($stokBarangMap, "{$barangId}.jadi_non_varian", 0), 2);

                $variants = $barang->variants
                    ->map(function ($variant) use ($stokVariantMap) {
                        $variantId = (string) $variant->id;
                        $stokJadi = round((float) ($stokVariantMap[$variantId] ?? 0), 2);

                        return [
                            'id' => $variantId,
                            'data_barang_id' => (string) $variant->data_barang_id,
                            'kode' => $variant->kode,
                            'nama' => $variant->nama,
                            'is_active' => (bool) $variant->is_active,
                            'stok_jadi' => $stokJadi,
                        ];
                    })
                    ->values();

                $stokJadiVarian = round((float) $variants->sum('stok_jadi'), 2);
                $stokJadi = round($stokJadiNonVarian + $stokJadiVarian, 2);
                $stokTotal = round($stokMentah + $stokJadi, 2);

                return [
                    'id' => $barangId,
                    'kategori_id' => $barang->kategori_id ? (string) $barang->kategori_id : null,
                    'kategori' => $barang->kategori ? [
                        'id' => (string) $barang->kategori->id,
                        'kode' => $barang->kategori->kode,
                        'nama' => $barang->kategori->nama,
                    ] : null,
                    'kode' => $barang->kode,
                    'kode_barang' => $barang->kode,
                    'nama_barang' => $barang->nama_barang,
                    'stok_mentah' => $stokMentah,
                    'stok_jadi' => $stokJadi,
                    'stok_jadi_non_varian' => $stokJadiNonVarian,
                    'stok_total' => $stokTotal,
                    'variants' => $variants,
                ];
            })
            ->when($jenisBarang === 'mentah', fn ($items) => $items->filter(fn ($item) => $item['stok_mentah'] > 0))
            ->when($jenisBarang === 'jadi', fn ($items) => $items->filter(fn ($item) => $item['stok_jadi'] > 0))
            ->when($barangVariantId, function ($items) use ($barangVariantId) {
                return $items->filter(function ($item) use ($barangVariantId) {
                    return collect($item['variants'])->contains(
                        fn ($variant) => (string) $variant['id'] === (string) $barangVariantId
                    );
                });
            })
            ->values();

        return response()->json([
            'message' => 'Produk stok berhasil diambil.',
            'data' => $summary,
            'totals' => [
                'total_produk' => $summary->count(),
                'stok_mentah' => round((float) $summary->sum('stok_mentah'), 2),
                'stok_jadi' => round((float) $summary->sum('stok_jadi'), 2),
                'stok_total' => round((float) $summary->sum('stok_total'), 2),
            ],
        ]);
    }

    public function options(): JsonResponse
    {
        $dataBarangs = DataBarang::query()
            ->with(['variants' => fn ($query) => $query->orderBy('nama')])
            ->orderBy('nama_barang')
            ->get(['id', 'kode', 'nama_barang']);

        return response()->json([
            'message' => 'Opsi produk berhasil diambil.',
            'data' => $dataBarangs->map(fn ($barang) => [
                'id' => (string) $barang->id,
                'kode' => $barang->kode,
                'kode_barang' => $barang->kode,
                'nama_barang' => $barang->nama_barang,
                'variants' => $barang->variants->map(fn ($variant) => [
                    'id' => (string) $variant->id,
                    'data_barang_id' => (string) $variant->data_barang_id,
                    'kode' => $variant->kode,
                    'nama' => $variant->nama,
                    'is_active' => (bool) $variant->is_active,
                ])->values(),
            ])->values(),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $dataBarangId = $request->query('data_barang_id');
        $barangVariantId = $request->query('barang_variant_id');
        $jenisBarang = $request->query('jenis_barang');
        $sourceType = $request->query('source_type');
        $tanggalMulai = $request->query('tanggal_mulai');
        $tanggalSelesai = $request->query('tanggal_selesai');

        $movements = StockMovement::query()
            ->with([
                'dataBarang:id,kode,nama_barang',
                'variant:id,data_barang_id,nama,kode',

                'pembelian:id,nomor_nota,nama_supplier,tanggal',
                'pembelianItem:id,pembelian_id,data_barang_id,kode_barang,jenis_barang,qty,harga,total',

                'borongan:id,nomor_nota,nama_pelanggan,tanggal',

                // FIX: jangan panggil kolom lama dari borongan_items
                // Kolom lama yang sudah dihapus:
                // output_data_barang_id, output_jenis_barang, harga, total
                'boronganItem:id,borongan_id,data_barang_id,kode_barang,nama_barang,input_jenis_barang,qty,output_qty',

                'penjualan:id,nomor_nota,nama_pelanggan,tanggal',
                'penjualanItem:id,penjualan_id,data_barang_id,barang_variant_id,kode_barang,nama_barang,nama_varian,qty,harga,total',
                'penjualanItem.variant:id,data_barang_id,nama,kode',
            ])
            ->when($dataBarangId, fn ($query) => $query->where('data_barang_id', $dataBarangId))
            ->when($barangVariantId, fn ($query) => $query->where('barang_variant_id', $barangVariantId))
            ->when($jenisBarang, fn ($query) => $query->where('jenis_barang', $jenisBarang))
            ->when($sourceType, fn ($query) => $query->where('source_type', $sourceType))
            ->when($tanggalMulai, fn ($query) => $query->whereDate('tanggal', '>=', $tanggalMulai))
            ->when($tanggalSelesai, fn ($query) => $query->whereDate('tanggal', '<=', $tanggalSelesai))
            ->orderBy('tanggal')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $saldoMap = [];

        $history = $movements
            ->map(function ($movement) use (&$saldoMap) {
                $variantKey = $movement->barang_variant_id
                    ? (string) $movement->barang_variant_id
                    : 'none';

                $key = (string) $movement->data_barang_id
                    . ':'
                    . (string) $movement->jenis_barang
                    . ':'
                    . $variantKey;

                $masuk = $this->toDecimal($movement->qty_masuk);
                $keluar = $this->toDecimal($movement->qty_keluar);

                $saldoMap[$key] = round((float) ($saldoMap[$key] ?? 0) + $masuk - $keluar, 2);

                $source = $this->resolveSource($movement);

                return [
                    'id' => (string) $movement->id,
                    'tanggal' => optional($movement->tanggal)->format('Y-m-d'),

                    'data_barang_id' => (string) $movement->data_barang_id,
                    'barang_variant_id' => $movement->barang_variant_id
                        ? (string) $movement->barang_variant_id
                        : null,

                    'kode_barang' => $movement->dataBarang?->kode ?? '-',
                    'nama_barang' => $movement->dataBarang?->nama_barang ?? '-',

                    'kode_varian' => $source['kode_varian'] ?: ($movement->variant?->kode ?? null),
                    'nama_varian' => $source['nama_varian'] ?: ($movement->variant?->nama ?? '-'),

                    'jenis_barang' => $movement->jenis_barang,
                    'jenis_barang_label' => $this->jenisBarangLabel($movement->jenis_barang),

                    'source_type' => $movement->source_type,
                    'source_type_label' => $this->sourceTypeLabel($movement->source_type),

                    'source_id' => $movement->source_id,
                    'source_item_id' => $movement->source_item_id,
                    'source_output_id' => $movement->source_output_id,

                    'nomor_nota' => $source['nomor_nota'],
                    'nama_pihak' => $source['nama_pihak'],

                    'qty_masuk' => $masuk,
                    'qty_keluar' => $keluar,
                    'stok_akhir' => $saldoMap[$key],

                    'harga' => $source['harga'],
                    'nominal' => $source['nominal'],

                    'keterangan' => $movement->keterangan,
                    'created_at' => optional($movement->created_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values();

        return response()->json([
            'message' => 'History stok berhasil diambil.',
            'data' => $history,
            'totals' => [
                'qty_masuk' => round((float) $history->sum('qty_masuk'), 2),
                'qty_keluar' => round((float) $history->sum('qty_keluar'), 2),
                'nominal' => round((float) $history->sum('nominal'), 2),
            ],
        ]);
    }

    private function buildStokBarangMap(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn ($row) => (string) $row->data_barang_id)
            ->map(function ($barangRows) {
                $mentah = $barangRows
                    ->where('jenis_barang', 'mentah')
                    ->sum(fn ($row) => (float) $row->stok);

                $jadiNonVarian = $barangRows
                    ->where('jenis_barang', 'jadi')
                    ->filter(fn ($row) => blank($row->barang_variant_id))
                    ->sum(fn ($row) => (float) $row->stok);

                return [
                    'mentah' => round((float) $mentah, 2),
                    'jadi_non_varian' => round((float) $jadiNonVarian, 2),
                ];
            });
    }

    private function buildStokVariantMap(Collection $rows): Collection
    {
        return $rows
            ->where('jenis_barang', 'jadi')
            ->filter(fn ($row) => filled($row->barang_variant_id))
            ->groupBy(fn ($row) => (string) $row->barang_variant_id)
            ->map(fn ($variantRows) => round((float) $variantRows->sum(fn ($row) => (float) $row->stok), 2));
    }

    private function resolveSource(StockMovement $movement): array
    {
        return match ($movement->source_type) {
            'pembelian' => $this->sourcePembelian($movement),
            'borongan_input' => $this->sourceBoronganInput($movement),
            'borongan_output' => $this->sourceBoronganOutput($movement),
            'penjualan' => $this->sourcePenjualan($movement),
            default => [
                'nomor_nota' => '-',
                'nama_pihak' => '-',
                'harga' => 0,
                'nominal' => 0,
                'kode_varian' => null,
                'nama_varian' => '-',
            ],
        };
    }

    private function sourcePembelian(StockMovement $movement): array
    {
        $item = $movement->pembelianItem;
        $pembelian = $movement->pembelian;
        $qty = $this->toDecimal($movement->qty_masuk ?: $movement->qty_keluar);
        $harga = $this->toInteger($item?->harga ?? 0);

        return [
            'nomor_nota' => $pembelian?->nomor_nota ?? '-',
            'nama_pihak' => $pembelian?->nama_supplier ?? '-',
            'harga' => $harga,
            'nominal' => $this->toDecimal($item?->total ?? ($qty * $harga)),
            'kode_varian' => null,
            'nama_varian' => '-',
        ];
    }

    private function sourceBoronganInput(StockMovement $movement): array
    {
        $borongan = $movement->borongan;

        // Borongan input = bahan mentah keluar.
        // Harga sudah tidak disimpan di borongan_items.
        // Jadi nominal input dibuat 0 agar tidak error dan tidak salah hitung.
        return [
            'nomor_nota' => $borongan?->nomor_nota ?? '-',
            'nama_pihak' => $borongan?->nama_pelanggan ?? '-',
            'harga' => 0,
            'nominal' => 0,
            'kode_varian' => null,
            'nama_varian' => '-',
        ];
    }

    private function sourceBoronganOutput(StockMovement $movement): array
    {
        $borongan = $movement->borongan;
        $output = null;

        if ($movement->source_output_id) {
            $output = BoronganItemOutput::query()
                ->with('variant:id,data_barang_id,nama,kode')
                ->find($movement->source_output_id);
        }

        $qtyMasuk = $this->toDecimal($movement->qty_masuk);
        $harga = $this->toInteger($output?->harga ?? 0);
        $nominal = $this->toDecimal($output?->total ?? ($qtyMasuk * $harga));

        return [
            'nomor_nota' => $borongan?->nomor_nota ?? '-',
            'nama_pihak' => $borongan?->nama_pelanggan ?? '-',
            'harga' => $harga,
            'nominal' => $nominal,
            'kode_varian' => $output?->variant?->kode,
            'nama_varian' => $output?->nama_varian ?: ($output?->variant?->nama ?? ($movement->variant?->nama ?? '-')),
        ];
    }

    private function sourcePenjualan(StockMovement $movement): array
    {
        $item = $movement->penjualanItem;
        $penjualan = $movement->penjualan;
        $qty = $this->toDecimal($movement->qty_keluar ?: $movement->qty_masuk);
        $harga = $this->toInteger($item?->harga ?? 0);

        return [
            'nomor_nota' => $penjualan?->nomor_nota ?? '-',
            'nama_pihak' => $penjualan?->nama_pelanggan ?? '-',
            'harga' => $harga,
            'nominal' => $this->toDecimal($item?->total ?? ($qty * $harga)),
            'kode_varian' => $item?->variant?->kode,
            'nama_varian' => $item?->nama_varian ?: ($item?->variant?->nama ?? ($movement->variant?->nama ?? '-')),
        ];
    }

    private function jenisBarangLabel(?string $jenisBarang): string
    {
        return match ($jenisBarang) {
            'mentah' => 'Barang Mentah',
            'jadi' => 'Barang Jadi',
            default => '-',
        };
    }

    private function sourceTypeLabel(?string $sourceType): string
    {
        return match ($sourceType) {
            'pembelian' => 'Pembelian',
            'borongan_input' => 'Borongan - Bahan Mentah',
            'borongan_output' => 'Borongan - Hasil Jadi',
            'penjualan' => 'Penjualan',
            default => '-',
        };
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
