import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankItem } from '@/types/rank-calculator';

interface DeleteRankConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (rankId: string) => void;
  rank?: RankItem | null;
}

export function DeleteRankConfirmModal({
  isOpen,
  onClose,
  onConfirmDelete,
  rank,
}: DeleteRankConfirmModalProps) {
  if (!isOpen || !rank) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-sm">Delete Rank</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              Are you sure you want to delete <strong>"{rank.name}"</strong>? All subsequent cumulative sums will automatically recalculate.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onConfirmDelete(rank.id);
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Delete Rank
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
