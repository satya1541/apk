import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export function SuccessDialog({ 
  isOpen, 
  onClose, 
  title = "Success", 
  message 
}: SuccessDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="success-dialog">
      {/* Overlay with glassmorphic blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal with glassmorphic design */}
      <div className="relative glass-dialog rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="glass-card p-4 rounded-full mb-4 bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-green-800 dark:text-green-300">{title}</h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 glass-button p-2 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
            data-testid="button-close-success"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-200 text-base text-center">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex justify-center">
          <Button 
            onClick={onClose} 
            variant="solid"
            className="bg-green-600 hover:bg-green-700 font-semibold px-8"
            style={{ color: '#ffffff' }}
            data-testid="button-confirm-success"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}