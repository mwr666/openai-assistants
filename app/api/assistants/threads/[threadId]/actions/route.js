import { openai } from "@/app/openai";

export const runtime = "nodejs";

export async function POST(request, { params: { threadId } }) {
  console.log("Received POST request for threadId:", threadId);
  try {
    const { toolCallOutputs, runId } = await request.json();

    const stream = await openai.beta.threads.runs.submitToolOutputsStream(
      threadId,
      runId,
      { tool_outputs: toolCallOutputs }
    );

    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error('Error in POST /api/assistants/threads/[threadId]/actions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}