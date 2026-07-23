const estados = [
  { id: 11, sigla: "RO", nome: "Rondônia", regiao: "N" },
  { id: 12, sigla: "AC", nome: "Acre", regiao: "N" },
  { id: 13, sigla: "AM", nome: "Amazonas", regiao: "N" },
  { id: 14, sigla: "RR", nome: "Roraima", regiao: "N" },
  { id: 15, sigla: "PA", nome: "Pará", regiao: "N" },
  { id: 16, sigla: "AP", nome: "Amapá", regiao: "N" },
  { id: 17, sigla: "TO", nome: "Tocantins", regiao: "N" },
  { id: 21, sigla: "MA", nome: "Maranhão", regiao: "NE" },
  { id: 22, sigla: "PI", nome: "Piauí", regiao: "NE" },
  { id: 23, sigla: "CE", nome: "Ceará", regiao: "NE" },
  { id: 24, sigla: "RN", nome: "Rio Grande do Norte", regiao: "NE" },
  { id: 25, sigla: "PB", nome: "Paraíba", regiao: "NE" },
  { id: 26, sigla: "PE", nome: "Pernambuco", regiao: "NE" },
  { id: 27, sigla: "AL", nome: "Alagoas", regiao: "NE" },
  { id: 28, sigla: "SE", nome: "Sergipe", regiao: "NE" },
  { id: 29, sigla: "BA", nome: "Bahia", regiao: "NE" },
  { id: 31, sigla: "MG", nome: "Minas Gerais", regiao: "SE" },
  { id: 32, sigla: "ES", nome: "Espírito Santo", regiao: "SE" },
  { id: 33, sigla: "RJ", nome: "Rio de Janeiro", regiao: "SE" },
  { id: 35, sigla: "SP", nome: "São Paulo", regiao: "SE" },
  { id: 41, sigla: "PR", nome: "Paraná", regiao: "S" },
  { id: 42, sigla: "SC", nome: "Santa Catarina", regiao: "S" },
  { id: 43, sigla: "RS", nome: "Rio Grande do Sul", regiao: "S" },
  { id: 50, sigla: "MS", nome: "Mato Grosso do Sul", regiao: "CO" },
  { id: 51, sigla: "MT", nome: "Mato Grosso", regiao: "CO" },
  { id: 52, sigla: "GO", nome: "Goiás", regiao: "CO" },
  { id: 53, sigla: "DF", nome: "Distrito Federal", regiao: "CO" },
];

const regiaoColors = {
  N: "#2e7d32",
  NE: "#c62828",
  CO: "#f9a825",
  SE: "#1565c0",
  S: "#6a1b9a",
};

const regiaoLabels = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

export { estados, regiaoColors, regiaoLabels };
