<?php

namespace App\Console\Commands;

use App\Models\DocumentReminder;
use App\Models\DocumentReminderLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SendDocumentRemindersCommand extends Command
{
    protected $signature = 'reminders:send-document';

    protected $description = 'Kirim reminder dokumen otomatis ke WhatsApp';

    public function handle(): int
    {
        $today = now()->toDateString();

        $reminders = DocumentReminder::query()
            ->where('status', 'active')
            ->where('send_whatsapp', true)
            ->whereDate('reminder_date', '<=', $today)
            ->where(function ($query) {
                $query->whereNull('last_sent_at')
                    ->orWhereDate('last_sent_at', '<', now()->toDateString());
            })
            ->get();

        foreach ($reminders as $reminder) {
            $message = $reminder->whatsapp_message
                ?: $reminder->default_whatsapp_message;

            $result = $this->sendWhatsappMessage(
                $reminder->owner_phone,
                $message
            );

            DocumentReminderLog::create([
                'document_reminder_id' => $reminder->id,
                'send_to' => $reminder->owner_phone,
                'message' => $message,
                'channel' => 'whatsapp',
                'status' => $result['success'] ? 'success' : 'failed',
                'response' => $result['response'],
                'sent_at' => now(),
            ]);

            if ($result['success']) {
                $nextReminderDate = $this->calculateNextReminderDate($reminder);

                $reminder->update([
                    'last_sent_at' => now(),
                    'reminder_date' => $nextReminderDate,
                    'next_reminder_at' => $nextReminderDate,
                    'status' => $nextReminderDate ? 'active' : 'sent',
                ]);

                $this->info("Reminder {$reminder->document_name} berhasil dikirim.");
            } else {
                $this->error("Reminder {$reminder->document_name} gagal dikirim.");
            }
        }

        return self::SUCCESS;
    }

    private function calculateNextReminderDate(DocumentReminder $reminder): ?string
    {
        return match ($reminder->repeat_type) {
            'daily' => now()->addDay()->toDateString(),
            'weekly' => now()->addWeek()->toDateString(),
            'monthly' => now()->addMonth()->toDateString(),
            'yearly' => now()->addYear()->toDateString(),
            'custom_days' => now()->addDays($reminder->repeat_every_days ?: 1)->toDateString(),
            default => null,
        };
    }

    private function sendWhatsappMessage(string $phone, string $message): array
    {
        try {
            $wahaUrl = rtrim(config('services.waha.url'), '/');
            $session = config('services.waha.session', 'default');

            $response = Http::timeout(20)->post("{$wahaUrl}/api/sendText", [
                'session' => $session,
                'chatId' => $this->normalizeWhatsappNumber($phone),
                'text' => $message,
            ]);

            return [
                'success' => $response->successful(),
                'response' => $response->body(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'response' => $e->getMessage(),
            ];
        }
    }

    private function normalizeWhatsappNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        if (!str_ends_with($phone, '@c.us')) {
            $phone .= '@c.us';
        }

        return $phone;
    }
}
