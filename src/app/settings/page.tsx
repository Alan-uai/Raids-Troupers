// src/app/settings/page.tsx
'use client';

import { useState } from "react";
import { EmbedPreview } from "@/components/embed-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendRaidAnnouncement } from "@/services/discord-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export default function SettingsPage() {
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    async function handleTestSend() {
        setIsSending(true);
        const result = await sendRaidAnnouncement({
            level: 'Teste',
            difficulty: 'Normal',
            userNickname: 'Test Bot',
            userAvatar: 'https://placehold.co/100x100.png',
            robloxProfileUrl: 'https://www.roblox.com',
        });
        setIsSending(false);

        if (result.success) {
            toast({
                title: "Sucesso!",
                description: "Anúncio de teste enviado para o Discord.",
            });
        } else {
            toast({
                title: "Erro",
                description: result.error || "Falha ao enviar anúncio de teste.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configurações do Bot</CardTitle>
                    <CardDescription>
                        Use esta página para configurar os comandos e aparências das mensagens do seu bot.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                     <Card>
                        <CardHeader>
                            <CardTitle>Personalizar Embed</CardTitle>
                             <CardDescription>
                                Veja abaixo uma prévia de como o anúncio de raide aparecerá no Discord.
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <EmbedPreview
                             level="200"
                             difficulty="Difícil"
                             userNickname="Raid Master"
                             userAvatar="https://placehold.co/100x100.png"
                             robloxProfileUrl="https://www.roblox.com"
                           />
                           <Button variant="outline" size="sm" onClick={handleTestSend} disabled={isSending} className="mt-4">
                               {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>} 
                               Enviar Mensagem de Teste
                           </Button>
                        </CardContent>
                    </Card>
                </div>
                 <div>
                     <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Gerenciar Comandos</CardTitle>
                             <CardDescription>
                                (Em breve) Adicione, edite ou remova comandos slash.
                             </CardDescription>
                        </CardHeader>
                     </Card>
                </div>
            </div>

        </div>
    )
}
