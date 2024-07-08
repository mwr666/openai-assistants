import { NextResponse } from 'next/server';

async function searchWeb(query: string): Promise<string> {
  console.log(`Searching for: ${query}`);
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) {
    console.error('JINA_API_KEY is not set in the environment variables');
    throw new Error('JINA_API_KEY is not set in the environment variables');
  }

  try {
    console.log('Sending request to Jina AI API');
    const response = await fetch('https://api.jina.ai/v1/reader', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: [{ text: query }],
        execEndpoint: '/search',
      }),
    });

    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Received JSON data:', JSON.stringify(data, null, 2));
      if (data.data && data.data.length > 0 && data.data[0].text) {
        return data.data[0].text;
      }
    }
    
    console.log('No results found or unexpected response structure');
    return `No results found for: ${query}`;
  } catch (error) {
    console.error('Error in searchWeb:', error);
    return `Error searching for: ${query}`;
  }
}

export async function POST(request: Request) {
  const { search_query } = await request.json();
  
  try {
    const searchResult = await searchWeb(search_query);
    return NextResponse.json({ result: searchResult });
  } catch (error) {
    console.error('Error performing web search:', error);
    return NextResponse.json({ error: 'Failed to perform web search' }, { status: 500 });
  }
}