import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Image as ImageIcon,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type Note } from "@/lib/api";

export function NoteDetailSheet({ 
  note, 
  open, 
  onClose,
  onEdit,
  onDelete
}: { 
  note: Note; 
  open: boolean; 
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90dvh] sm:max-w-md mx-auto rounded-t-[32px] bg-white overflow-hidden p-0 border-none flex flex-col [&>button]:hidden"
      >
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100) onClose();
          }}
          className="w-full flex justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-200" />
        </motion.div>

        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <SheetHeader className="mb-6">
            <div className="flex items-center mb-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-700">
                記事
              </span>
            </div>
            <SheetTitle className="text-3xl font-black text-[oklch(0.22_0.08_220)] text-left leading-tight">
              {note.title}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-8">
            {note.sourceUrl && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">來源網站</div>
                <a 
                  href={note.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 bg-teal-50 hover:bg-teal-100 rounded-2xl text-teal-700 transition-colors border border-teal-100"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-bold truncate flex-1">{note.sourceUrl}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {note.content && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">描述</div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-[oklch(0.35_0.06_220)] whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </div>
              </div>
            )}

            {note.images && note.images.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">照片</div>
                <div className="grid grid-cols-2 gap-3">
                  {note.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm">
                      <img src={img} alt={`${note.title} - ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 flex gap-4">
          <Button 
            onClick={onEdit}
            className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
          >
            <Edit3 className="w-5 h-5" />
            編輯
          </Button>
          <Button 
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Trash2 className="w-5 h-5" />
            刪除
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NoteCard({ 
  note, 
  onEdit, 
  onDelete 
}: { 
  note: Note; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div 
        onClick={() => setShowDetail(true)}
        className="group bg-white rounded-2xl p-5 shadow-sm border border-[oklch(0.92_0.01_220)] hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer relative"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-teal-700" />
            </div>
            <h3 className="text-lg font-bold text-[oklch(0.22_0.08_220)] truncate pr-8">{note.title}</h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2">
                <Edit3 className="w-4 h-4" /> 編輯
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 gap-2">
                <Trash2 className="w-4 h-4" /> 刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {note.content && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {note.content}
          </p>
        )}

        <div className="flex items-center gap-4 mt-1">
          {note.sourceUrl && (
            <div className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>有連結</span>
            </div>
          )}
          {note.images && note.images.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{note.images.length} 張照片</span>
            </div>
          )}
        </div>
      </div>

      <NoteDetailSheet 
        note={note} 
        open={showDetail} 
        onClose={() => setShowDetail(false)}
        onEdit={() => { setShowDetail(false); onEdit(); }}
        onDelete={() => { setShowDetail(false); onDelete(); }}
      />
    </>
  );
}
