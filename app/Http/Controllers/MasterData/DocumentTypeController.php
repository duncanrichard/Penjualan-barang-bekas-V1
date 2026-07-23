<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                Rule::in(['active', 'inactive']),
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $search = trim(
            (string) ($validated['search'] ?? '')
        );

        $status = $validated['status'] ?? null;
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = DocumentType::query()
            ->when(
                $search !== '',
                function ($query) use ($search) {
                    $query->where(
                        function ($query) use ($search) {
                            $query
                                ->where(
                                    'code',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'name',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'description',
                                    'like',
                                    "%{$search}%"
                                );
                        }
                    );
                }
            )
            ->when(
                $status === 'active',
                fn ($query) => $query->where(
                    'is_active',
                    true
                )
            )
            ->when(
                $status === 'inactive',
                fn ($query) => $query->where(
                    'is_active',
                    false
                )
            )
            ->orderBy('sort_order')
            ->orderBy('name');

        $data = $query->paginate($perPage);

        $data->getCollection()->transform(
            fn (DocumentType $item) =>
                $this->formatItem($item)
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Data jenis dokumen berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function options(): JsonResponse
    {
        $data = DocumentType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(
                fn (DocumentType $item) => [
                    'id' => (string) $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'label' => $item->name,
                    'value' => (string) $item->id,
                ]
            )
            ->values();

        return response()->json([
            'success' => true,
            'message' =>
                'Pilihan jenis dokumen berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $item = DocumentType::create([
            'code' => $this->normalizeCode(
                $validated['code']
            ),
            'name' => trim($validated['name']),
            'description' => $this->nullableTrim(
                $validated['description'] ?? null
            ),
            'is_active' => (bool) (
                $validated['is_active'] ?? true
            ),
            'sort_order' => (int) (
                $validated['sort_order'] ?? 0
            ),
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' =>
                'Jenis dokumen berhasil ditambahkan.',
            'data' => $this->formatItem($item),
        ], 201);
    }

    public function show(
        DocumentType $documentType
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' =>
                'Detail jenis dokumen berhasil diambil.',
            'data' => $this->formatItem($documentType),
        ]);
    }

    public function update(
        Request $request,
        DocumentType $documentType
    ): JsonResponse {
        $validated = $this->validatePayload(
            $request,
            $documentType
        );

        $documentType->update([
            'code' => $this->normalizeCode(
                $validated['code']
            ),
            'name' => trim($validated['name']),
            'description' => $this->nullableTrim(
                $validated['description'] ?? null
            ),
            'is_active' => (bool) (
                $validated['is_active'] ?? true
            ),
            'sort_order' => (int) (
                $validated['sort_order'] ?? 0
            ),
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' =>
                'Jenis dokumen berhasil diperbarui.',
            'data' => $this->formatItem(
                $documentType->fresh()
            ),
        ]);
    }

    public function toggle(
        Request $request,
        DocumentType $documentType
    ): JsonResponse {
        $validated = $request->validate([
            'is_active' => [
                'required',
                'boolean',
            ],
        ]);

        $documentType->update([
            'is_active' =>
                (bool) $validated['is_active'],
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $documentType->is_active
                ? 'Jenis dokumen berhasil diaktifkan.'
                : 'Jenis dokumen berhasil dinonaktifkan.',
            'data' => $this->formatItem(
                $documentType->fresh()
            ),
        ]);
    }

    public function destroy(
        DocumentType $documentType
    ): JsonResponse {
        $documentType->delete();

        return response()->json([
            'success' => true,
            'message' =>
                'Jenis dokumen berhasil dihapus.',
        ]);
    }

    private function validatePayload(
        Request $request,
        ?DocumentType $documentType = null
    ): array {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique(
                    'document_types',
                    'code'
                )
                    ->ignore($documentType?->id)
                    ->whereNull('deleted_at'),
            ],

            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique(
                    'document_types',
                    'name'
                )
                    ->ignore($documentType?->id)
                    ->whereNull('deleted_at'),
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],

            'sort_order' => [
                'nullable',
                'integer',
                'min:0',
                'max:9999',
            ],
        ], [
            'code.required' =>
                'Kode jenis dokumen wajib diisi.',

            'code.unique' =>
                'Kode jenis dokumen sudah digunakan.',

            'name.required' =>
                'Nama jenis dokumen wajib diisi.',

            'name.unique' =>
                'Nama jenis dokumen sudah digunakan.',

            'is_active.required' =>
                'Status aktif wajib dipilih.',

            'sort_order.integer' =>
                'Urutan harus berupa angka.',
        ]);
    }

    private function normalizeCode(
        string $value
    ): string {
        return Str::upper(
            Str::slug(
                trim($value),
                '_'
            )
        );
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

    private function formatItem(
        DocumentType $item
    ): array {
        return [
            'id' => (string) $item->id,
            'code' => $item->code,
            'name' => $item->name,
            'description' => $item->description,
            'is_active' => (bool) $item->is_active,
            'sort_order' => (int) $item->sort_order,

            'created_at' => optional(
                $item->created_at
            )->format('Y-m-d H:i:s'),

            'updated_at' => optional(
                $item->updated_at
            )->format('Y-m-d H:i:s'),
        ];
    }
}
