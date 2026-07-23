<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\SettingJamKerja;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingJamKerjaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $settings = SettingJamKerja::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhere('jam_masuk', 'like', "%{$search}%")
                        ->orWhere('jam_pulang', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Setting jam kerja berhasil diambil.',
            'data' => $settings
                ->map(fn ($setting) => $this->formatSetting($setting))
                ->values(),
        ]);
    }

    public function active(): JsonResponse
    {
        $setting = SettingJamKerja::query()
            ->where('status', 'Aktif')
            ->latest()
            ->first();

        return response()->json([
            'message' => 'Setting jam kerja aktif berhasil diambil.',
            'data' => $setting ? $this->formatSetting($setting) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:100'],
            'jam_masuk' => ['required', 'date_format:H:i'],
            'jam_pulang' => ['required', 'date_format:H:i'],
            'status' => ['required', Rule::in(['Aktif', 'Nonaktif'])],
        ]);

        if ($validated['status'] === 'Aktif') {
            SettingJamKerja::query()->update(['status' => 'Nonaktif']);
        }

        $setting = SettingJamKerja::create($validated);

        return response()->json([
            'message' => 'Setting jam kerja berhasil ditambahkan.',
            'data' => $this->formatSetting($setting),
        ], 201);
    }

    public function show(SettingJamKerja $settingJamKerja): JsonResponse
    {
        return response()->json([
            'message' => 'Detail setting jam kerja berhasil diambil.',
            'data' => $this->formatSetting($settingJamKerja),
        ]);
    }

    public function update(Request $request, SettingJamKerja $settingJamKerja): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:100'],
            'jam_masuk' => ['required', 'date_format:H:i'],
            'jam_pulang' => ['required', 'date_format:H:i'],
            'status' => ['required', Rule::in(['Aktif', 'Nonaktif'])],
        ]);

        if ($validated['status'] === 'Aktif') {
            SettingJamKerja::query()
                ->where('id', '!=', $settingJamKerja->id)
                ->update(['status' => 'Nonaktif']);
        }

        $settingJamKerja->update($validated);

        $settingJamKerja = SettingJamKerja::query()
            ->where('id', $settingJamKerja->id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Setting jam kerja berhasil diperbarui.',
            'data' => $this->formatSetting($settingJamKerja),
        ]);
    }

    public function destroy(SettingJamKerja $settingJamKerja): JsonResponse
    {
        $settingJamKerja->delete();

        return response()->json([
            'message' => 'Setting jam kerja berhasil dihapus.',
        ]);
    }

    private function formatSetting(SettingJamKerja $setting): array
    {
        return [
            'id' => $setting->id,
            'nama' => $setting->nama,
            'jam_masuk' => $setting->jam_masuk ? substr($setting->jam_masuk, 0, 5) : null,
            'jam_pulang' => $setting->jam_pulang ? substr($setting->jam_pulang, 0, 5) : null,
            'status' => $setting->status,
            'created_at' => optional($setting->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($setting->updated_at)->format('Y-m-d H:i:s'),
        ];
    }
}
