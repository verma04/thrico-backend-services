import uploadImageToFolder from "./uploadImageToFolder.utils";

export default async function uploadFeedImage(
  entity: string,
  files: any[]
): Promise<any[]> {
  // Reusing existing upload logic, potentially adding specific logic for feed/listing images if needed
  // The original code called uploadFeedImage(entity, input.media)
  // uploadImageToFolder takes (folder, files)

  // We can use entity ID as folder or a specific 'feed' folder
  return uploadImageToFolder(`feed/${entity}`, files);
}
