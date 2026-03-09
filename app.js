 // Importar dependencias
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

// Cargar configuracion (api key)
dotenv.config();

//Cargar express
const app = express();
const PORT = process.env.PORT || 3000;

// Servir frontend
app.use("/", express.static("public"));

//Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Instancias de openai y pasar el api key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Ruta

let userThreads = {};

app.post("/api/chatbot", async(req, res) => {

    //Recibir pregunta del usuario
    const { userId, message } = req.body;

    if (!message) return res.status(404).json({ error: "Mensaje es requerido" });
    if (!userId) return res.status(400).json({ error: "userId es requerido" });
    //Petición al modelo de IA
    try {

        if (!userThreads[userId]) {
            const thread = await openai.beta.threads.create();
            console.log("Nuevo thread creado:", thread); // 👈 LOG EXTRA
            if (!thread?.id) {
                throw new Error("No se pudo obtener un thread.id válido");
            }
            userThreads[userId] = thread.id;
        }

        const threadId = userThreads[userId];

        //Añadir mensaje del usuario al hilo
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message
        });

        //Ejecutar peticion al asistente
        const myAssistant = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_G1MBkJKiOFHtNjmfT6BlcpGb"
        });

        if (!myAssistant || !myAssistant.id) {
            console.error("La ejecución del asistente no devolvió un ID:", myAssistant);
            throw new Error("Run ID no válido");
        }

        console.log("Ejecucion creada: ", myAssistant.id, "Estado: ", 
                    myAssistant.status);



        //Esperar a que la ejecucion termine
        let runStatus = myAssistant;
        let attempts = 0;
        const maxAttemps = 30;

        while(runStatus.status !== "completed" && attempts < maxAttemps) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log("Thread ID:", threadId);
            console.log("Run ID:", myAssistant.id);

            runStatus = await openai.beta.threads.runs.retrieve(myAssistant.id, {
                thread_id: threadId,
            });
            
            attempts++;
            
            console.log(`Intento ${attempts} - Status: ${runStatus.status}`);

        }

        if(runStatus.status !== "completed") {
            throw new Error("La ejecución no se completó correctamente", runStatus.status);
        }

        //Sacar los mensajes
        const messages = await openai.beta.threads.messages.list(threadId);

        console.log("Total de mensajes en el hilo: ", messages.data.length);

        //Filtrar mensajes del hilo de conversaciones con la IA

        const assistantMessages = messages.data.filter(msg => msg.role === "assistant");

        console.log("Mensajes del asistente encontrados: ", assistantMessages.length);

        //Sacar las respuestas mas recientes
        const reply = assistantMessages
                    .sort((a, b) => b.created_at - a.created_at)[0]
                    .content[0].text.value;
        
        console.log("Respuesta del asistente: ", reply);

        return res.status(200).json({ reply });
    
    } catch (error) {
        console.error("Error al generar respuesta:", error);
        return res.status(500).json({ error: "Error al generar respuesta" });
    }

});

//Servir backend
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});