import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadCoverImage(
  fileBuffer: Buffer,
  tripId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "voyager/covers",
        public_id: `trip-${tripId}`,
        overwrite: true,
        transformation: [
          { width: 900, height: 500, crop: "fill", gravity: "auto" },
          { format: "webp", quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteCoverImage(tripId: string): Promise<void> {
  await cloudinary.uploader.destroy(`voyager/covers/trip-${tripId}`);
}
