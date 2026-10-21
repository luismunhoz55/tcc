# Embarque Acessível

MVP em Expo/React Native para apoiar pessoas com deficiência visual no embarque do transporte coletivo. Há dois perfis: passageiro solicita atendimento em um ponto e motorista compartilha sua posição, confirma o pedido e acompanha os passageiros atendidos.

As linhas, sentidos e pontos presentes nesta versão são dados fictícios para demonstração. O aplicativo não fornece horários, trajetos oficiais nem integração com empresas de transporte.

## Executar

```bash
npm install
npm start
```

Use `npm run android` para abrir no Android. A primeira validação foi preparada para Android e TalkBack, mantendo estrutura compatível com iOS.

Sem configuração externa, o aplicativo inicia em **modo demonstração local**. Ele permite explorar os dois perfis e o simulador no mesmo aplicativo; para sincronizar dois celulares, configure o Firebase.

## Configurar Firebase gratuito

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/) no plano Spark.
2. Em **Authentication**, habilite o provedor **E-mail/senha**.
3. Crie uma **Realtime Database**. Para a demonstração, escolha uma região próxima e publique o conteúdo de `database.rules.json` nas regras da base.
4. Registre um aplicativo Web no projeto e copie a configuração pública para um arquivo `.env`, criado a partir de `.env.example`.
5. Crie a conta de motorista em Authentication. Depois de obter o UID, crie manualmente `profiles/<UID>` no Realtime Database com este formato:

```json
{
  "uid": "UID_DA_CONTA",
  "displayName": "Motorista de demonstração",
  "email": "motorista@exemplo.com",
  "role": "driver",
  "createdAt": 0
}
```

O cadastro público do aplicativo cria apenas perfis `passenger`; a regra da base impede que alguém altere seu próprio perfil para motorista. A configuração usa somente chaves públicas do Firebase. Nunca adicione uma chave administrativa ao `.env` ou ao aplicativo.

## Roteiro de demonstração em dois Androids

1. No primeiro celular, crie ou acesse uma conta de passageiro e envie um pedido escolhendo linha, sentido e ponto.
2. No segundo, acesse a conta de motorista pré-criada, inicie a mesma linha e sentido e toque em **Iniciar simulador de rota** ou **Compartilhar localização por GPS**.
3. Confirme o pedido do passageiro. O primeiro motorista a confirmar fica vinculado ao pedido.
4. No celular do passageiro, acompanhe a situação. Os alertas ocorrem uma única vez ao entrar nas faixas de 500 m e 100 m, desde que a posição tenha no máximo 30 segundos e precisão de até 50 m.
5. Confirme **Já embarquei**. Para testar desconexão, pause o compartilhamento ou minimize o aplicativo do motorista: o compartilhamento em primeiro plano é interrompido e precisa ser retomado ao voltar.

Mantenha os dois aplicativos abertos durante a demonstração. Esta versão não solicita localização em segundo plano nem usa notificações com a tela bloqueada.

## Acessibilidade

- Navegação principal por listas, botões com pelo menos 52 px de altura e textos em português claro.
- Rótulos, estados e dicas para TalkBack; mudanças relevantes usam anúncios de acessibilidade.
- Sem leitor de tela, os avisos usam fala em português e vibração. O passageiro pode desligar a voz automática e repetir o estado atual.
- A seleção do ponto sempre requer confirmação, mesmo quando o GPS ordena os pontos por proximidade.

## Verificação

```bash
npm run lint
npm run typecheck
npx expo-doctor
```

`expo-doctor` pode exigir acesso à internet para baixar seu pacote quando ele ainda não estiver disponível localmente.

## Limpeza da demonstração

No Firebase Console, remova os registros de `requests`, `openRequests`, `passengerActiveRequests`, `driverRequests` e `trips` após cada demonstração. Mantenha somente `profiles` das contas necessárias. O MVP não grava histórico de trajetos.
