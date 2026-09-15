# Assistente Virtual — Phoenix Estética Automotiva

## Atualização: perguntas do dia a dia (saudação certa, dia/hora, horário de hoje)

- **Saudação sempre certa pro horário real**: não importa se o cliente
  digitou "boa noite" de tarde ou só "oi" — o bot responde com "Bom
  dia!"/"Boa tarde!"/"Boa noite!" de acordo com o relógio do navegador
  dele na hora.
- **"Tudo bem?" / "como vai?"**: responde de forma simpática e já
  encaminha pra serviços/preços/horário/agendamento.
- **"Que dia é hoje?" / "que horas são?"**: responde com o dia da semana,
  a data e a hora atual (do navegador do cliente).
- **"Vocês têm horário hoje?" / "abrem hoje?" / "aberto agora?"**: essa é
  a mais esperta — o bot calcula o dia da semana de hoje e diz
  exatamente qual é a janela de entrada de hoje (ex.: "hoje é
  quinta-feira, atendimento das 13h às 16h"), se já está dentro desse
  horário agora, se ainda não abriu, se já fechou por hoje, ou se hoje é
  domingo (fechado). Tudo isso sem precisar de calendário nem backend —
  só com o relógio do próprio navegador do visitante.

## Atualização: motor local mais esperto

O `assistente-phoenix.js` continua funcionando 100% sem IA externa (sem
custo de API), mas ficou bem mais flexível pra entender pergunta livre:

- **Entende gírias/abreviações comuns**: "vc", "qto", "vlr", "blz", "zap",
  "hig" (higienização), etc.
- **Tolera erro de digitação**: "higienizaçao", "vitrificaçao", "horrario"
  continuam sendo entendidos.
- **Novas perguntas que agora tem resposta própria**: comparação entre
  serviços ("qual a diferença entre bronze e prata", "tradicional ou
  comercial"), pedido de recomendação ("qual vocês indicam?"), perguntas
  fora do que a Phoenix faz (funilaria, mecânica — o bot explica
  educadamente que não é o forte da casa), "quero falar com atendente"
  (manda direto pro WhatsApp), "você é humano/robô?", "é minha primeira
  vez, como funciona?".
- **Admite quando não sabe, em vez de inventar**: perguntas sobre
  estacionamento, se dá pra esperar no local, se buscam o carro em casa,
  cancelamento/remarcação e forma exata de pagamento (Pix/cartão/dinheiro)
  não estão nos dados da empresa — o assistente diz isso claramente e
  manda pro WhatsApp, em vez de chutar uma resposta.
- **Busca ampla como último recurso**: antes de desistir com "não
  entendi", ele tenta achar o assunto mais parecido entre horário,
  endereço, contato, pagamento, tolerância de atraso e Instagram — pega
  bastante pergunta escrita de um jeito que as regras não previram.

Continua sendo 100% baseado em regras/palavras-chave (não é uma IA de
verdade) — não vai "conversar" fora do roteiro como o Claude faria, mas
cobre uma faixa bem maior de perguntas reais de cliente do que antes.
Se um dia quiserem ir além disso, o `api/chat.js` (Claude) continua
pronto, é só publicar — ver seção mais abaixo.

## O que foi entregue

- **`assistente-phoenix.js`** — o chatbot em si. Um widget flutuante que já
  vai aparecer no canto inferior direito do site.
- **`index.html`** e **`agendar.html`** — já atualizados com a linha que
  carrega o assistente (veja o final do `<body>` de cada um).
- **`api/chat.js`** — backend opcional para ligar o assistente a uma IA de
  verdade (Claude). É opcional porque o chatbot já funciona sozinho, sem
  ele (veja abaixo).

## Como ele funciona (sem precisar de nada além dos arquivos)

O assistente já sabe responder, sozinho, sobre:
- Todos os serviços e preços (lavagens, higienização, combos, proteção de plástico)
- Duração estimada de cada serviço
- Horário de funcionamento, endereço, telefone/WhatsApp, Instagram
- Como agendar, tolerância de atraso, forma de pagamento

Isso é feito com uma base de conhecimento local (dentro do próprio
arquivo `assistente-phoenix.js`) — **não precisa de internet, de chave de
API nem de custo mensal**. É rápido e nunca fica fora do ar.

**A conversa é lembrada:** cada visitante tem o histórico salvo no
próprio navegador dele (localStorage). Se ele fechar o site e voltar
depois, a conversa continua de onde parou. Isso é por navegador/aparelho,
não é uma memória compartilhada entre atendentes.

## Como publicar

1. Suba os arquivos `index.html`, `agendar.html` e `assistente-phoenix.js`
   juntos, na mesma pasta do site (mesmo lugar onde já está a
   `logo-phoenix.png`).
2. Pronto — o balão de chat já aparece em todas as páginas onde o script
   foi incluído.

Se quiserem o assistente também na página de política de privacidade,
basta adicionar a mesma linha antes de `</body>` nela também:
```html
<script src="assistente-phoenix.js" defer></script>
```

## Quiser IA "de verdade" (Claude) em vez da base local? (opcional)

A base local já cobre a grande maioria das perguntas reais de cliente.
Mas se quiserem que o assistente converse de forma mais livre (parafrasear,
responder perguntas fora do roteiro, etc.), dá pra ligar numa IA real:

1. Crie uma conta em **console.anthropic.com** e gere uma chave de API.
2. Hospedem o arquivo `api/chat.js` como uma função serverless — o jeito
   mais simples é criar um projeto na **Vercel** (gratuito para esse
   volume), colocando `api/chat.js` na raiz do projeto.
3. Na Vercel, em Settings → Environment Variables, criem
   `ANTHROPIC_API_KEY` com a chave gerada no passo 1.
4. No `assistente-phoenix.js`, troquem a linha:
   ```js
   aiEndpoint: null,
   ```
   por:
   ```js
   aiEndpoint: 'https://SEU-PROJETO.vercel.app/api/chat',
   ```
5. Publiquem de novo.

**Importante:** a chave de API nunca deve ir para dentro de
`assistente-phoenix.js` nem de nenhum arquivo que o navegador do
visitante baixa — por isso ela mora só no backend (`api/chat.js`), como
variável de ambiente. Se algum dia isso mudar, o assistente continua
funcionando sozinho pela base local — ele nunca fica sem resposta.

## Como editar os preços/serviços depois

Tudo fica no topo do arquivo `assistente-phoenix.js`, no array
`SERVICOS` e no objeto `INFO`. Basta editar nome, preço ou duração ali —
não precisa mexer no resto do código. Se usarem o backend com IA, o
mesmo texto também precisa ser atualizado em `api/chat.js`, dentro de
`SYSTEM_PROMPT`.

## Pontos de atenção que encontrei nos arquivos originais

Duas coisas que vale a Phoenix conferir e corrigir, porque afetam
diretamente o que o assistente (e o site) informam ao cliente:

1. **Horário de funcionamento divergente.** O rodapé do `index.html` e os
   dados estruturados (Schema.org) dizem "segunda a sexta, das 14h às
   18h", mas o sistema de agendamento (`agendar.html`) só libera
   horários de **13h às 16h** de segunda a sexta. Configurei o
   assistente para seguir o horário real do agendamento (13h–16h), que é
   o que efetivamente funciona hoje — mas o ideal é vocês decidirem qual
   é o horário certo e deixarem os dois arquivos e o assistente
   coerentes.

2. **Número de WhatsApp de placeholder no agendamento.** Em
   `agendar.html`, a constante `CONFIG.whatsappEstetica` está como
   `'5500000000000'` — um número de exemplo, não o real. Isso faz com que
   o botão "Avisar pelo WhatsApp" no fim do agendamento não chegue a
   ninguém. O restante do site usa `555596824077`; usei esse mesmo
   número no assistente, mas recomendo corrigir também esse ponto do
   `agendar.html` para não perder agendamentos.
