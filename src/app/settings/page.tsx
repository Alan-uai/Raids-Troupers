import { EmbedPreview } from "@/components/embed-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
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
