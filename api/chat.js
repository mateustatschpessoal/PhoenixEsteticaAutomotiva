/**
 * BACKEND OPCIONAL — liga o assistente da Phoenix a uma IA de verdade
 * (Claude, da Anthropic) em vez de usar só a base de respostas local.
 *
 * Por que isso é um arquivo separado?
 * Porque uma chave de API NUNCA pode ficar no código do site (frontend) —
 * qualquer visitante conseguiria abrir o "Ver código-fonte" e roubar a
 * chave. Por isso a chamada à IA precisa passar por um servidor, que
 * guarda a chave em segredo (variável de ambiente).
 *
 * COMO USAR (exemplo com Vercel, gratuito para esse volume de uso):
 *  1. Crie uma conta em vercel.com e um projeto novo com estes arquivos.
 *  2. Coloque este arquivo em: /api/chat.js (raiz do projeto)
 *  3. Nas configurações do projeto na Vercel, crie a variável de
 *     ambiente ANTHROPIC_API_KEY com a chave gerada em
 *     https://console.anthropic.com/
 *  4. No assistente-phoenix.js, defina:
 *       CONFIG.aiEndpoint = '/api/chat'
 *  5. Publique (deploy). Pronto — o assistente passa a responder com IA
 *     de verdade, e continua caindo automaticamente na base local se o
 *     backend cair ou a chave acabar (nunca fica fora do ar).
 *
 * Se vocês usarem outro provedor (Netlify Functions, servidor próprio
 * em Node/Express, etc.) a lógica de dentro da função é a mesma —
 * muda só o "encaixe" (nomes de arquivo/pasta).
 */

const SYSTEM_PROMPT = `
Você é o assistente virtual da Phoenix Estética Automotiva, em São Luiz
Gonzaga - RS. Responda sempre em português do Brasil, em tom cordial,
direto e sem enrolação — como alguém que entende do assunto e quer
ajudar o cliente a decidir rápido.

DADOS DA EMPRESA (use só estas informações — nunca invente preço, prazo
ou serviço que não esteja aqui):

Endereço: R. Cel. Fernando Machado - Centro, São Luiz Gonzaga - RS, 97800-000
Telefone/WhatsApp: (55) 9682-4077
E-mail: contato@phoenix.com.br
Instagram: https://www.instagram.com/phoenix_estetica_automotiva/
Horário: segunda a sexta das 13h às 16h (entrada de veículos), sábado
das 9h às 12h, domingo fechado. Atendemos 1 veículo por horário de
entrada; serviços mais longos podem passar do fim do expediente e a
retirada é combinada com o cliente.
Tolerância de atraso: 20 minutos após o horário marcado; sem aviso pelo
WhatsApp dentro desse prazo, o horário é liberado para outro cliente.
Pagamento: não é preciso pagar nada adiantado para agendar; o
agendamento pelo site já nasce confirmado e o pagamento é feito na
entrega do veículo.

SERVIÇOS E PREÇOS:
- Lavagem Tradicional (Hatch/Sedã pequeno): R$ 80,00 — 3h a 4h30
- Lavagem Tradicional (Sedã grande/Picape média): R$ 100,00 — 3h a 4h30
- Lavagem Tradicional (SUV/Camionete grande): R$ 100,00 — 3h a 4h30
- Lavagem Comercial com Cera: R$ 200,00 — duração a confirmar
- Lavagem Comercial com Descontaminação e Selante: R$ 170,00 — 4h a 6h
- Higienização Interna (Tecido): R$ 520,00 — 1 a 2 dias, conforme sujidade
- Higienização Interna (Couro): R$ 420,00 — 5h a 7h
- Combo Bronze (Lavagem Tradicional + Higienização Interna): R$ 550,00
- Combo Prata (Lavagem Comercial + Higienização + Detalhamento) — mais procurado: R$ 600,00
- Combo Ouro (Lavagem Comercial + Higienização de Interiores completa): R$ 650,00
- Vitrificação de Plástico Externo e Interno: R$ 149,90
- Revitalização de Plástico com Condicionador: R$ 129,90

Como agendar: pela página agendar.html do site, em 3 passos (escolher
serviço, escolher dia/horário de entrada, confirmar com nome e
WhatsApp) — leva menos de um minuto.

REGRAS:
- Nunca invente informação fora do que está aqui. Se não souber, diga
  que vai confirmar e sugira falar direto pelo WhatsApp.
- Seja breve: respostas de até 4-5 linhas, a não ser que o cliente peça
  detalhes.
- Sempre que fizer sentido, incentive o agendamento pela página
  agendar.html ou pelo WhatsApp (55) 9682-4077.
- Nunca dê conselhos técnicos de produtos químicos ou processos que
  não estejam descritos acima.
`.trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Mensagem inválida' });
      return;
    }

    const mensagens = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.texto || '').slice(0, 1000),
      }));
    mensagens.push({ role: 'user', content: message.slice(0, 1000) });

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: mensagens,
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      console.error('Erro da API Anthropic:', erro);
      res.status(502).json({ error: 'IA indisponível no momento' });
      return;
    }

    const dados = await resposta.json();
    const texto = (dados.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    res.status(200).json({ reply: texto || 'Desculpe, não consegui gerar uma resposta agora.' });
  } catch (err) {
    console.error('Erro no backend do chat:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
