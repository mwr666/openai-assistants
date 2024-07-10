import { NextResponse } from "next/server";
import Exa from "exa-js";

export const runtime = 'edge';

type ApiResponse = {
  code: number;
  status: number;
  data: {
    title: string;
    url: string;
    content: string;
    description: string;
  }[];
};

async function searchWeb({ query }: { query: string }): Promise<ReadableStream> {
  console.log(`Searching for: "${query}"`);

  const exaApiKey = process.env.EXA_API_KEY;

  if (!exaApiKey) {
    console.error("EXA_API_KEY is not set in the environment variables");
    throw new Error("EXA_API_KEY is not set in the environment variables");
  }

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        if (!query || query.trim() === '') {
          throw new Error("Search query is empty or invalid");
        }

        const trimmedQuery = query.trim();
        console.log(`Trimmed query: "${trimmedQuery}"`);

        console.log("Sending request to Exa API");
        const exa = new Exa(exaApiKey);
        console.log("Exa instance created");

        const exaResponse = await exa.search(trimmedQuery);
        console.log("Exa API response received");

        if (!exaResponse || !exaResponse.results || exaResponse.results.length === 0) {
          throw new Error("No results found from Exa API");
        }

        const exaContent = exaResponse.results.map(result => 
          `${result.title}\n${result.url}\n${result.text}`
        ).join('\n\n');

        controller.enqueue(encoder.encode(exaContent));
      } catch (error) {
        console.error("Error in searchWeb:", error);
        controller.enqueue(encoder.encode(`Error searching for: ${query}. ${error.message}`));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    console.log("Request body:", requestBody);

    const { search_query } = requestBody;

    if (!search_query || typeof search_query !== 'string') {
      throw new Error("Invalid or missing search_query in request body");
    }

    console.log("Search query:", search_query);

    const searchStream = await searchWeb({ query: search_query });
    return new Response(searchStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error("Error in POST function:", error);
    return NextResponse.json(
      { error: `Failed to perform web search: ${error.message}` },
      { status: 500 }
    );
  }
}