import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px] glass-dialog border-0 shadow-2xl rounded-3xl">
        <div className="text-center pt-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center">
            {variant === "destructive" ? (
              <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            )}
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </DialogTitle>
            <DialogDescription className="text-gray-600 leading-relaxed whitespace-pre-line">
              {message}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex justify-center gap-4 pb-6">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="glass-button px-8 py-3 rounded-xl text-gray-600 dark:text-gray-300 transition-all duration-300"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm}
            className={variant === "destructive" 
              ? "glass-button px-8 py-3 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-700/95 hover:to-red-800/95 border-red-500/30"
              : "glass-button px-8 py-3 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-700/95 hover:to-purple-700/95 border-blue-500/30"
            }
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}