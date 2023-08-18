import { BlobServiceClient } from '@azure/storage-blob';
import * as path from 'path';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? ''
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function createContainerClient(containerClient: any){
  const createContainerResponse = await containerClient.createIfNotExists();
  return createContainerResponse;
}

async function downloadBlobToFile(containerClient: any, blobName: any, fileNameWithPath: any) {
  const blobClient = await containerClient.getBlobClient(blobName);
  await blobClient.downloadToFile(fileNameWithPath);
  console.log(`download of ${blobName} success`);
}


const filePath = 'docs';

export const run = async () => {
  try {
    console.log("Starting blob download")
    const containerClient = blobServiceClient.getContainerClient('gpt4pdf');
    const createContainerResponse = createContainerClient(containerClient);

    let iter = containerClient.listBlobsFlat()
    const blobs = []
    for await (const item of iter) {
      blobs.push(item.name)
    }

    const currentDirectory = path.resolve()

    blobs.forEach(blob => {
        const downloadDirectory = path.join(currentDirectory, 'docs', blob)

        downloadBlobToFile(containerClient, blob, downloadDirectory)
    });

  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to download blob data');
  }
};

(async () => {
  await run();
  console.log('data download complete');
})();
