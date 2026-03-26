const sendButton = document.querySelector("#sendButton");
const inputText = document.querySelector("#inputText");
const messageContainer = document.querySelector(".chat__messages");

let userId = localStorage.getItem("chat_user_id");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("chat_user_id", userId);
}

let threadId = localStorage.getItem("chat_thread_id") || null;

const sendMessage = async () => {
  const myMessage = inputText.value.trim();
  if (!myMessage) return;

  messageContainer.innerHTML += `<div class="chat__message chat__message--user">Yo: ${myMessage}</div>`;
  inputText.value = "";

  setTimeout(() => {
    messageContainer.innerHTML += `<div class="chat__message chat__message--bot chat__message--typing">Rebecca: <div class="loader"></div></div>`;
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }, 300);

  try {
    const response = await fetch("/api/chatbot", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        userId,
        threadId,
        message: myMessage
    })
    });

    const rawText = await response.text();
    let data;

    try {
        data = JSON.parse(rawText);
    } catch {
        throw new Error(`Respuesta no JSON del servidor: ${rawText.substring(0, 200)}`);
    }

    const typingMessage = document.querySelector(".chat__message--typing");
    if (typingMessage) typingMessage.remove();

    if (!response.ok) {
      throw new Error(data.error || "Error en el servidor");
    }

    if (data.threadId) {
      threadId = data.threadId;
      localStorage.setItem("chat_thread_id", threadId);
    }

    messageContainer.innerHTML += `<div class="chat__message chat__message--bot">Rebecca: ${data.reply}</div>`;
    messageContainer.scrollTop = messageContainer.scrollHeight;
  } catch (error) {
    const typingMessage = document.querySelector(".chat__message--typing");
    if (typingMessage) typingMessage.remove();

    console.error("Error al obtener respuesta:", error);
    messageContainer.innerHTML += `<div class="chat__message chat__message--bot">Rebecca: Lo siento, ocurrió un error al responder.</div>`;
  }
};

sendButton.addEventListener("click", sendMessage);

inputText.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});