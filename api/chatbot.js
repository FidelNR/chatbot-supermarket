import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { threadId, message } = body;

    console.log("BODY RECIBIDO:", body);
    console.log("threadId recibido:", threadId);
    console.log("message recibido:", message);

    if (!message) {
      return res.status(400).json({ error: "Mensaje es requerido" });
    }

    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      console.log("THREAD CREADO:", thread);

      if (!thread?.id) {
        throw new Error("No se pudo obtener un thread.id válido");
      }

      currentThreadId = thread.id;
    }

    console.log("currentThreadId final:", currentThreadId);

    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    console.log("RUN CREADO:", run);

    if (!run?.id) {
      throw new Error("Run ID no válido");
    }

    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 30;

    /*while (runStatus.status !== "completed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!currentThreadId) {
        throw new Error("currentThreadId es undefined antes de consultar el run");
      }

      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      attempts++;*/

        while(runStatus.status !== "completed" && attempts < maxAttempts) {
         await new Promise(resolve => setTimeout(resolve, 1000));
      if (!currentThreadId) {
        throw new Error("currentThreadId es undefined antes de consultar el run");
      }

         runStatus = await openai.beta.threads.runs.retrieve(run.id, {
             thread_id: currentThreadId,
         });
         attempts++;
     

      console.log(`Intento ${attempts}:`, runStatus.status);
    }

    if (runStatus.status !== "completed") {
      throw new Error(`La ejecución no se completó. Estado: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");

    const latest = assistantMessages.sort((a, b) => b.created_at - a.created_at)[0];
    const reply = latest?.content?.[0]?.text?.value || "No se obtuvo respuesta.";

    return res.status(200).json({
      reply,
      threadId: currentThreadId
    });
  } catch (error) {
    console.error("Error al generar respuesta:", error);
    return res.status(500).json({
      error: error.message || "Error al generar respuesta"
    });
  }
}