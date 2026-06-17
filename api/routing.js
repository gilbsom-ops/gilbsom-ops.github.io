// Função Vercel para calcular rotas via OpenRouteService
// Endpoint: https://precificafrete.vercel.app/api/routing

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Se for OPTIONS, retorna 200
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aceitar GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    // Pegar parâmetros de origem e destino
    const { origem, destino } = req.method === 'GET' ? req.query : req.body;

    if (!origem || !destino) {
      return res.status(400).json({ 
        erro: 'Parâmetros inválidos. Precisa de: origem e destino' 
      });
    }

    // Sua chave OpenRouteService
    const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijc0YWI5OGZhZmZiMTQ3YTY4NzRjOTM0NDU3ODdkZWVmIiwiaCI6Im11cm11cjY0In0=';

    // PASSO 1: Geocodificar origem
    const geocodeOrigem = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(origem)}&boundary.country=BR`
    );
    const dataOrigem = await geocodeOrigem.json();

    if (!dataOrigem.features || dataOrigem.features.length === 0) {
      return res.status(400).json({ erro: `Origem não encontrada: ${origem}` });
    }

    const coordsOrigem = dataOrigem.features[0].geometry.coordinates;
    console.log(`✅ Origem geocodificada: ${origem} → [${coordsOrigem[1]}, ${coordsOrigem[0]}]`);

    // PASSO 2: Geocodificar destino
    const geocodeDestino = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(destino)}&boundary.country=BR`
    );
    const dataDestino = await geocodeDestino.json();

    if (!dataDestino.features || dataDestino.features.length === 0) {
      return res.status(400).json({ erro: `Destino não encontrado: ${destino}` });
    }

    const coordsDestino = dataDestino.features[0].geometry.coordinates;
    console.log(`✅ Destino geocodificado: ${destino} → [${coordsDestino[1]}, ${coordsDestino[0]}]`);

    // PASSO 3: Calcular rota via OpenRouteService Directions API
    const routingUrl = `https://api.openrouteservice.org/v2/directions/driving?api_key=${ORS_API_KEY}&start=${coordsOrigem[0]},${coordsOrigem[1]}&end=${coordsDestino[0]},${coordsDestino[1]}`;

    const routingResponse = await fetch(routingUrl);
    const routingData = await routingResponse.json();

    if (!routingData.routes || routingData.routes.length === 0) {
      return res.status(400).json({ erro: 'Nenhuma rota encontrada' });
    }

    // Pegar a primeira rota (melhor)
    const rota = routingData.routes[0];
    const distanciaMetros = rota.summary.distance;
    const distanciaKm = Math.round(distanciaMetros / 1000 * 100) / 100;
    const duracaoSegundos = rota.summary.duration;
    const duracaoHoras = Math.floor(duracaoSegundos / 3600);
    const duracaoMinutos = Math.floor((duracaoSegundos % 3600) / 60);

    console.log(`📍 Rota calculada: ${distanciaKm} km, ${duracaoHoras}h${duracaoMinutos}m`);

    // PASSO 4: Retornar resultado
    return res.status(200).json({
      sucesso: true,
      origem: origem,
      destino: destino,
      distancia: distanciaKm,
      distanciaMetros: distanciaMetros,
      duracao: `${duracaoHoras}h${duracaoMinutos}m`,
      duracaoSegundos: duracaoSegundos,
      coordsOrigem: {
        latitude: coordsOrigem[1],
        longitude: coordsOrigem[0]
      },
      coordsDestino: {
        latitude: coordsDestino[1],
        longitude: coordsDestino[0]
      }
    });

  } catch (erro) {
    console.error('❌ Erro ao calcular rota:', erro);
    return res.status(500).json({ 
      erro: 'Erro ao calcular rota',
      detalhes: erro.message 
    });
  }
}
