import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {
    question,
    history,
    namespace = PINECONE_NAME_SPACE,
    responseSource = "context+gpt",
    model = "gpt-3.5-turbo", 
    temperature = 0,
    outputTokenLimit,
    dontKnowAnswer,
    endWithResponse,
    customPersona = "You are a helpful AI assistant. Use the following pieces of context to answer the question at the end."
  } = req.body;


  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({}),
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: namespace, //namespace comes from your config folder
      },
    );

    //create chain
    const chain = makeChain(vectorStore, 
      {
        modelName: model,
        temperature: temperature,
        outputTokenLimit: outputTokenLimit
      },
      {
        dontKnowAnswer: dontKnowAnswer,
        endWithResponse: endWithResponse,
        customPersona: customPersona,
        responseSource: responseSource
      },
    );    //Ask a question using chat history
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });

    res.status(200).json(response);
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
