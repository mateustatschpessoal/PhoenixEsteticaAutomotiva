/*!
 * ASSISTENTE VIRTUAL — PHOENIX ESTÉTICA AUTOMOTIVA
 * ---------------------------------------------------------
 * Widget de chat 100% independente (sem dependências externas).
 * - Responde perguntas sobre serviços, preços, horários, endereço,
 *   agendamento, tolerância de atraso e pagamento.
 * - Lembra da conversa: o histórico fica salvo no navegador do
 *   próprio cliente (localStorage), então se ele sair e voltar
 *   ao site, a conversa continua de onde parou.
 * - Pronto para ligar numa IA real (Claude, via backend) — basta
 *   preencher CONFIG.aiEndpoint. Sem isso, funciona sozinho com
 *   a base de conhecimento local (sem custo de API, sempre no ar).
 *
 * COMO USAR: adicione, antes de </body>, em cada página do site:
 *   <script src="assistente-phoenix.js" defer></script>
 *
 * Veja README-chatbot.md para instruções de configuração e para
 * ligar a uma IA de verdade via backend.
 * ---------------------------------------------------------
 */
(function () {
  'use strict';

  /* ============================================================
   * 1) CONFIGURAÇÃO — único bloco que normalmente precisa mexer
   * ============================================================ */
  var CONFIG = {
    // Se vocês montarem o backend com IA (ver README-chatbot.md e
    // api/chat.js), coloquem aqui a URL do endpoint. Ex: '/api/chat'.
    // Deixando null, o assistente usa só a base de conhecimento local.
    aiEndpoint: null,

    // Número de WhatsApp real da Phoenix (mesmo usado no resto do site).
    whatsapp: '555596824077',

    nomeEmpresa: 'Phoenix Estética Automotiva',
    saudacaoBot: 'Assistente Phoenix',

    // Chave usada no localStorage do navegador do visitante.
    storageKey: 'phoenix_chat_historico_v1',
    maxMensagensSalvas: 80,

    corPrimaria: '#E52316',
    corSecundaria: '#FF5A00',
    corDestaque: '#FFD400',
  };

  /* ============================================================
   * 2) BASE DE CONHECIMENTO — extraída do site (index.html / agendar.html)
   * ============================================================ */
  var SERVICOS = [
    { id: 'lavagem-trad-hatch-sedan-pequeno', nome: 'Lavagem Tradicional — Hatch / Sedã Pequeno', duracao: '3h a 4h30', preco: 80.00, desc: 'Lavagem tradicional sem aplicação de cera, para hatch e sedã pequeno.' },
    { id: 'lavagem-trad-sedan-grande-picape-media', nome: 'Lavagem Tradicional — Sedã Grande / Picape Média', duracao: '3h a 4h30', preco: 100.00, desc: 'Lavagem tradicional sem aplicação de cera, para sedã grande e picape média.' },
    { id: 'lavagem-trad-suv-camionete', nome: 'Lavagem Tradicional — SUV / Camionete Grande', duracao: '3h a 4h30', preco: 100.00, desc: 'Lavagem tradicional sem aplicação de cera, para SUV e camionete grande.' },
    { id: 'lavagem-comercial-cera', nome: 'Lavagem Comercial com Cera', duracao: 'a confirmar na entrada', preco: 200.00, desc: 'Lavagem comercial com aplicação de cera de proteção — mais brilho e durabilidade.' },
    { id: 'lavagem-comercial-descontaminacao-selante', nome: 'Lavagem Comercial com Descontaminação e Selante', duracao: '4h a 6h', preco: 170.00, desc: 'Lavagem comercial com descontaminação de pintura e aplicação de selante.' },
    { id: 'higienizacao-interna-tecido', nome: 'Higienização Interna — Estofamento em Tecido', duracao: '1 a 2 dias, conforme a sujidade', preco: 520.00, desc: 'Limpeza profunda do interior para estofamento em tecido, com sanitização completa.' },
    { id: 'higienizacao-interna-couro', nome: 'Higienização Interna — Estofamento em Couro', duracao: '5h a 7h', preco: 420.00, desc: 'Limpeza profunda do interior para estofamento em couro, com sanitização completa.' },
    { id: 'combo-bronze', nome: 'Combo Bronze', duracao: 'a confirmar na entrada', preco: 550.00, desc: 'Lavagem tradicional + higienização interna — o combo de entrada.' },
    { id: 'combo-prata', nome: 'Combo Prata (mais procurado)', duracao: 'a confirmar na entrada', preco: 600.00, desc: 'Lavagem comercial + higienização + detalhamento — o combo intermediário, o mais pedido.' },
    { id: 'combo-ouro', nome: 'Combo Ouro (linha ouro)', duracao: 'a confirmar na entrada', preco: 650.00, desc: 'Lavagem comercial + higienização de interiores completa — o combo mais completo.' },
    { id: 'vitrificacao-plastico', nome: 'Vitrificação de Plástico Externo e Interno', duracao: 'a confirmar na entrada', preco: 149.90, desc: 'Renova e protege as peças plásticas do veículo, por dentro e por fora.' },
    { id: 'revitalizacao-plastico', nome: 'Revitalização de Plástico com Condicionador', duracao: 'a confirmar na entrada', preco: 129.90, desc: 'Recupera o acabamento e a proteção das peças plásticas externas.' }
  ];

  var INFO = {
    endereco: 'R. Cel. Fernando Machado - Centro, São Luiz Gonzaga - RS, 97800-000',
    telefone: '(55) 9682-4077',
    email: 'contato@phoenix.com.br',
    instagram: 'https://www.instagram.com/phoenix_estetica_automotiva/',
    horarios: 'Segunda a sexta: das 13h às 16h (horário de entrada dos veículos) · Sábado: das 9h às 12h · Domingo: fechado.',
    tolerancia: 'A tolerância de atraso é de 20 minutos após o horário marcado. Se você atrasar, avise pela WhatsApp o quanto antes — sem aviso dentro desses 20 minutos, o horário é liberado para outro cliente.',
    pagamento: 'Não é preciso pagar nada adiantado para agendar: o agendamento pelo site já nasce confirmado, e o pagamento é feito na entrega do veículo.',
    capacidade: 'Atendemos 1 veículo por horário de entrada — é uma baia só. Serviços mais longos podem passar do fim do expediente; a retirada é combinada direto com você.'
  };

  function linkWhats(msg) {
    return 'https://wa.me/' + CONFIG.whatsapp + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }

  /* ============================================================
   * 3) MOTOR DE RESPOSTAS (base local — funciona sem nenhuma API)
   * ============================================================ */
  // Gírias, abreviações e erros de digitação comuns em mensagens de
  // WhatsApp/site. Isso faz o assistente entender bem mais variações de
  // como as pessoas realmente escrevem, sem precisar de IA externa.
  var ABREVIACOES = {
    'vc': 'voce', 'vcs': 'voces', 'pq': 'porque', 'q': 'que', 'qto': 'quanto',
    'qnto': 'quanto', 'qual e': 'qual e', 'tb': 'tambem', 'tbm': 'tambem',
    'hj': 'hoje', 'blz': 'beleza', 'wpp': 'whatsapp', 'zap': 'whatsapp',
    'vlr': 'valor', 'vlrs': 'valores', 'add': 'agendar', 'agenda': 'agendar',
    'msg': 'mensagem', 'add': 'adicionar', 'pcte': 'pacote', 'pcts': 'pacotes',
    'hig': 'higienizacao', 'smana': 'semana', 'seg': 'segunda',
    'oq': 'o que', 'dnv': 'de novo', 'hrs': 'horas', 'hr': 'hora'
  };

  function normalizar(s) {
    var t = (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Expande abreviações/gírias comuns, palavra por palavra.
    t = t.split(' ').map(function (p) { return ABREVIACOES[p] || p; }).join(' ');
    return t;
  }

  // Distância de Levenshtein simples — usada para tolerar pequenos erros
  // de digitação (ex.: "higienizaçao", "vitrificaçao" sem/trocando letra).
  function distanciaEdicao(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var linha = [];
    for (var j = 0; j <= n; j++) linha[j] = j;
    for (var i = 1; i <= m; i++) {
      var anterior = linha[0];
      linha[0] = i;
      for (j = 1; j <= n; j++) {
        var temp = linha[j];
        linha[j] = a[i - 1] === b[j - 1]
          ? anterior
          : 1 + Math.min(anterior, linha[j], linha[j - 1]);
        anterior = temp;
      }
    }
    return linha[n];
  }

  // Duas palavras "correspondem" se forem iguais ou muito parecidas
  // (tolera 1 letra errada/faltando em palavras com 5+ caracteres).
  function palavrasParecidas(a, b) {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    var tolerancia = (a.length >= 7 || b.length >= 7) ? 2 : 1;
    return distanciaEdicao(a, b) <= tolerancia;
  }

  // Verifica se uma frase/palavra aparece no texto respeitando limite de
  // palavra (evita, por exemplo, "ouro" "casar" dentro de "couro").
  function contemFrase(textoNorm, frase) {
    var escapada = frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escapada + '\\b').test(textoNorm);
  }

  // Verifica se a palavra-chave aparece (exata ou parecida) dentro do texto.
  function contemParecido(textoNorm, palavraChave) {
    if (contemFrase(textoNorm, palavraChave)) return true;
    var tokens = textoNorm.split(' ');
    for (var i = 0; i < tokens.length; i++) {
      if (palavrasParecidas(tokens[i], palavraChave)) return true;
    }
    return false;
  }

  function formatarPreco(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  function cartaoServico(s) {
    return s.nome + '\n' + s.desc + '\n💰 ' + formatarPreco(s.preco) + '  ·  ⏱ ' + s.duracao;
  }

  // Sinônimos/atalhos por serviço — usados na busca direta e na busca
  // ampla (fallback) mais abaixo.
  var ATALHOS_SERVICO = {
    'lavagem-trad-hatch-sedan-pequeno': ['carro pequeno', 'lavagem simples', 'carro popular'],
    'lavagem-comercial-cera': ['cera', 'encerada', 'enceramento'],
    'lavagem-comercial-descontaminacao-selante': ['descontaminacao', 'selante', 'descontaminar'],
    'higienizacao-interna-tecido': ['tecido', 'estofado', 'estofamento', 'bancos', 'banco de tecido', 'cheiro', 'fedor', 'mofo'],
    'higienizacao-interna-couro': ['couro', 'banco de couro'],
    'combo-bronze': ['bronze', 'combo de entrada', 'combo mais barato'],
    'combo-prata': ['prata', 'combo mais procurado', 'combo do meio'],
    'combo-ouro': ['ouro', 'combo completo', 'combo mais caro'],
    'vitrificacao-plastico': ['vitrificacao', 'vitrificar', 'vitrificado'],
    'revitalizacao-plastico': ['revitalizacao', 'condicionador', 'revitalizar', 'parachoque', 'friso']
  };

  // Encontra o serviço mais citado no texto, por sobreposição de palavras
  // (tolerante a pequenos erros de digitação via palavrasParecidas).
  function encontrarServico(textoNorm) {
    var melhor = null, melhorPontos = 0;
    SERVICOS.forEach(function (s) {
      var palavrasNome = normalizar(s.nome).split(' ');
      var pontos = 0;
      palavrasNome.forEach(function (p) {
        if (p.length > 2 && contemParecido(textoNorm, p)) pontos++;
      });
      var sinonimos = ATALHOS_SERVICO[s.id] || [];
      sinonimos.forEach(function (frase) {
        if (contemFrase(textoNorm, frase)) pontos += 2;
      });
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = s; }
    });
    return melhorPontos > 0 ? melhor : null;
  }

  // Mesma busca acima, mas devolvendo também a pontuação — usada quando
  // é preciso ter certeza mínima antes de "assumir" que é sobre um
  // serviço específico (ver respostaLocal, passo 3).
  function encontrarServicoComPontos(textoNorm) {
    var melhor = null, melhorPontos = 0;
    SERVICOS.forEach(function (s) {
      var palavrasNome = normalizar(s.nome).split(' ');
      var pontos = 0;
      palavrasNome.forEach(function (p) {
        if (p.length > 2 && contemParecido(textoNorm, p)) pontos++;
      });
      var sinonimos = ATALHOS_SERVICO[s.id] || [];
      sinonimos.forEach(function (frase) {
        if (contemFrase(textoNorm, frase)) pontos += 2;
      });
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = s; }
    });
    return melhor ? { servico: melhor, pontos: melhorPontos } : null;
  }

  // "Plástico" sozinho, sem mais nada, é ambíguo entre vitrificação e
  // revitalização — melhor perguntar do que adivinhar errado.
  function plasticoAmbiguo(textoNorm) {
    var mencionaPlastico = contemParecido(textoNorm, 'plastico');
    var mencionaVitrificar = contemParecido(textoNorm, 'vitrificacao') || contemParecido(textoNorm, 'vitrificar');
    var mencionaRevitalizar = contemParecido(textoNorm, 'revitalizacao') || contemParecido(textoNorm, 'condicionador');
    return mencionaPlastico && !mencionaVitrificar && !mencionaRevitalizar;
  }

  function listaServicosResumo() {
    var lavagens = SERVICOS.filter(function (s) { return s.id.indexOf('lavagem') === 0 || s.id.indexOf('lavagem-') === 0; });
    var higienizacao = SERVICOS.filter(function (s) { return s.id.indexOf('higienizacao') === 0; });
    var combos = SERVICOS.filter(function (s) { return s.id.indexOf('combo') === 0; });
    var protecao = SERVICOS.filter(function (s) { return s.id.indexOf('vitrificacao') === 0 || s.id.indexOf('revitalizacao') === 0; });

    function linha(s) { return '• ' + s.nome + ' — ' + formatarPreco(s.preco); }

    var partes = [];
    partes.push('Esses são os nossos serviços 🔥');
    partes.push('\n🚿 Lavagens\n' + lavagens.map(linha).join('\n'));
    partes.push('\n🧴 Higienização Interna\n' + higienizacao.map(linha).join('\n'));
    partes.push('\n📦 Combos\n' + combos.map(linha).join('\n'));
    partes.push('\n✨ Proteção de Plástico\n' + protecao.map(linha).join('\n'));
    partes.push('\nQuer saber detalhes ou duração de algum deles? É só me dizer o nome.');
    return partes.join('\n');
  }

  var ultimoServicoCitado = null;

  // Nome dos dias da semana, na ordem do Date.getDay() (0 = domingo).
  var DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Saudação certa pro horário real do visitante (usa o relógio do
  // próprio navegador dele) — assim "oi", "boa tarde" errado de manhã
  // etc. sempre voltam com a saudação correta.
  function saudacaoPorHorario() {
    var h = new Date().getHours();
    if (h < 12) return 'Bom dia!';
    if (h < 18) return 'Boa tarde!';
    return 'Boa noite!';
  }

  // Calcula, com base no relógio do navegador do visitante, se hoje é
  // dia de atendimento, qual a janela de entrada de hoje e se esse
  // horário está aberto agora. Regras de negócio (ver INFO.horarios):
  // seg-sex 13h-16h, sábado 9h-12h, domingo fechado.
  function statusHoje() {
    var agora = new Date();
    var dia = agora.getDay();
    var horaDecimal = agora.getHours() + agora.getMinutes() / 60;
    var nomeDia = DIAS_SEMANA[dia];

    if (dia === 0) {
      return { nomeDia: nomeDia, abreHoje: false };
    }
    var abreH = dia === 6 ? 9 : 13;
    var fechaH = dia === 6 ? 12 : 16;
    var textoHorario = dia === 6 ? 'das 9h às 12h' : 'das 13h às 16h';

    return {
      nomeDia: nomeDia,
      abreHoje: true,
      abreH: abreH,
      fechaH: fechaH,
      textoHorario: textoHorario,
      horaDecimal: horaDecimal,
      abertoAgora: horaDecimal >= abreH && horaDecimal < fechaH
    };
  }

  var REGRAS = [
    {
      nome: 'saudacao',
      // Só conta como "só uma saudação" se a mensagem for curta — assim
      // "oi, quanto custa a lavagem?" não vira só um "oi" de volta.
      teste: function (t) { return t.length < 22 && /^(oi|ola|opa|eae|e ai|bom dia|boa tarde|boa noite|salve)\b/.test(t); },
      resposta: function () {
        return saudacaoPorHorario() + ' 🔥 Eu sou o assistente virtual da ' + CONFIG.nomeEmpresa + '. Posso te ajudar com serviços, preços, horários e agendamento. O que você gostaria de saber?';
      }
    },
    {
      nome: 'como_vai',
      teste: function (t) { return t.length < 30 && /(tudo bem|tudo bom|como vai|de boa|suave)/.test(t); },
      resposta: function () { return 'Tudo certo por aqui! 🔥 Como posso te ajudar — quer saber sobre serviços, preços, horário ou já quer agendar?'; }
    },
    {
      nome: 'agradecimento',
      teste: function (t) { return /\b(obrigad|valeu|show|maravilha|otimo|excelente)\b/.test(t) && t.length < 60; },
      resposta: function () { return 'Por nada! 🔥 Qualquer outra dúvida, é só perguntar.'; }
    },
    {
      nome: 'data_hora_atual',
      teste: function (t) { return /(que dia (e|eh) hoje|qual (o )?dia (de )?hoje|hoje (e|eh) que dia|que dia (e|eh)|que horas sao|que horas (e|eh)|dia da semana (hoje|e))/.test(t); },
      resposta: function () {
        var agora = new Date();
        var dataFormatada = agora.toLocaleDateString('pt-BR');
        var horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return '🗓️ Hoje é ' + capitalizar(DIAS_SEMANA[agora.getDay()]) + ', ' + dataFormatada + '. Agora são ' + horaFormatada + ' no seu horário local.';
      }
    },
    {
      nome: 'atende_hoje',
      // Vem antes da regra "horario" genérica de propósito: perguntas
      // como "abrem hoje?"/"tem horário hoje?" também batem em palavras
      // da regra genérica (ex.: "abre"), mas aqui a resposta precisa ser
      // específica pro dia de hoje, não a tabela semanal inteira.
      teste: function (t) {
        return /(atende hoje|abrem hoje|abre hoje|tem horario hoje|tem vaga hoje|hoje tem horario|hoje tem vaga|aberto agora|abertos agora|voces? (estao|esta) abert|funcionando agora|hoje voces? (tem|abrem|atendem|funcionam)|da pra ir hoje|posso ir hoje)/.test(t);
      },
      resposta: function () {
        var s = statusHoje();
        if (!s.abreHoje) {
          return '❌ Hoje é domingo — não temos atendimento aos domingos.\n\n⏰ ' + INFO.horarios + '\n\nQuer já garantir um horário pra outro dia? É rapidinho pela agendar.html.';
        }
        var msg = '📅 Hoje é ' + capitalizar(s.nomeDia) + ', e o atendimento é ' + s.textoHorario + ' (horário de entrada dos veículos).\n\n';
        if (s.abertoAgora) {
          msg += '✅ Estamos dentro do horário de entrada agora! Pode agendar direto pela agendar.html, ou chamar no WhatsApp pra confirmar: ' + linkWhats('Olá! Vim pelo site, queria saber se tem horário disponível hoje.');
        } else if (s.horaDecimal < s.abreH) {
          msg += '⏳ Ainda não abrimos hoje — a entrada começa às ' + s.abreH + 'h. Já dá pra garantir seu horário pela agendar.html.';
        } else {
          msg += 'O horário de entrada de hoje já encerrou. Bora agendar pro próximo dia? agendar.html\n\n⏰ ' + INFO.horarios;
        }
        return msg;
      }
    },
    {
      nome: 'lista_servicos',
      teste: function (t) { return /(servi[cç]|o que (voce|voces) (faz|fazem)|o que tem|catalogo|opcoes|o que oferece)/.test(t); },
      resposta: function () { return listaServicosResumo(); }
    },
    {
      nome: 'preco_geral',
      teste: function (t) { return /(preco|precos|valor|valores|tabela|quanto custa|quanto (e|fica|sai))/.test(t); },
      resposta: function (t) {
        var s = encontrarServico(t);
        if (s) { ultimoServicoCitado = s; return cartaoServico(s); }
        return listaServicosResumo();
      }
    },
    {
      nome: 'duracao',
      teste: function (t) { return /(quanto tempo|demora|duracao|dura quanto)/.test(t); },
      resposta: function (t) {
        var s = encontrarServico(t) || ultimoServicoCitado;
        if (s) { ultimoServicoCitado = s; return 'A duração estimada de "' + s.nome + '" é ' + s.duracao + '. ' + INFO.capacidade; }
        return 'Me diga qual serviço você quer saber a duração (ex.: "quanto tempo demora a vitrificação de plástico?").';
      }
    },
    {
      nome: 'horario',
      teste: function (t) { return /(horario|que horas|voces? (funciona|abre|fecha)|abre|fecha|atende (que dia|quando)|dias? de atendimento)/.test(t); },
      resposta: function () { return '⏰ ' + INFO.horarios; }
    },
    {
      nome: 'endereco',
      teste: function (t) { return /(endereco|onde fica|localizacao|onde vocess?|onde e|como chegar|qual (a )?rua)/.test(t); },
      resposta: function () { return '📍 ' + INFO.endereco; }
    },
    {
      nome: 'contato',
      teste: function (t) { return /(telefone|whatsapp|zap|contato|falar com (alguem|voces)|numero)/.test(t); },
      resposta: function () {
        return '📞 ' + INFO.telefone + ' (também é o nosso WhatsApp)\n✉️ ' + INFO.email + '\n\nSe preferir, clique aqui pra já abrir o WhatsApp: ' + linkWhats('Olá! Vim pelo site e tenho uma dúvida.');
      }
    },
    {
      nome: 'agendar',
      teste: function (t) { return /(agend|marcar|reservar|hor[ae]rio (disponivel|vago)|posso ir)/.test(t); },
      resposta: function () {
        return 'Agendar é rápido, em 3 passos: 1) escolha o serviço, 2) escolha o dia e horário de entrada, 3) confirme com seu nome e WhatsApp. Leva menos de um minuto na nossa página de agendamento: agendar.html\n\n' + INFO.horarios;
      }
    },
    {
      nome: 'atraso',
      teste: function (t) { return /(atras|toleranc|chegar mais tarde)/.test(t); },
      resposta: function () { return '⏳ ' + INFO.tolerancia; }
    },
    {
      nome: 'pagamento',
      teste: function (t) { return /(pagamento|pagar|pix|adiantado|sinal|deposito|cartao|debito|credito|dinheiro)/.test(t); },
      resposta: function (t) {
        var perguntouMetodo = /\b(pix|cartao|debito|credito|dinheiro)\b/.test(t);
        var msg = '💳 ' + INFO.pagamento;
        if (perguntouMetodo) {
          msg += '\n\nNão tenho aqui a lista exata de quais formas (Pix, cartão, dinheiro) são aceitas na hora — pra ter certeza, confirme direto pelo WhatsApp: ' + linkWhats('Olá! Quais formas de pagamento vocês aceitam na entrega?');
        }
        return msg;
      }
    },
    {
      nome: 'instagram',
      teste: function (t) { return /(instagram|redes sociais|fotos|antes e depois|galeria|portfolio)/.test(t); },
      resposta: function () { return '📸 Dá uma olhada nos nossos trabalhos no Instagram: ' + INFO.instagram; }
    },
    {
      nome: 'comparacao_combos',
      teste: function (t) {
        return /(diferenca entre|qual (a )?diferenca|compara|comparar).*(combo|bronze|prata|ouro|vitrifica|revitaliza|tradicional|comercial)/.test(t) ||
          /(bronze|prata|ouro).*(bronze|prata|ouro)/.test(t) ||
          (/tradicional/.test(t) && /comercial/.test(t));
      },
      resposta: function (t) {
        if (/vitrifica|revitaliza|condicionador/.test(t)) {
          var vit = SERVICOS.filter(function (s) { return s.id === 'vitrificacao-plastico'; })[0];
          var rev = SERVICOS.filter(function (s) { return s.id === 'revitalizacao-plastico'; })[0];
          return 'A diferença:\n\n✨ ' + vit.nome + ' (' + formatarPreco(vit.preco) + ') — ' + vit.desc + '\n\n🧴 ' + rev.nome + ' (' + formatarPreco(rev.preco) + ') — ' + rev.desc;
        }
        if (/tradicional/.test(t) && /comercial/.test(t)) {
          return 'A diferença:\n\n🚿 Lavagem Tradicional — lavagem sem cera, o básico bem-feito. R$ 80 a R$ 100, dependendo do porte.\n\n✨ Lavagem Comercial — com cera (R$ 200) ou com descontaminação + selante (R$ 170): mais brilho e proteção pra pintura, além da lavagem.';
        }
        var combos = SERVICOS.filter(function (s) { return s.id.indexOf('combo') === 0; });
        return 'Nossos 3 combos, do mais simples ao mais completo:\n\n' + combos.map(function (c) {
          return '📦 ' + c.nome + ' — ' + formatarPreco(c.preco) + '\n' + c.desc;
        }).join('\n\n') + '\n\nSe quiser, me diz o que o seu carro mais precisa (lavagem, cheiro interno, plástico) que eu te ajudo a escolher.';
      }
    },
    {
      nome: 'recomendacao',
      teste: function (t) { return /(qual (voces? )?recomend|qual (e )?o melhor|qual compensa|qual (devo|eu devo) escolher|me ajuda a escolher|qual (voces? )?indicam|qual (o )?ideal)/.test(t); },
      resposta: function () {
        return 'Depende do que seu carro precisa, mas o mais pedido aqui é o Combo Prata (lavagem comercial + higienização + detalhamento) — R$ 600,00. Se for só uma lavagem do dia a dia, a Lavagem Tradicional já resolve. Me conta o que está incomodando (sujeira externa, cheiro interno, plástico ressecado...) que eu indico certinho.';
      }
    },
    {
      nome: 'fora_de_escopo',
      teste: function (t) { return /(funilaria|pintura|martelinho|envelopamento|troca de oleo|revisao|mecanic|pneu|alinhamento|balanceamento|freio|suspensao|eletric[ao]|bateria)/.test(t); },
      resposta: function () {
        return 'Isso foge do que fazemos aqui 🙂 A Phoenix é estética automotiva — trabalhamos com lavagem, higienização interna, combos e proteção de plástico. Pra esse tipo de serviço, vale procurar uma oficina mecânica ou funilaria.';
      }
    },
    {
      nome: 'atendente_humano',
      teste: function (t) { return /(falar com (uma pessoa|alguem|atendente|humano)|quero atendente|atendimento humano|nao quero falar com robo)/.test(t); },
      resposta: function () {
        return 'Sem problema! Pode falar direto com a nossa equipe pelo WhatsApp: ' + linkWhats('Olá! Vim do site e prefiro falar direto com um atendente.');
      }
    },
    {
      nome: 'identidade_bot',
      teste: function (t) { return /(voces? (e|sao) (um |uma )?(robo|humano|humanos|real|pessoa|pessoas)|voce e ia|quem te criou|quem fez voce|voce e de verdade|(e |so )?robo mesmo|falando com (um )?robo)/.test(t); },
      resposta: function () {
        return 'Sou o assistente virtual (automático) da Phoenix — respondo dúvidas sobre serviços, preços, horários e agendamento a qualquer hora. Se preferir falar com uma pessoa da equipe, é só pedir que eu te passo o WhatsApp.';
      }
    },
    {
      nome: 'primeira_vez',
      teste: function (t) { return /(primeira vez|nunca fui ai|como funciona (o processo|isso|aqui)|nunca usei)/.test(t); },
      resposta: function () {
        return 'Fechado, te explico rapidinho! 🔥\n\n1) Você escolhe o serviço e o horário de entrada na página agendar.html (leva menos de 1 minuto)\n2) Chega no horário combinado (tolerância de 20 min) — ' + INFO.endereco + '\n3) O carro fica com a gente pelo tempo do serviço\n4) Você paga só na retirada, sem nada adiantado\n\n⏰ ' + INFO.horarios;
      }
    },
    {
      nome: 'desconto_frota',
      teste: function (t) { return /(desconto|cupom|promocao|frota|empresa|convenio)/.test(t); },
      resposta: function () {
        return 'Não tenho essa informação aqui na base — condições especiais de frota/empresa ou promoções em andamento é melhor confirmar direto pelo WhatsApp: ' + linkWhats('Olá! Gostaria de saber sobre descontos/atendimento para frota ou empresa.');
      }
    },
    {
      nome: 'despedida',
      teste: function (t) { return /^(tchau|falou|ate mais|flw|xau|ate logo)\b/.test(t); },
      resposta: function () { return 'Até já! 🔥 Se precisar de mais alguma coisa, é só chamar de novo — eu lembro da nossa conversa.'; }
    }
  ];

  // Perguntas comuns cuja resposta NÃO está nos dados da empresa. Em vez
  // de inventar, o assistente admite que não sabe e manda pro WhatsApp —
  // mas de forma específica, mostrando que entendeu a pergunta.
  var SEM_DADO = [
    { id: 'estacionamento', gatilhos: ['estacionamento', 'onde estaciono', 'vaga'], pergunta: 'sobre estacionamento' },
    { id: 'esperar_local', gatilhos: ['esperar no local', 'ficar esperando', 'posso ficar', 'tem onde esperar'], pergunta: 'se dá pra esperar no local' },
    { id: 'busca_carro', gatilhos: ['buscam o carro', 'vem buscar', 'delivery', 'leva e traz', 'retira em casa'], pergunta: 'se vocês buscam/entregam o carro' },
    { id: 'cancelamento', gatilhos: ['cancelar', 'remarcar', 'desmarcar', 'mudar o horario'], pergunta: 'como cancelar ou remarcar um agendamento' },
    { id: 'garantia', gatilhos: ['garantia', 'se nao gostar', 'reclamacao'], pergunta: 'sobre garantia do serviço' }
  ];

  function buscarSemDado(textoNorm) {
    for (var i = 0; i < SEM_DADO.length; i++) {
      var item = SEM_DADO[i];
      for (var j = 0; j < item.gatilhos.length; j++) {
        if (contemFrase(textoNorm, item.gatilhos[j])) {
          return 'Essa informação (' + item.pergunta + ') eu não tenho aqui na base — pra não te passar algo errado, confirme direto com a equipe pelo WhatsApp: ' + linkWhats('Olá! Vim pelo site da Phoenix e tenho uma dúvida: ' + item.pergunta + '.');
        }
      }
    }
    return null;
  }

  // Busca ampla (última tentativa antes do fallback genérico): compara o
  // texto do cliente com um "corpus" combinando os tópicos de INFO e os
  // serviços, tolerando erros de digitação, pra pegar perguntas escritas
  // de um jeito que as regras acima não previram.
  function montarCorpusAmplo() {
    return [
      { palavras: ['horario', 'funciona', 'abre', 'fecha', 'atende', 'sabado', 'domingo'], resposta: '⏰ ' + INFO.horarios },
      { palavras: ['endereco', 'localizacao', 'chegar', 'fica'], resposta: '📍 ' + INFO.endereco },
      { palavras: ['telefone', 'contato', 'email', 'numero'], resposta: '📞 ' + INFO.telefone + '\n✉️ ' + INFO.email },
      { palavras: ['pagamento', 'pagar', 'adiantado', 'entrega'], resposta: '💳 ' + INFO.pagamento },
      { palavras: ['atraso', 'tolerancia', 'atrasar'], resposta: '⏳ ' + INFO.tolerancia },
      { palavras: ['capacidade', 'fila', 'demora muito', 'baia'], resposta: 'ℹ️ ' + INFO.capacidade },
      { palavras: ['instagram', 'fotos', 'trabalhos'], resposta: '📸 ' + INFO.instagram }
    ];
  }

  function buscaAmpla(textoNorm) {
    var corpus = montarCorpusAmplo();
    var melhor = null, melhorPontos = 0;
    corpus.forEach(function (item) {
      var pontos = 0;
      item.palavras.forEach(function (p) { if (contemParecido(textoNorm, p)) pontos++; });
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = item; }
    });
    return melhorPontos >= 1 ? melhor.resposta : null;
  }

  function respostaLocal(textoUsuario) {
    var t = normalizar(textoUsuario);

    // 1) "Plástico" citado sem especificar qual serviço — pergunta em vez de adivinhar.
    if (plasticoAmbiguo(t)) {
      return 'Temos dois serviços pra plástico — quer saber sobre a Vitrificação (protege e dá acabamento novo, por dentro e por fora) ou a Revitalização com Condicionador (recupera o acabamento de peças externas)?';
    }

    // 2) Regras por intenção — vêm ANTES do "match" de serviço por palavra
    //    solta, porque uma intenção clara (ex.: "falar com atendente",
    //    "vocês recomendam algum?") não pode perder pra uma coincidência
    //    de palavra com o nome de um serviço.
    for (var i = 0; i < REGRAS.length; i++) {
      if (REGRAS[i].teste(t)) return REGRAS[i].resposta(t);
    }

    // 3) Serviço específico citado diretamente (nome do serviço, sem
    //    intenção clara de outra coisa) — exige uma pontuação mínima pra
    //    evitar "achar" um serviço numa mensagem que não fala disso.
    var servicoDireto = encontrarServicoComPontos(t);
    if (servicoDireto && servicoDireto.pontos >= 2 && t.length < 80) {
      ultimoServicoCitado = servicoDireto.servico;
      return cartaoServico(servicoDireto.servico);
    }

    // 4) Pergunta conhecida cuja resposta não está nos dados — admite e encaminha.
    var semDado = buscarSemDado(t);
    if (semDado) return semDado;

    // 5) Busca ampla — tenta achar o tópico mais próximo antes de desistir.
    var amplo = buscaAmpla(t);
    if (amplo) return amplo;

    // 6) Fallback final
    return 'Não tenho certeza se entendi 🤔 Posso te ajudar com:\n• Serviços e preços\n• Horário de funcionamento\n• Endereço\n• Como agendar\n\nOu, se preferir, fale direto com a gente pelo WhatsApp: ' + linkWhats('Olá! Vim pelo site da Phoenix e gostaria de mais informações.');
  }

  /* ============================================================
   * 4) CAMADA DE IA (opcional) — usa backend se CONFIG.aiEndpoint
   *    estiver configurado; senão cai automaticamente no motor local.
   * ============================================================ */
  function obterResposta(textoUsuario, historico) {
    if (CONFIG.aiEndpoint) {
      return fetch(CONFIG.aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textoUsuario, history: historico.slice(-12) })
      }).then(function (res) {
        if (!res.ok) throw new Error('backend indisponivel');
        return res.json();
      }).then(function (data) {
        return (data && data.reply) ? data.reply : respostaLocal(textoUsuario);
      }).catch(function () {
        return respostaLocal(textoUsuario);
      });
    }
    return Promise.resolve(respostaLocal(textoUsuario));
  }

  /* ============================================================
   * 5) MEMÓRIA DE CONVERSA (localStorage do navegador do cliente)
   * ============================================================ */
  function carregarHistorico() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function salvarHistorico(historico) {
    try {
      var recorte = historico.slice(-CONFIG.maxMensagensSalvas);
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(recorte));
    } catch (e) { /* localStorage indisponível — segue sem salvar */ }
  }
  function limparHistorico() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
  }

  /* ============================================================
   * 6) INTERFACE (widget flutuante)
   * ============================================================ */
  var estilos = '' +
    '#phx-chat-bubble{position:fixed;bottom:22px;right:22px;width:60px;height:60px;border-radius:50%;' +
    'background:linear-gradient(135deg,' + CONFIG.corSecundaria + ',' + CONFIG.corPrimaria + ');' +
    'box-shadow:0 10px 28px -8px rgba(229,35,22,.65);border:none;cursor:pointer;z-index:999999;' +
    'display:flex;align-items:center;justify-content:center;transition:transform .25s ease;}' +
    '#phx-chat-bubble:hover{transform:scale(1.06);}' +
    '#phx-chat-bubble svg{width:28px;height:28px;}' +
    '#phx-chat-badge{position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:' + CONFIG.corDestaque + ';border:2px solid #050505;}' +
    '#phx-chat-window{position:fixed;bottom:96px;right:22px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);' +
    'background:#0D0D0D;border:1px solid rgba(229,35,22,.28);border-radius:10px;box-shadow:0 24px 60px -20px rgba(0,0,0,.7);' +
    'display:none;flex-direction:column;overflow:hidden;z-index:999999;font-family:Montserrat,Arial,sans-serif;}' +
    '#phx-chat-window.phx-open{display:flex;}' +
    '#phx-chat-header{background:linear-gradient(135deg,' + CONFIG.corSecundaria + ',' + CONFIG.corPrimaria + ');padding:14px 16px;display:flex;align-items:center;gap:10px;}' +
    '#phx-chat-header .phx-status{width:9px;height:9px;border-radius:50%;background:#3ddc71;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.25);}' +
    '#phx-chat-header .phx-titles{flex:1;min-width:0;}' +
    '#phx-chat-header .phx-titles strong{display:block;color:#fff;font-size:.92rem;font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.02em;}' +
    '#phx-chat-header .phx-titles span{display:block;color:rgba(255,255,255,.85);font-size:.72rem;}' +
    '#phx-chat-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.85;}' +
    '#phx-chat-close:hover{opacity:1;}' +
    '#phx-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#050505;}' +
    '.phx-msg{max-width:82%;padding:10px 13px;border-radius:10px;font-size:.86rem;line-height:1.5;white-space:pre-line;word-wrap:break-word;}' +
    '.phx-msg-bot{align-self:flex-start;background:#1C1414;color:#fff;border:1px solid rgba(229,35,22,.22);border-bottom-left-radius:2px;}' +
    '.phx-msg-user{align-self:flex-end;background:linear-gradient(135deg,' + CONFIG.corSecundaria + ',' + CONFIG.corPrimaria + ');color:#fff;border-bottom-right-radius:2px;}' +
    '.phx-msg a{color:' + CONFIG.corDestaque + ';text-decoration:underline;}' +
    '#phx-typing{align-self:flex-start;display:flex;gap:4px;padding:10px 13px;background:#1C1414;border-radius:10px;border-bottom-left-radius:2px;}' +
    '#phx-typing span{width:6px;height:6px;background:rgba(255,255,255,.55);border-radius:50%;animation:phx-bounce 1s infinite ease-in-out;}' +
    '#phx-typing span:nth-child(2){animation-delay:.15s;} #phx-typing span:nth-child(3){animation-delay:.3s;}' +
    '@keyframes phx-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}' +
    '#phx-chat-quick{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;background:#0D0D0D;border-top:1px solid rgba(255,255,255,.06);}' +
    '.phx-chip{flex:none;background:rgba(255,90,0,.1);border:1px solid rgba(255,90,0,.35);color:#FFE066;font-size:.72rem;padding:6px 10px;border-radius:20px;cursor:pointer;white-space:nowrap;}' +
    '.phx-chip:hover{background:rgba(255,90,0,.2);}' +
    '#phx-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:#0D0D0D;}' +
    '#phx-chat-input{flex:1;background:#141010;border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:20px;padding:10px 14px;font-size:.85rem;outline:none;}' +
    '#phx-chat-input:focus{border-color:' + CONFIG.corSecundaria + ';}' +
    '#phx-chat-send{background:linear-gradient(135deg,' + CONFIG.corSecundaria + ',' + CONFIG.corPrimaria + ');border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;}' +
    '#phx-chat-footer{padding:6px 14px 10px;text-align:center;}' +
    '#phx-chat-footer button{background:none;border:none;color:rgba(255,255,255,.35);font-size:.68rem;cursor:pointer;text-decoration:underline;}' +
    '@media(max-width:420px){#phx-chat-window{right:12px;left:12px;width:auto;bottom:88px;}}';

  function injetarEstilos() {
    var tag = document.createElement('style');
    tag.setAttribute('id', 'phx-chat-styles');
    tag.textContent = estilos;
    document.head.appendChild(tag);
  }

  var iconeChat = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>';
  var iconeFechar = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var iconeEnviar = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="17" height="17"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  function montarWidget() {
    var bubble = document.createElement('button');
    bubble.id = 'phx-chat-bubble';
    bubble.setAttribute('aria-label', 'Abrir chat com a ' + CONFIG.nomeEmpresa);
    bubble.innerHTML = iconeChat + '<span id="phx-chat-badge"></span>';
    document.body.appendChild(bubble);

    var win = document.createElement('div');
    win.id = 'phx-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Assistente virtual ' + CONFIG.nomeEmpresa);
    win.innerHTML =
      '<div id="phx-chat-header">' +
        '<span class="phx-status" aria-hidden="true"></span>' +
        '<span class="phx-titles"><strong>' + CONFIG.saudacaoBot + '</strong><span>Phoenix Estética Automotiva</span></span>' +
        '<button id="phx-chat-close" aria-label="Fechar chat">' + iconeFechar + '</button>' +
      '</div>' +
      '<div id="phx-chat-body"></div>' +
      '<div id="phx-chat-quick">' +
        '<button class="phx-chip" data-msg="Quais serviços vocês fazem?">Serviços</button>' +
        '<button class="phx-chip" data-msg="Qual o horário de funcionamento?">Horário</button>' +
        '<button class="phx-chip" data-msg="Como faço para agendar?">Agendar</button>' +
        '<button class="phx-chip" data-msg="Qual o endereço?">Endereço</button>' +
      '</div>' +
      '<form id="phx-chat-form">' +
        '<input id="phx-chat-input" type="text" placeholder="Digite sua pergunta..." autocomplete="off" maxlength="400">' +
        '<button id="phx-chat-send" type="submit" aria-label="Enviar">' + iconeEnviar + '</button>' +
      '</form>' +
      '<div id="phx-chat-footer">' +
        'Suas mensagens ficam salvas só neste navegador. ' +
        '<button type="button" id="phx-chat-clear">Limpar conversa</button>' +
      '</div>';
    document.body.appendChild(win);

    var body = win.querySelector('#phx-chat-body');
    var form = win.querySelector('#phx-chat-form');
    var input = win.querySelector('#phx-chat-input');
    var badge = document.querySelector('#phx-chat-badge');

    var historico = carregarHistorico();

    function renderMensagem(msg) {
      var div = document.createElement('div');
      div.className = 'phx-msg ' + (msg.role === 'user' ? 'phx-msg-user' : 'phx-msg-bot');
      div.innerHTML = linkificar(escapeHtml(msg.texto));
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function linkificar(s) {
      return s.replace(/(https?:\/\/[^\s]+)/g, function (url) {
        return '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
      });
    }

    function mostrarDigitando() {
      var el = document.createElement('div');
      el.id = 'phx-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function adicionarMensagem(role, texto) {
      var msg = { role: role, texto: texto, ts: Date.now() };
      historico.push(msg);
      salvarHistorico(historico);
      renderMensagem(msg);
    }

    // Primeira visita: mensagem de boas-vindas
    if (historico.length === 0) {
      adicionarMensagem('bot', 'Oi! 👋 Eu sou o assistente virtual da Phoenix Estética Automotiva. Posso te ajudar com serviços, preços, horários e agendamento. Como posso ajudar?');
    } else {
      historico.forEach(renderMensagem);
    }

    function enviar(texto) {
      texto = (texto || '').trim();
      if (!texto) return;
      adicionarMensagem('user', texto);
      input.value = '';
      var indicador = mostrarDigitando();
      var atraso = CONFIG.aiEndpoint ? 0 : 550 + Math.random() * 500;
      obterResposta(texto, historico).then(function (resposta) {
        setTimeout(function () {
          indicador.remove();
          adicionarMensagem('bot', resposta);
        }, atraso);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      enviar(input.value);
    });

    win.querySelectorAll('.phx-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { enviar(chip.getAttribute('data-msg')); });
    });

    win.querySelector('#phx-chat-clear').addEventListener('click', function () {
      if (confirm('Apagar todo o histórico desta conversa?')) {
        limparHistorico();
        historico = [];
        body.innerHTML = '';
        adicionarMensagem('bot', 'Conversa reiniciada! Como posso ajudar?');
      }
    });

    var aberto = false;
    function alternar() {
      aberto = !aberto;
      win.classList.toggle('phx-open', aberto);
      if (aberto) {
        badge.style.display = 'none';
        setTimeout(function () { input.focus(); }, 150);
        body.scrollTop = body.scrollHeight;
      }
    }
    bubble.addEventListener('click', alternar);
    win.querySelector('#phx-chat-close').addEventListener('click', alternar);
  }

  function iniciar() {
    injetarEstilos();
    montarWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
