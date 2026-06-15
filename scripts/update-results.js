// update-results.js — Robô de resultados Copa 2026
// Roda via GitHub Actions a cada 30 min
// Deps: nenhuma (Node 20 fetch nativo)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role — bypassa RLS
const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY;

// Mapeamento: nome em espanhol (DB) → nome em inglês (football-data.org)
const ES_TO_EN = {
  'Alemania': 'Germany',
  'Arabia Saudita': 'Saudi Arabia',
  'Argelia': 'Algeria',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Bélgica': 'Belgium',
  'Bolivia': 'Bolivia',
  'Bosnia y Herzegovina': 'Bosnia and Herzegovina',
  'Brasil': 'Brazil',
  'Cabo Verde': 'Cape Verde',
  'Camerún': 'Cameroon',
  'Canadá': 'Canada',
  'Catar': 'Qatar',
  'Chile': 'Chile',
  'China': 'China',
  'Colombia': 'Colombia',
  'Corea del Norte': 'Korea DPR',
  'Corea del Sur': 'Korea Republic',
  'Costa de Marfil': "Côte d'Ivoire",
  'Costa Rica': 'Costa Rica',
  'Croacia': 'Croatia',
  'Curazao': 'Curaçao',
  'Dinamarca': 'Denmark',
  'Ecuador': 'Ecuador',
  'Egipto': 'Egypt',
  'Escocia': 'Scotland',
  'España': 'Spain',
  'Estados Unidos': 'USA',
  'Filipinas': 'Philippines',
  'Francia': 'France',
  'Gales': 'Wales',
  'Ghana': 'Ghana',
  'Grecia': 'Greece',
  'Guatemala': 'Guatemala',
  'Haití': 'Haiti',
  'Holanda': 'Netherlands',
  'Honduras': 'Honduras',
  'Indonesia': 'Indonesia',
  'Inglaterra': 'England',
  'Irak': 'Iraq',
  'Irán': 'Iran',
  'Irlanda': 'Republic of Ireland',
  'Israel': 'Israel',
  'Italia': 'Italy',
  'Jamaica': 'Jamaica',
  'Japón': 'Japan',
  'Jordania': 'Jordan',
  'Kazajistán': 'Kazakhstan',
  'Kenia': 'Kenya',
  'Marruecos': 'Morocco',
  'México': 'Mexico',
  'Nigeria': 'Nigeria',
  'Noruega': 'Norway',
  'Nueva Zelanda': 'New Zealand',
  'Panamá': 'Panama',
  'Paraguay': 'Paraguay',
  'Perú': 'Peru',
  'Polonia': 'Poland',
  'Portugal': 'Portugal',
  'RD Congo': 'DR Congo',
  'República Checa': 'Czechia',
  'Rumania': 'Romania',
  'Rusia': 'Russia',
  'Senegal': 'Senegal',
  'Serbia': 'Serbia',
  'Siria': 'Syria',
  'Sudáfrica': 'South Africa',
  'Suecia': 'Sweden',
  'Suiza': 'Switzerland',
  'Trinidad y Tobago': 'Trinidad and Tobago',
  'Túnez': 'Tunisia',
  'Turquía': 'Türkiye',
  'Ucrania': 'Ukraine',
  'Uganda': 'Uganda',
  'Uruguay': 'Uruguay',
  'Uzbekistán': 'Uzbekistan',
  'Venezuela': 'Venezuela',
  'Vietnam': 'Vietnam',
};

// ── Helpers Supabase ──────────────────────────────────────────────────────────

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbPatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${path} → ${r.status} ${await r.text()}`);
}

async function sbPost(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status} ${await r.text()}`);
}

// ── Pontuação ─────────────────────────────────────────────────────────────────

function calcularPontos(pa, pb, ra, rb) {
  if (pa === ra && pb === rb) return 12;
  const resP = Math.sign(pa - pb);
  const resR = Math.sign(ra - rb);
  if (resP !== resR) {
    if (pa === ra || pb === rb) return 3;
    return 0;
  }
  if (pa === ra || pb === rb) return 9;
  return 6;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🤖 Robô iniciado —', new Date().toISOString());

  // 1. Busca jogos pendentes no DB (não finalizados, data já passou)
  const agora = new Date().toISOString();
  const jogos = await sbGet(
    `jogos?select=id,time_a,time_b,data_hora,gols_a,gols_b,finalizado&schema=app_bolao&finalizado=is.false&data_hora=lt.${agora}&ativo=eq.true`
  );

  if (!jogos.length) {
    console.log('✅ Nenhum jogo pendente.');
    return;
  }
  console.log(`📋 ${jogos.length} jogo(s) pendente(s).`);

  // 2. Busca resultados na football-data.org (Copa 2026 = competição WC, temporada 2026)
  const fdResp = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026&status=FINISHED',
    { headers: { 'X-Auth-Token': FOOTBALL_KEY } }
  );
  if (!fdResp.ok) {
    throw new Error(`football-data.org → ${fdResp.status} ${await fdResp.text()}`);
  }
  const fdData = await fdResp.json();
  const fdMatches = fdData.matches || [];
  console.log(`⚽ ${fdMatches.length} resultado(s) recebido(s) da API.`);

  // 3. Busca todos os perfis ativos (para recalcular pontos_total)
  const perfis = await sbGet(
    'perfis?select=id&schema=app_bolao&ativo=eq.true'
  );

  const agoraIso = new Date().toISOString();
  let processados = 0;

  for (const jogo of jogos) {
    const nomeA_en = ES_TO_EN[jogo.time_a];
    const nomeB_en = ES_TO_EN[jogo.time_b];
    if (!nomeA_en || !nomeB_en) {
      console.warn(`⚠️  Sem mapeamento: "${jogo.time_a}" ou "${jogo.time_b}" — pulando.`);
      continue;
    }

    // Procura jogo na API pelo nome dos times (data já foi checada no filtro do DB)
    const jogoDataStr = jogo.data_hora.slice(0, 10); // YYYY-MM-DD
    const match = fdMatches.find(m => {
      const mData = (m.utcDate || '').slice(0, 10);
      const homeOk = m.homeTeam?.name === nomeA_en || m.homeTeam?.shortName === nomeA_en;
      const awayOk = m.awayTeam?.name === nomeB_en || m.awayTeam?.shortName === nomeB_en;
      // Tolerância de ±1 dia para diferença de fuso
      const dataOk = Math.abs(new Date(mData) - new Date(jogoDataStr)) <= 86400000;
      return homeOk && awayOk && dataOk;
    });

    if (!match) {
      console.log(`⏳ Sem resultado ainda: ${jogo.time_a} x ${jogo.time_b} (${jogoDataStr})`);
      continue;
    }

    const gA = match.score?.fullTime?.home;
    const gB = match.score?.fullTime?.away;
    if (gA === null || gA === undefined || gB === null || gB === undefined) {
      console.log(`⏳ Placar nulo ainda: ${jogo.time_a} x ${jogo.time_b}`);
      continue;
    }

    console.log(`✅ Resultado: ${jogo.time_a} ${gA}×${gB} ${jogo.time_b}`);

    // 4. Atualiza jogo no DB
    await sbPatch(
      `jogos?id=eq.${jogo.id}&schema=app_bolao`,
      { gols_a: gA, gols_b: gB, finalizado: true, atualizado_em: agoraIso }
    );

    // 5. Busca palpites deste jogo
    const palpites = await sbGet(
      `palpites?select=id,usuario_id,palpite_a,palpite_b&schema=app_bolao&jogo_id=eq.${jogo.id}&ativo=eq.true`
    );
    const palpiteMap = {};
    palpites.forEach(p => { palpiteMap[p.usuario_id] = p; });

    // 6. Calcula e salva pontos para cada participante
    for (const perfil of perfis) {
      const p = palpiteMap[perfil.id];
      if (p) {
        const pts = calcularPontos(p.palpite_a, p.palpite_b, gA, gB);
        await sbPatch(
          `palpites?id=eq.${p.id}&schema=app_bolao`,
          { pontos: pts, atualizado_em: agoraIso }
        );
      } else {
        // Participante não palpitou → insere 0×0 com 0 pts
        const pts = calcularPontos(0, 0, gA, gB);
        await sbPost('palpites?schema=app_bolao', {
          usuario_id: perfil.id,
          jogo_id: jogo.id,
          palpite_a: 0,
          palpite_b: 0,
          pontos: pts,
          criado_em: agoraIso,
          atualizado_em: agoraIso,
          ativo: true,
        });
      }
    }

    processados++;
  }

  if (processados === 0) {
    console.log('✅ Nenhum resultado novo encontrado.');
    return;
  }

  // 7. Recalcula pontos_total de todos os participantes
  console.log('🔢 Recalculando pontos_total...');
  const todosPalpites = await sbGet(
    'palpites?select=usuario_id,pontos&schema=app_bolao&ativo=eq.true'
  );
  const totais = {};
  todosPalpites.forEach(p => {
    totais[p.usuario_id] = (totais[p.usuario_id] || 0) + (p.pontos || 0);
  });

  for (const [uid, total] of Object.entries(totais)) {
    await sbPatch(
      `perfis?id=eq.${uid}&schema=app_bolao`,
      { pontos_total: total, atualizado_em: agoraIso }
    );
  }

  console.log(`🏆 Concluído — ${processados} jogo(s) processado(s).`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
