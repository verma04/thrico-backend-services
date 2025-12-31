export default async function uploadImageToFolder(folder: string, files: any[]): Promise<any[]> {
  console.log(`[UPLOAD] Mock uploading ${files.length} images to ${folder}`);
  return files.map((file, index) => ({
    url: `https://mock-storage.com/${folder}/image-${index}.jpg`,
    id: `img-${Date.now()}-${index}`,
  }));
}
