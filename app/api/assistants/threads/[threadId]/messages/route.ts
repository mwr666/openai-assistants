import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = 'edge';

// Send a new message to a thread
export async function POST(request, { params: { threadId } }) {
  try {
    const { content } = await request.json();

    // Check for active runs
    const runs = await openai.beta.threads.runs.list(threadId);
    const activeRun = runs.data.find(run => run.status === 'in_progress');

    if (activeRun) {
      // Wait for the active run to complete with a timeout
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitTime) {
        const updatedRun = await openai.beta.threads.runs.retrieve(threadId, activeRun.id);
        if (updatedRun.status !== 'in_progress') {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
      }
      // If the run is still active after the timeout, throw an error
      if (Date.now() - startTime >= maxWaitTime) {
        throw new Error('Timeout waiting for active run to complete');
      }
    }

    // Now that we're sure there's no active run, we can add the new message
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content,
    });

    const stream = await openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    return new Response(stream.toReadableStream());
  } catch (error) {
    console.error('Error in POST /api/assistants/threads/[threadId]/messages:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}