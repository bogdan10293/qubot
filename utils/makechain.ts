import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';

const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

{context}

Question: {question}
Helpful answer in markdown:`;

export const makeChain = (
  vectorstore: PineconeStore,
  modelOptions: {
    modelName: string;
    temperature: number;
    outputTokenLimit?: number;
  },
  chainOptions: {
    dontKnowAnswer?: string;
    endWithResponse?: string;
    customPersona?: string;
    responseSource?: string;

  },
) => {
  const model = new OpenAI({
    temperature: modelOptions.temperature,
    modelName: modelOptions.modelName,
    maxTokens: modelOptions.outputTokenLimit,
  });


 
  let responseMessage;

  if (chainOptions.responseSource === "context") {
    responseMessage = "If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.";
  } else if (chainOptions.responseSource === "context+gpt") {
    responseMessage = "You can use both the context and general knowledge to answer the question.";
  }

  const qaTemplate = `${chainOptions.customPersona}
  If you don't know the answer, use the following response: ${chainOptions.dontKnowAnswer}.
  End all your responses with the following sentance: ${chainOptions.endWithResponse}.
  ${responseMessage}

  {context}

  Question: {question}
  Helpful answer in markdown:`

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: qaTemplate,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    }
  );
  return chain;
};
