import { NextResponse } from "next/server";

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

async function searchWeb({ query }: { query: string }): Promise<string> {
  console.log(`Searching for: ${query}`);

  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) {
    console.error("JINA_API_KEY is not set in the environment variables");
    throw new Error("JINA_API_KEY is not set in the environment variables");
  }

  try {
    console.log("Sending request to Jina AI Reader API");
    const encodedQuery = encodeURIComponent(query);
    const url = `https://s.jina.ai/${encodedQuery}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;
    const content = data.data[0].content;

    return content || `No results found for: ${query}`;
  } catch (error) {
    console.error("Error in searchWeb:", error);
    return `Error searching for: ${query}`;
  }
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  console.log("request json", requestBody);

  const { search_query } = requestBody;

  try {
    const searchResult = await searchWeb({ query: search_query });
    return NextResponse.json({ result: searchResult });
  } catch (error) {
    console.error("Error performing web search:", error);
    return NextResponse.json(
      { error: "Failed to perform web search" },
      { status: 500 }
    );
  }
}
