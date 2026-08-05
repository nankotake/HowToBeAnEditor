// ===== 素材 / 滤镜 / 订单数据 =====

const MATERIALS = [
  { id: 'cat',     name: '猫咪跳舞',   emoji: '🐱', dur: 5, c1: '#ffe29a', c2: '#ffb86b', good: [1.2, 3.4], bad: [2.2], anomaly: [] },
  { id: 'food',    name: '吃播面条',   emoji: '🍜', dur: 6, c1: '#ffd8a8', c2: '#ffa07a', good: [1.8, 4.2], bad: [2.8], anomaly: [] },
  { id: 'wedding', name: '婚礼现场',   emoji: '💒', dur: 6, c1: '#ffc6d9', c2: '#ff9eb5', good: [1.5, 3.8], bad: [2.6, 5.2], anomaly: [] },
  { id: 'drive',   name: '飞车追逐',   emoji: '🚗', dur: 4, c1: '#bde0fe', c2: '#7ec8ff', good: [0.9, 2.7], bad: [1.8], anomaly: [] },
  { id: 'selfie',  name: '自拍大头',   emoji: '🤳', dur: 5, c1: '#d7c4ff', c2: '#b79cff', good: [1.0, 3.2], bad: [2.0], anomaly: [] },
  { id: 'dance',   name: '鬼畜舞步',   emoji: '🕺', dur: 4, c1: '#c7ffc7', c2: '#8fe38f', good: [0.8, 2.2], bad: [1.4], anomaly: [] },
  { id: 'rain',    name: '雨天街拍',   emoji: '🌧️', dur: 5, c1: '#cfe8ff', c2: '#9cc8ff', good: [1.4, 3.6], bad: [2.5], anomaly: [] },
  { id: 'cctv',    name: '监控录像',   emoji: '📹', dur: 7, c1: '#cfcfcf', c2: '#9a9a9a', good: [1.0, 4.6], bad: [3.0], anomaly: [3.2] },
  { id: 'ghost',   name: '灵异素材',   emoji: '👻', dur: 5, c1: '#c9c9e8', c2: '#8f8fd0', good: [1.2, 3.8], bad: [2.4], anomaly: [2.0] },
];

const FILTERS = {
  none:   { name: '原片', css: '' },
  japan:  { name: '日系', css: 'brightness(1.06) saturate(0.85) sepia(0.18) contrast(0.96)' },
  happy:  { name: '喜庆', css: 'saturate(1.45) hue-rotate(-12deg) brightness(1.05) contrast(1.03)' },
  cold:   { name: '冷调', css: 'saturate(1.05) hue-rotate(18deg) brightness(0.94) contrast(1.06)' },
  horror: { name: '恐怖', css: 'saturate(0.35) contrast(1.3) brightness(0.82)' },
};

const ORDERS = [
  {
    client: '婚礼哥', avatar: '💍', mood: '要唯美！',
    text: '把我老婆剪得唯美一点！素材里有几个眨眼丑镜头，必须剪干净。时长 6–10 秒，色调要喜庆！',
    range: [6, 10], color: 'happy', forbidBad: true,
    reply: ['满意！老婆说像偶像剧 🥹', '那两秒眨眼还在！重剪！！', '行了，凑合吧。', '绝了！下次还找你！']
  },
  {
    client: '美食博主', avatar: '🍜', mood: '要诱人！',
    text: '吃播剪得让人流口水！吃吐那两秒千万别留，日系一点，时长 8–12 秒。',
    range: [8, 12], color: 'japan', forbidBad: true,
    reply: ['评论区全在问店名，成了！', '……你把我吃吐剪进去了？？', '还行，就是不够馋。', '这个剪辑我能舔屏！']
  },
  {
    client: '秃头老板', avatar: '💼', mood: '要年轻！',
    text: '把我在台上剪得年轻 20 岁！素材是 2010 年的，喜庆点，时长 6–10 秒。',
    range: [6, 10], color: 'happy', forbidBad: false,
    reply: ['这才是我！年会重剪！', '我的发际线呢？？', '可以，很有精神。', '年轻人就该这样！']
  },
  {
    client: '鬼畜UP主', avatar: '🕺', mood: '越离谱越好！',
    text: '把我做成鬼畜！坏镜头全是好镜头！越疯越好，时长 5–9 秒。',
    range: [5, 9], color: 'none', forbidBad: false, chaos: true,
    reply: ['哈哈哈哈哈哈投币了！', '不够鬼畜，重来！', '笑死，我三连了。', '这波是精神污染，我喜欢。']
  },
  {
    client: '大学生小琳', avatar: '🎓', mood: '要文艺！',
    text: '期末作业：纪录片风格，素材全是宿舍自拍，别太正经。时长 7–11 秒，冷调一点有感觉。',
    range: [7, 11], color: 'cold', forbidBad: false,
    reply: ['老师给了 A-！谢谢剪辑侠！', '老师说我拍得像综艺……', '勉强能交。', '全班就我分数最高！']
  },
  {
    client: '神秘客户', avatar: '📹', mood: '素材有点怪……',
    text: '把监控里 3 点 15 分的人找出来。别剪丢了。时长 8–12 秒，冷一点。',
    range: [8, 12], color: 'horror', forbidBad: false, mystery: true,
    reply: ['你看到了，对吗。', '……很好。', '下次还找你。', '别告诉别人你看过。']
  },
];
