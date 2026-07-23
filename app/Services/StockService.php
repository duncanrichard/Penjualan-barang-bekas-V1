<?php

namespace App\Services;

use App\Models\Borongan;
use App\Models\DataBarang;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function stok(string $dataBarangId, string $jenisBarang = 'mentah', ?string $barangVariantId = null): float
    {
        $row = StockMovement::query()
            ->where('data_barang_id', $dataBarangId)
            ->where('jenis_barang', $jenisBarang)
            ->when(
                $barangVariantId,
                fn ($query) => $query->where('barang_variant_id', $barangVariantId),
                fn ($query) => $query->whereNull('barang_variant_id')
            )
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->first();

        return round((float) ($row->stok ?? 0), 2);
    }

    public function stokMap(?string $jenisBarang = null): Collection
    {
        return StockMovement::query()
            ->when($jenisBarang, fn ($query) => $query->where('jenis_barang', $jenisBarang))
            ->select('data_barang_id', 'jenis_barang', 'barang_variant_id')
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->groupBy('data_barang_id', 'jenis_barang', 'barang_variant_id')
            ->get()
            ->mapWithKeys(function ($row) {
                $variantKey = $row->barang_variant_id ?: 'none';

                return [
                    $row->data_barang_id . ':' . $row->jenis_barang . ':' . $variantKey => round((float) $row->stok, 2),
                ];
            });
    }

    public function stokPerBarangMap(): Collection
    {
        return StockMovement::query()
            ->select('data_barang_id', 'jenis_barang')
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->groupBy('data_barang_id', 'jenis_barang')
            ->get()
            ->groupBy('data_barang_id')
            ->map(function ($rows) {
                return $rows
                    ->mapWithKeys(fn ($row) => [
                        $row->jenis_barang => round((float) $row->stok, 2),
                    ])
                    ->toArray();
            });
    }

    public function stokPerVariantMap(): Collection
    {
        return StockMovement::query()
            ->where('jenis_barang', 'jadi')
            ->whereNotNull('barang_variant_id')
            ->select('barang_variant_id')
            ->selectRaw('COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0) as stok')
            ->groupBy('barang_variant_id')
            ->get()
            ->mapWithKeys(fn ($row) => [
                (string) $row->barang_variant_id => round((float) $row->stok, 2),
            ]);
    }

    public function assertAvailable(array $items, ?Borongan $currentBorongan = null): void
    {
        $currentQtyMap = collect();

        if ($currentBorongan) {
            $currentBorongan->loadMissing('items');

            $currentQtyMap = $currentBorongan->items
                ->groupBy(fn ($item) => $item->data_barang_id . ':' . ($item->input_jenis_barang ?: 'mentah'))
                ->map(fn ($rows) => round((float) $rows->sum('qty'), 2));
        }

        $neededMap = collect($items)
            ->groupBy(fn ($item) => $item['data_barang_id'] . ':' . ($item['input_jenis_barang'] ?? 'mentah'))
            ->map(fn ($rows) => round((float) collect($rows)->sum('qty'), 2));

        foreach ($neededMap as $key => $qtyNeeded) {
            [$barangId, $jenisBarang] = explode(':', $key);

            $stokAvailable = $this->stok($barangId, $jenisBarang) + (float) ($currentQtyMap[$key] ?? 0);

            if ($qtyNeeded > $stokAvailable) {
                $barang = DataBarang::find($barangId);
                $namaBarang = $barang?->nama_barang ?: $barangId;

                abort(422, "Stok {$namaBarang} ({$jenisBarang}) tidak cukup. Stok tersedia {$stokAvailable} KG, diminta {$qtyNeeded} KG.");
            }
        }
    }

    public function rebuildBorongan(Borongan $borongan): void
    {
        DB::transaction(function () use ($borongan) {
            StockMovement::query()
                ->whereIn('source_type', ['borongan_input', 'borongan_output'])
                ->where('source_id', $borongan->id)
                ->delete();

            $borongan->loadMissing([
                'items.outputs.variant',
            ]);

            foreach ($borongan->items as $item) {
                StockMovement::create([
                    'data_barang_id' => $item->data_barang_id,
                    'barang_variant_id' => null,
                    'jenis_barang' => $item->input_jenis_barang ?: 'mentah',
                    'qty_masuk' => 0,
                    'qty_keluar' => $item->qty,
                    'source_type' => 'borongan_input',
                    'source_id' => $borongan->id,
                    'source_item_id' => $item->id,
                    'source_output_id' => null,
                    'tanggal' => $borongan->tanggal,
                    'keterangan' => $borongan->nomor_nota . ' - bahan mentah',
                ]);

                foreach ($item->outputs as $output) {
                    if ((float) $output->qty <= 0) {
                        continue;
                    }

                    StockMovement::create([
                        'data_barang_id' => $item->data_barang_id,
                        'barang_variant_id' => $output->barang_variant_id,
                        'jenis_barang' => 'jadi',
                        'qty_masuk' => $output->qty,
                        'qty_keluar' => 0,
                        'source_type' => 'borongan_output',
                        'source_id' => $borongan->id,
                        'source_item_id' => $item->id,
                        'source_output_id' => $output->id,
                        'tanggal' => $borongan->tanggal,
                        'keterangan' => $borongan->nomor_nota . ' - hasil jadi varian ' . ($output->nama_varian ?: optional($output->variant)->nama),
                    ]);
                }
            }
        });
    }
}
