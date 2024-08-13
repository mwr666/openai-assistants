import { NextResponse } from "next/server";
import Exa from "exa-js";

export const runtime = 'edge';

type CompanyAnalystResponse = {
  name: string;
  description: string;
  founded: string;
  location: string;
  keyPeople: string[];
  socialMedia: {
    [key: string]: string;
  };
  recentNews: string[];
  content: string[];
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

        const exa = new Exa(exaApiKey);
        let searchResponse;

        if (trimmedQuery.startsWith("find similar:")) {
          const similarQuery = trimmedQuery.replace("find similar:", "").trim();
          searchResponse = await exa.search(similarQuery, { use_autoprompt: true });
        } else {
          searchResponse = await exa.search(trimmedQuery);
        }

        if (!searchResponse || !searchResponse.results || searchResponse.results.length === 0) {
          throw new Error("No results found from Exa API");
        }

        const formattedResponse = formatSearchResponse(searchResponse);

        controller.enqueue(encoder.encode(formattedResponse));
      } catch (error) {
        console.error("Error in searchWeb:", error);
        controller.enqueue(encoder.encode(`Error searching for: ${query}. ${error.message}`));
      } finally {
        controller.close();
      }
    },
  });
}

function formatCompanyAnalystResponse(response: any): string {
  let formattedResponse = `
Company: ${response.name}
Description: ${response.description}
Founded: ${response.founded || 'N/A'}
Location: ${response.location || 'N/A'}
Key People: ${response.keyPeople?.join(', ') || 'N/A'}

Social Media:
${Object.entries(response.socialMedia || {}).map(([platform, handle]) => `- ${platform}: ${handle}`).join('\n') || 'N/A'}

Recent News:
${response.recentNews?.map((news, index) => `${index + 1}. ${news.title}\n   ${news.url}`).join('\n\n') || 'N/A'}

Content:
${response.content?.map((content, index) => `${index + 1}. ${content.title}\n   ${content.url}`).join('\n\n') || 'N/A'}
  `;

  return formattedResponse.trim();
}

function formatSearchResponse(response: any): string {
  let formattedResponse = '';

  response.results.forEach((result, index) => {
    formattedResponse += `
Result ${index + 1}:
Title: ${result.title || 'No title'}
URL: ${result.url || 'No URL'}
Snippet: ${result.text || result.snippet || 'No snippet available'}
${result.content ? `Content: ${result.content}` : ''}

`;
  });

  return formattedResponse.trim();
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