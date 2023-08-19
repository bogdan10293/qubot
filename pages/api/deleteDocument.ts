// import { pinecone } from '@/utils/pinecone-client'; // This is hypothetical, you might have a different setup for the Pinecone client.
import { NextApiRequest, NextApiResponse } from 'next';
import { initPinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME} from '@/config/pinecone';
import path from 'path';

const pinecone = await initPinecone();
const index = pinecone.Index(PINECONE_INDEX_NAME); // Replace with your actual index name

async function findVectorIdsBySource(fileId: string, namespace: string): Promise<string[]> {

    const defaultVector = new Array(1536).fill(0.1);
    // const fullSourcePath = path.join(__dirname, '../../../../docs', sourceFilename);

    const queryRequest = {
      // We don't need a vector for metadata-only queries
      vector: defaultVector,
      topK: 10000, // Adjust this number as needed
      includeValues: true,
      includeMetadata: true,
      filter: {
        sourceId: { $eq: fileId },
      },
      namespace: namespace,
    };
    const queryResponse = await index.query({ queryRequest: queryRequest });
    console.log(queryResponse)
    // Extracting vector IDs from the response
    const vectorIds = queryResponse?.matches?.map(match => match.id) ?? [];
  
    return vectorIds;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { fileId, namespace } = req.body;
  
    if (!fileId || !namespace) {
      return res.status(400).json({ error: 'FileId or namespace is required' });
    }
  
    try {
      // Assuming you have a function that can find vector IDs based on the source field in metadata
      const vectorIds = await findVectorIdsBySource(fileId, namespace);
  
      if (vectorIds.length > 0) {
        await index.delete1({
          ids: vectorIds,
          namespace: namespace,
        });
        res.status(200).json({ message: 'Vectors deleted successfully' });
      } else {
        res.status(404).json({ error: 'No vectors found for the given source filename' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete vectors' });
    }
  };
