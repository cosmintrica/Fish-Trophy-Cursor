import { useState } from 'react';
import { X, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'record' | 'catch';
  itemId: string;
  itemUrl: string;
  reporterId?: string;
}

export const ReportModal = ({ isOpen, onClose, reportType, itemId, itemUrl, reporterId }: ReportModalProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minLength = 10;
  const maxLength = 500;
  const remainingChars = maxLength - message.length;
  const isValid = message.length >= minLength && message.length <= maxLength;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          report_type: reportType,
          item_id: itemId,
          item_url: itemUrl,
          message: message.trim(),
          reporter_id: reporterId || null,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Raportare trimisă cu succes! Vom analiza în curând.');
      setMessage('');
      onClose();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error('Eroare la trimiterea raportării. Te rugăm să încerci din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Raportează</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Te rugăm să descrii problema sau motivul raportării. Mesajul tău va fi analizat de echipa noastră.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Mesaj <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descrie problema sau motivul raportării (minim 10 caractere)..."
              className="min-h-[120px] text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
              maxLength={maxLength}
            />
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${message.length < minLength ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`}>
                {message.length < minLength
                  ? `Mai sunt necesare ${minLength - message.length} caractere`
                  : `${remainingChars} caractere rămase`}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {message.length} / {maxLength}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Anulează
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Se trimite...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Trimite
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

