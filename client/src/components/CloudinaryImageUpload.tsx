// CloudinaryImageUpload.tsx
// Design: Clean image upload component with preview grid, max 5 images
// Uses Cloudinary unsigned upload preset

import { useRef, useState } from "react";
import { X, Plus, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CLOUDINARY_CLOUD_NAME = "dgegtvwrz";
const CLOUDINARY_UPLOAD_PRESET = "travel_planner_uploads";
const MAX_IMAGES = 5;

interface CloudinaryImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

export function CloudinaryImageUpload({ images, onChange, disabled }: CloudinaryImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`最多只能上傳 ${MAX_IMAGES} 張圖片`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);

    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) {
          throw new Error("上傳失敗");
        }

        const data = await res.json();
        uploaded.push(data.secure_url);
      }

      onChange([...images, ...uploaded]);
      if (files.length > remaining) {
        toast.warning(`已上傳 ${remaining} 張，超過上限的圖片已略過`);
      }
    } catch {
      toast.error("圖片上傳失敗，請稍後再試");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div
            key={url}
            className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group"
          >
            <img
              src={url}
              alt={`圖片 ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {canAddMore && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">新增圖片</span>
              </>
            )}
          </button>
        )}

        {images.length === 0 && !canAddMore && (
          <div className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length}/{MAX_IMAGES} 張圖片
        {images.length < MAX_IMAGES && "，支援 JPG、PNG、WebP"}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
