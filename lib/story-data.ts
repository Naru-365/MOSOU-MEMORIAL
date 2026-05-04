import type { StoryChapter, StoryScene } from './types';

// {lover} と {interrupter} は描画時にキャラクター名で置換される

export const storyChapters: StoryChapter[] = [
  {
    id: 'chapter-1',
    number: 1,
    title: '出会い',
    subtitle: '放課後の音楽室で',
    requiredAffinity: 0,
  },
  {
    id: 'chapter-2',
    number: 2,
    title: 'ハーモニー',
    subtitle: 'ふたりの音楽',
    requiredAffinity: 0,
  },
  {
    id: 'chapter-3',
    number: 3,
    title: 'すれ違い',
    subtitle: '誤解と本音',
    requiredAffinity: 10,
  },
  {
    id: 'chapter-4',
    number: 4,
    title: '告白',
    subtitle: '夕暮れの屋上で',
    requiredAffinity: 20,
  },
];

export const storyScenes: Record<string, StoryScene[]> = {
  'chapter-1': [
    {
      id: 'c1-s1',
      type: 'narration',
      text: '放課後の校舎。廊下の奥から、ギターの音が聞こえてくる。',
    },
    {
      id: 'c1-s2',
      type: 'narration',
      text: '軽音楽部の部室——そこが、ぼくの新しい居場所になるはずだった。',
    },
    {
      id: 'c1-s3',
      type: 'narration',
      text: 'ドアを開けると、窓際で一人、ギターをつま弾く女の子と目が合った。',
    },
    {
      id: 'c1-s4',
      type: 'dialogue',
      speaker: 'lover',
      text: 'あ……もしかして、新入部員の子？',
    },
    {
      id: 'c1-s5',
      type: 'dialogue',
      speaker: 'player',
      text: 'はい。今日からよろしくお願いします。',
    },
    {
      id: 'c1-s6',
      type: 'dialogue',
      speaker: 'lover',
      text: 'よかった、待ってたよ。わたし、{lover}。ここの部長なんだ。よろしくね。',
    },
    {
      id: 'c1-s7',
      type: 'narration',
      text: '彼女は笑顔で立ち上がり、手を差し出してきた。',
    },
    {
      id: 'c1-s8',
      type: 'choice',
      text: '{lover}が手を差し出している。どうする？',
      choices: [
        {
          label: '笑顔で握手する',
          affinityChange: 10,
          response: '「やっぱりいい人だ」と{lover}は嬉しそうに微笑んだ。',
        },
        {
          label: '普通に握手する',
          affinityChange: 3,
          response: '「よろしくね」と{lover}は言った。',
        },
        {
          label: '緊張して固まる',
          affinityChange: 0,
          response: '「緊張してる？大丈夫だよ、みんな優しいから」と{lover}は笑った。',
        },
      ],
    },
    {
      id: 'c1-s9',
      type: 'narration',
      text: 'そのとき、勢いよくドアが開いた。',
    },
    {
      id: 'c1-s10',
      type: 'dialogue',
      speaker: 'interrupter',
      text: '{lover}ちゃん！新入部員ってこの人？……ふーん。',
    },
    {
      id: 'c1-s11',
      type: 'dialogue',
      speaker: 'lover',
      text: 'あ、{interrupter}。そう、今日から入ってもらうんだ。仲良くしてあげてね。',
    },
    {
      id: 'c1-s12',
      type: 'dialogue',
      speaker: 'interrupter',
      text: '……邪魔さえしなければいいけど。{lover}ちゃんは私が守るから。',
    },
    {
      id: 'c1-s13',
      type: 'narration',
      text: '{interrupter}は鋭い視線をこちらに向けたあと、{lover}の隣に陣取った。',
    },
    {
      id: 'c1-s14',
      type: 'narration',
      text: '放課後の音楽室。ここから、ぼくの青春が始まる——そんな予感がした。',
    },
  ],

  'chapter-2': [
    {
      id: 'c2-s1',
      type: 'narration',
      text: '部活が始まって一週間。{lover}はいつもぼくのことを気にかけてくれていた。',
    },
    {
      id: 'c2-s2',
      type: 'dialogue',
      speaker: 'lover',
      text: 'コード、覚えてきた？最初は難しいよね。一緒に練習しようか。',
    },
    {
      id: 'c2-s3',
      type: 'narration',
      text: '{lover}はぼくの隣に座り、ギターのフォームを丁寧に教えてくれた。',
    },
    {
      id: 'c2-s4',
      type: 'narration',
      text: '彼女の指がぼくの手に触れた瞬間、心拍数が跳ね上がった。',
    },
    {
      id: 'c2-s5',
      type: 'dialogue',
      speaker: 'lover',
      text: 'こうやって押さえると……ほら、綺麗に鳴るでしょ？',
    },
    {
      id: 'c2-s6',
      type: 'choice',
      text: '{lover}が顔を近づけて教えてくれている。どうする？',
      choices: [
        {
          label: '「{lover}さんのおかげで弾けた！ありがとう」と言う',
          affinityChange: 10,
          response: '「えへへ、もっと上手くなろうね」と{lover}は照れながら笑った。',
        },
        {
          label: 'ドキドキしながらも練習に集中する',
          affinityChange: 5,
          response: '「集中してるね、いいね」と{lover}が褒めてくれた。',
        },
        {
          label: '思わず顔を赤くして目を逸らす',
          affinityChange: 3,
          response: '「あれ、顔赤い？風邪？」と{lover}が心配そうに覗き込んできた。',
        },
      ],
    },
    {
      id: 'c2-s7',
      type: 'narration',
      text: 'そのとき、部室の隅からじっとこちらを見ている視線に気づいた。',
    },
    {
      id: 'c2-s8',
      type: 'dialogue',
      speaker: 'interrupter',
      text: '……ねえ{lover}ちゃん、わたしとも練習しよ？最近ずっとあの人ばっかり。',
    },
    {
      id: 'c2-s9',
      type: 'dialogue',
      speaker: 'lover',
      text: 'ごめんね{interrupter}、新入りだから少し手がかかるの。あとでね。',
    },
    {
      id: 'c2-s10',
      type: 'dialogue',
      speaker: 'interrupter',
      text: '……わかった。でも、{lover}ちゃんを困らせたら許さないから。',
    },
    {
      id: 'c2-s11',
      type: 'narration',
      text: '他の部員たちが帰り、気づけば部室には{lover}とぼくだけになっていた。',
    },
    {
      id: 'c2-s12',
      type: 'dialogue',
      speaker: 'lover',
      text: 'もう遅くなっちゃったね。……でも今日は楽しかったな。',
    },
    {
      id: 'c2-s13',
      type: 'narration',
      text: '夕日が差し込む音楽室で、{lover}はギターを静かに弾き始めた。その旋律は、どこか懐かしくて、温かかった。',
    },
  ],

  'chapter-3': [
    {
      id: 'c3-s1',
      type: 'narration',
      text: '翌日、{lover}がぼくを見ようとしない。何かあったのだろうか。',
    },
    {
      id: 'c3-s2',
      type: 'dialogue',
      speaker: 'lover',
      text: '……ごめん、今日は少し忙しいから。練習、一人でやっておいて。',
    },
    {
      id: 'c3-s3',
      type: 'narration',
      text: 'いつもと違う{lover}。ぼくは不安になって、{interrupter}に声をかけた。',
    },
    {
      id: 'c3-s4',
      type: 'dialogue',
      speaker: 'interrupter',
      text: 'あなたが{lover}ちゃんに余計なことを言ったせいで傷ついてるんだから。昨日、{lover}ちゃんが泣いてたの、知ってる？',
    },
    {
      id: 'c3-s5',
      type: 'narration',
      text: '心当たりがない。でも、{lover}が泣いていたなんて——',
    },
    {
      id: 'c3-s6',
      type: 'choice',
      text: 'どうする？',
      choices: [
        {
          label: '{lover}に直接話しかけて真意を聞く',
          affinityChange: 15,
          response: '勇気を出して声をかけた。「ちゃんと話したい」——その言葉に、{lover}の表情が少し和らいだ。',
        },
        {
          label: '原因を考えながらそっとしておく',
          affinityChange: 5,
          response: 'しばらく距離を置いたが、「話しかけてくれたらよかったのに」と{lover}に後で言われた。',
        },
        {
          label: '{interrupter}の言葉を信じて謝罪する',
          affinityChange: -5,
          response: '「何に謝ってるの？」と{lover}は困惑した。誤解だったようだ。',
        },
      ],
    },
    {
      id: 'c3-s7',
      type: 'narration',
      text: '放課後、ぼくは{lover}を呼び止めた。',
    },
    {
      id: 'c3-s8',
      type: 'dialogue',
      speaker: 'player',
      text: '……ちゃんと話せる？何か、ぼくが悪かったなら謝りたい。',
    },
    {
      id: 'c3-s9',
      type: 'dialogue',
      speaker: 'lover',
      text: '……違うの。あなたのせいじゃない。ただ、{interrupter}に「あなたはきっと他の子が好きなんだ」って言われて、信じてしまって。',
    },
    {
      id: 'c3-s10',
      type: 'dialogue',
      speaker: 'player',
      text: 'そんなことない。ぼくは——{lover}さんのことが好きだから、部活に来てるんだ。',
    },
    {
      id: 'c3-s11',
      type: 'dialogue',
      speaker: 'lover',
      text: '……え。',
    },
    {
      id: 'c3-s12',
      type: 'narration',
      text: '夕暮れの廊下。{lover}の目に涙が浮かんで、それからふわりと笑った。',
    },
    {
      id: 'c3-s13',
      type: 'dialogue',
      speaker: 'lover',
      text: 'ばか……そんなこと言うから、もっと困ってしまうじゃない。',
    },
  ],

  'chapter-4': [
    {
      id: 'c4-s1',
      type: 'narration',
      text: '学園祭当日。軽音楽部の演奏は、体育館のステージで行われることになった。',
    },
    {
      id: 'c4-s2',
      type: 'dialogue',
      speaker: 'lover',
      text: '緊張してる？大丈夫、一緒に演奏すれば怖くないよ。',
    },
    {
      id: 'c4-s3',
      type: 'narration',
      text: 'ステージの袖で、{lover}がぼくの手をそっと握った。',
    },
    {
      id: 'c4-s4',
      type: 'narration',
      text: '演奏は完璧だった。客席から大きな拍手が響いた。{lover}とアイコンタクトを交わしながら、ぼくたちは笑った。',
    },
    {
      id: 'c4-s5',
      type: 'narration',
      text: '演奏後、ぼくは{lover}を屋上へ誘った。夕陽が空を橙色に染めていた。',
    },
    {
      id: 'c4-s6',
      type: 'dialogue',
      speaker: 'lover',
      text: 'わあ……きれいだね。こんな景色、初めて見た。',
    },
    {
      id: 'c4-s7',
      type: 'narration',
      text: 'そのとき、屋上のドアが勢いよく開いた。',
    },
    {
      id: 'c4-s8',
      type: 'dialogue',
      speaker: 'interrupter',
      text: '待って！{lover}ちゃん、こんなところで二人きりで何してるの！？わたしも来る！',
    },
    {
      id: 'c4-s9',
      type: 'choice',
      text: '{interrupter}が邪魔をしにきた。どうする？',
      choices: [
        {
          label: '「少しだけ待ってて」と優しく{interrupter}を止める',
          affinityChange: 10,
          response: '「……わかった。5分だけね」と{interrupter}は渋々引き下がった。{lover}がそっとこちらを見た。',
        },
        {
          label: '「今だけふたりにさせてほしい」とはっきり伝える',
          affinityChange: 15,
          response: '「……ちゃんと言えるんだ」と{lover}が驚いたように笑った。{interrupter}は黙って扉の前で待つことにした。',
        },
        {
          label: '引き下がって三人で夕日を見る',
          affinityChange: -5,
          response: '{interrupter}は満足そうだったが、{lover}は少し寂しそうだった。',
        },
      ],
    },
    {
      id: 'c4-s10',
      type: 'narration',
      text: '{lover}の隣に立って、ふたりで空を見上げた。',
    },
    {
      id: 'c4-s11',
      type: 'dialogue',
      speaker: 'player',
      text: '……{lover}さん。好きです。付き合ってください。',
    },
    {
      id: 'c4-s12',
      type: 'narration',
      text: '長い沈黙。夕風が{lover}の髪を揺らした。',
    },
    {
      id: 'c4-s13',
      type: 'dialogue',
      speaker: 'lover',
      text: '……わたしも。ずっと、好きだった。',
    },
    {
      id: 'c4-s14',
      type: 'narration',
      text: '夕陽の中で、{lover}が微笑んだ。遠くから{interrupter}の「えー！？」という叫び声が聞こえたが、今はどうでもよかった。',
    },
    {
      id: 'c4-s15',
      type: 'narration',
      text: 'ぼくたちの放課後は、これからも続いていく。',
    },
  ],
};
