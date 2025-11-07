const API_BASE_URL = 'http://127.0.0.1:8000/api';

const handleStream = async (
    response: Response,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
) => {
    if (!response.body) {
        throw new Error("Response body is null");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const readChunk = async () => {
        if (signal.aborted) {
            reader.cancel('Request aborted by user');
            return;
        }
        try {
            const { done, value } = await reader.read();
            if (done) return;
            onChunk(decoder.decode(value, { stream: true }));
            await readChunk();
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                 console.error("Streaming error:", error);
            }
        }
    };
    
    await readChunk();
}

export const generateStreamResponse = async (
    prompt: string,
    image: string | null, // Keep signature for compatibility
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<void> => {
    let endpoint = '/chat';
    if (prompt.startsWith('Generate insights for')) endpoint = '/insights';
    if (prompt.startsWith('Provide a side-by-side comparison')) endpoint = '/compare';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    await handleStream(response, onChunk, signal);
};

// Maintained for backward compatibility in ChatPanel
export const generateChatResponse = generateStreamResponse;

export const generateGraphData = async (
    prompt: string,
    signal: AbortSignal
): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
    }
    return response.json();
};
