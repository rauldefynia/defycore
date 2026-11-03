<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteEmail;
use App\Services\Microsoft\MicrosoftException;
use App\Services\Microsoft\MicrosoftGraph;
use App\Services\QuotePdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/** Envío de una cotización por correo desde el buzón Microsoft 365 del usuario. */
class QuoteMailController extends Controller
{
    private const MAX_RECIPIENTS = 10;

    public function __construct(private MicrosoftGraph $microsoft, private QuotePdfService $pdfs) {}

    public function send(Request $request, Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isAccessibleBy($request->user()));

        $data = $request->validate([
            'to' => ['required', 'string', 'max:1000'],
            'cc' => ['nullable', 'string', 'max:1000'],
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            // Nunca se ofrece el PDF interno (trae costos y utilidades).
            'attachment' => ['required', 'in:none,client_mxn,client_usd'],
        ], [
            'to.required' => 'Indica al menos un destinatario.',
            'subject.required' => 'El asunto es requerido.',
            'message.required' => 'Escribe un mensaje.',
        ]);

        $to = $this->emails($data['to'], 'to');
        $cc = $this->emails($data['cc'] ?? '', 'cc');

        $attachment = null;

        if ($data['attachment'] !== 'none') {
            $attachment = [
                'name' => $this->pdfs->filename($quote, $data['attachment']),
                'content' => $this->pdfs->make($quote, $data['attachment'])->output(),
            ];
        }

        try {
            $this->microsoft->sendMail(
                $request->user(), $to, $cc, $data['subject'],
                $this->html($data['message']), $attachment
            );
        } catch (MicrosoftException $e) {
            throw ValidationException::withMessages(['mail' => $e->getMessage()]);
        }

        QuoteEmail::create([
            'quote_id' => $quote->id,
            'user_id' => $request->user()->id,
            'to' => $to,
            'cc' => $cc ?: null,
            'subject' => $data['subject'],
            'attachment' => $attachment['name'] ?? null,
            'sent_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Correo enviado a '.implode(', ', $to).'.']);

        return back();
    }

    /**
     * Separa y valida direcciones ("a@x.com, b@y.com" o separadas por ; / saltos de línea).
     *
     * @return array<int, string>
     */
    private function emails(string $raw, string $field): array
    {
        $list = array_values(array_unique(array_filter(array_map(
            fn ($e) => strtolower(trim($e)),
            preg_split('/[,;\s]+/', $raw) ?: []
        ))));

        foreach ($list as $email) {
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw ValidationException::withMessages([$field => "«{$email}» no es un correo válido."]);
            }
        }

        if (count($list) > self::MAX_RECIPIENTS) {
            throw ValidationException::withMessages([$field => 'Máximo '.self::MAX_RECIPIENTS.' destinatarios.']);
        }

        return $list;
    }

    /** El texto del usuario se escapa (nunca se interpreta como HTML) y conserva los saltos de línea. */
    private function html(string $message): string
    {
        return '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">'
            .nl2br(e($message))
            .'</div>';
    }
}
