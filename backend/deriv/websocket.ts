import WebSocket from "ws";
import config from "./config";

export class DerivSocket {
    socket: WebSocket;

    constructor() {
        this.socket = new WebSocket(
            `${config.wsUrl}?app_id=${config.appId}`
        );
    }

    connect() {
        this.socket.on("open", () => {
            console.log("✅ Deriv WebSocket conectado");
        });

        this.socket.on("message", (msg) => {
            const data = JSON.parse(msg.toString());
            console.log("Recebido da Deriv:", data.msg_type);
            // Lógica de manipulação de dados será inserida aqui
        });

        this.socket.on("error", (error) => {
            console.error("❌ Erro no WebSocket da Deriv:", error);
        });

        this.socket.on("close", () => {
            console.log("🔌 Conexão WebSocket da Deriv fechada. Tentando reconectar em 5s...");
            setTimeout(() => {
                this.socket = new WebSocket(`${config.wsUrl}?app_id=${config.appId}`);
                this.connect();
            }, 5000);
        });
    }
    
    // Método para enviar requisições
    send(payload: any) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        } else {
            console.log("Aviso: Tentativa de envio com WebSocket fechado.");
        }
    }
}
