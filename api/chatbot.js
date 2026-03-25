import OpenAI from "openai";

let userThreads = {};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, message } = req.body;

    if (!message) return res.status(400).json({ error: "Mensaje es requerido" });
    if (!userId) return res.status(400).json({ error: "userId es requerido" });

    try {
        if (!userThreads[userId]) {
            const thread = await openai.beta.threads.create();
            if (!thread?.id) {
                throw new Error("No se pudo obtener un thread.id válido");
            }
            userThreads[userId] = thread.id;
        }

        const threadId = userThreads[userId];

        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message
        });

        const myAssistant = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_G1MBkJKiOFHtNjmfT6BlcpGb"
        });

        if (!myAssistant || !myAssistant.id) {
            throw new Error("Run ID no válido");
        }

        let runStatus = myAssistant;
        let attempts = 0;
        const maxAttemps = 30;

        while(runStatus.status !== "completed" && attempts < maxAttemps) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(myAssistant.id, {
                thread_id: threadId,
            });
            attempts++;
        }

        if(runStatus.status !== "completed") {
            throw new Error("La ejecución no se completó correctamente");
        }

        const messages = await openai.beta.threads.messages.list(threadId);
        const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
        const reply = assistantMessages
                    .sort((a, b) => b.created_at - a.created_at)[0]
                    .content[0].text.value;

        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Error al generar respuesta:", error);
        return res.status(500).json({ error: "Error al generar respuesta" });
    }
}