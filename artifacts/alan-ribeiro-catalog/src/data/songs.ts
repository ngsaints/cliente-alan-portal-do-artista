export interface Song {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
}

export const catalogSongs: Song[] = [
  {
    id: "1",
    title: "Na Hora",
    description: "A espera acabou! Alan Ribeiro lança agora 'Na Hora', uma música que vai te fazer sentir cada emoção do primeiro acorde até o último refrão.",
    link: "https://youtube.com/@alanribeirooficial?si=BX65PC2ZmsNTyY3P",
    image: "cover-nahora.png",
  },
  {
    id: "2",
    title: "Um Abraço",
    description: "Segundo Turma do STF dos Fãs mantém Alan Ribeiro com 'Um Abraço', uma das composições mais emocionantes e viciantes do cenário musical atual.",
    link: "https://youtube.com/@alanribeirooficial?si=BX65PC2ZmsNTyY3P",
    image: "cover-umabraco.png",
  },
  {
    id: "3",
    title: "Outra Música",
    description: "Exemplo de terceira música para o catálogo, apenas para mostrar como adicionar mais itens. Descubra os novos sucessos e deixe a música te guiar.",
    link: "https://youtube.com/@alanribeirooficial?si=BX65PC2ZmsNTyY3P",
    image: "cover-outra.png",
  }
];
