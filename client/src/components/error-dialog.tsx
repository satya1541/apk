import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
}

export function ErrorDialog({ 
  isOpen, 
  onClose, 
  title = "Error", 
  message, 
  details 
}: ErrorDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="error-dialog">
      {/* Overlay with glassmorphic blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal with glassmorphic design */}
      <div className="relative glass-dialog rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="glass-card p-4 rounded-full mb-4 bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-red-800 dark:text-red-300">{title}</h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 glass-button p-2 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
            data-testid="button-close-error"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-200 text-base mb-3 text-center">
            {message}
          </p>
          {details && (
            <div className="glass-card p-4 rounded-xl border border-red-200/30 dark:border-red-800/30">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono break-all">{details}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-center">
          <Button 
            onClick={onClose} 
            className="glass-button bg-red-600/80 hover:bg-red-700/90 text-white border-red-500/30 px-8"
            data-testid="button-confirm-error"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}