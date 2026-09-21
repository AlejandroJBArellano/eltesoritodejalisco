import { MessageCircle, Send, X } from "lucide-react";

export default function WhatsAppTicketPOS({
  onClickClose,
  whatsappNumber,
  onClickGenerate,
  setWhatsappNumber,
}: {
  onClickClose: () => void;
  whatsappNumber: string;
  setWhatsappNumber: (whatsappNumber: string) => void;
  onClickGenerate: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-xl max-w-sm w-full p-6 shadow-2xl border border-border space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h2 className="text-sm font-bold flex items-center gap-2 text-text-light uppercase tracking-wider">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            Ticket por WhatsApp
          </h2>
          <button
            type="button"
            onClick={() => onClickClose()}
            className="text-text-light/50 hover:text-text-light transition-colors p-1 rounded-md hover:bg-dark/40 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-medium text-text-light/60">
          Ingresa los 10 dígitos del número celular del cliente:
        </p>

        <input
          type="tel"
          maxLength={10}
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
          placeholder="3312345678"
          autoFocus
          className="w-full text-2xl font-bold font-mono p-3 border border-border bg-dark/40 rounded-lg focus:border-emerald-400 outline-none text-center text-text-light tracking-[0.2em] transition-colors placeholder:text-text-light/20 tabular-nums"
        />

        <button
          type="button"
          disabled={whatsappNumber.length !== 10}
          onClick={() => {
            onClickGenerate();
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-xs hover:brightness-110 disabled:opacity-30 active:scale-[0.98] transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="h-4 w-4" /> Enviar Ticket
        </button>
      </div>
    </div>
  );
}
