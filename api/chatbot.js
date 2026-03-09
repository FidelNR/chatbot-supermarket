import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const userThreads = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { userId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje es requerido" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId es requerido" });
    }

    if (!userThreads.has(userId)) {
      const thread = await openai.beta.threads.create();

      if (!thread?.id) {
        throw new Error("No se pudo crear el thread");
      }

      userThreads.set(userId, thread.id);
    }

    const threadId = userThreads.get(userId);

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: "asst_G1MBkJKiOFHtNjmfT6BlcpGb",
    });

    if (!run?.id) {
      throw new Error("No se pudo crear la ejecución");
    }

    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 30;

    while (
      runStatus.status !== "completed" &&
      runStatus.status !== "failed" &&
      runStatus.status !== "cancelled" &&
      runStatus.status !== "expired" &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }

    if (runStatus.status !== "completed") {
      throw new Error(`La ejecución terminó con estado: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(threadId);

    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant"
    );

    const latestMessage = assistantMessages.sort(
      (a, b) => b.created_at - a.created_at
    )[0];

    const reply =
      latestMessage?.content?.[0]?.text?.value ||
      "No se pudo obtener respuesta del asistente.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Error al generar respuesta:", error);
    return res.status(500).json({
      error: error.message || "Error al generar respuesta",
    });
  }
}