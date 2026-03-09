const sendButton = document.querySelector("#sendButton");
const inputText = document.querySelector("#inputText");
const messageContainer = document.querySelector(".chat__messages");
const userId = Date.now() + Math.floor(777 + Math.random() * 7000);

const sendMessage = async() => {

        //Sacar el valor del input (pregunta)
        const myMessage = inputText.value.trim();

        if(!myMessage) return false;

        //Meter mensaje del usuario en la caja de mensajes

        messageContainer.innerHTML += `<div class="chat__message chat__message--user">Yo: ${myMessage}</div>`;

        //Vaciar input del usuario
        inputText.value = "";

        setTimeout(() => {

            //Añadir mensaje de escribiendo
            messageContainer.innerHTML += `<div class="chat__message chat__message--bot chat__message--typing">Rebecca: <div class="loader"></div></div>`;

            //Mover el scroll hacia abajo
            messageContainer.scrollTop = messageContainer.scrollHeight;

        }, 300);

        //Peticion al backend para obtener respuesta de IA
        try{

            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({userId,message: myMessage })
            });
            //Insertar mensaje de la IA en el chat

            const data = await response.json();

            //Borrar el mensaje de escribiendo
            document.querySelector(".chat__message--typing").remove();


            //Insertar mensaje de la IA en el chat
            messageContainer.innerHTML += `<div class="chat__message chat__message--bot">Rebecca: ${data.reply}</div>`;

        } catch (error) {
            console.error("Error al obtener respuesta:", error);
        }

}

sendButton.addEventListener("click", sendMessage);
inputText.addEventListener("keypress", (e) => {
    if(e.key === "Enter"){
        e.preventDefault();
        sendMessage();
    }
})