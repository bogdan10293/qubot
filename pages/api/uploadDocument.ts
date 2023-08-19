import { ingestDocumentToPinecone } from '../../scripts/ingest-data-upload';
import { IncomingForm } from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,  // We're handling parsing ourselves with formidable
  },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    const file = files.file[0];
    const namespace = fields.namespace[0];
    const fileId = fields.fileId && fields.fileId[0];


    if (!file || !namespace || !fileId) {
      return res.status(400).json({ error: 'File, fileId or namespace missing' });
    }

    // // Read the file buffer
    // const uploadedFile = files.file[0];
    // const destFilePath = path.join(__dirname, '../../../../docs', uploadedFile.originalFilename!);
    const fileBuffer = await fs.promises.readFile(file.filepath);

    try {
      await ingestDocumentToPinecone(fileBuffer, file.originalFilename!, namespace as string, fileId);
      res.status(200).json({ message: 'Ingestion successful' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ingest document' });
    }

  });
};
