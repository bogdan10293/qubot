import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text'; // Add the TextLoader class
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { DocxLoader } from "langchain/document_loaders/fs/docx";

import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { Blob } from 'node-fetch';

/* Name of directory to retrieve your files from 
   Make sure to add your PDF files inside the 'docs' folder
*/
const filePath = 'docs';

function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  return new Blob([new Uint8Array(buffer.buffer)], { type: mimeType });
}

function determineMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
      case 'pdf':
          return 'application/pdf';
      case 'txt':
          return 'text/plain';
      case 'csv':
          return 'text/csv';
      case 'json':
          return 'application/json';
      case 'docx':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      // You can add more cases if needed.
      default:
          throw new Error(`Unsupported file type: ${extension}`);
  }
}

export const ingestDocumentToPinecone = async (fileBuffer: Buffer, fileName: string, namespace: string, fileId: string) => {
  try {
    /*load raw docs from the all files in the directory */

    const mimeType = determineMimeType(fileName); // You might need a function to determine mimeType based on file extension.
    const blob = bufferToBlob(fileBuffer, mimeType);

    const fileExtension = fileName.split('.').pop();


    let documentLoader;

    switch (fileExtension) {
      case 'pdf':
        documentLoader = new PDFLoader(blob);
        break;
      case 'txt':
        documentLoader = new TextLoader(blob);
        break;
      case 'csv':
        documentLoader = new CSVLoader(blob);
        break;
      case 'json':
          documentLoader = new JSONLoader(blob);
          break;
      case 'docx':
        documentLoader = new DocxLoader(blob);
        break;
      // ... handle other cases similarly ...
      default:
        throw new Error('Unsupported file type');
    }

    // const loader = new PDFLoader(filePath);
    const rawDocs = await documentLoader.load();

    rawDocs.forEach(doc => {
      doc.metadata.source = fileName;  // fileName is already available in your current code
      doc.metadata.sourceId = fileId;
    });

    console.log(rawDocs)

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name


    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: namespace,
      textKey: 'text',
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

// (async () => {
//   await run();
//   console.log('ingestion complete');
// })();
