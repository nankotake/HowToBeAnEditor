// ===== 素材 / 滤镜 / 订单数据 =====

const MATERIALS = [
  { id: 'cat',     name: '猫咪跳舞',   emoji: '🐱', dur: 5, c1: '#ffe29a', c2: '#ffb86b', good: [1.2, 3.4], bad: [2.2], anomaly: [] },
  { id: 'wedding', name: '婚礼现场',   emoji: '💒', dur: 6, c1: '#ffc6d9', c2: '#ff9eb5', good: [1.5, 3.8], bad: [2.6, 5.2], anomaly: [] },
  { id: 'drive',   name: '飞车追逐',   emoji: '🚗', dur: 4, c1: '#bde0fe', c2: '#7ec8ff', good: [0.9, 2.7], bad: [1.8], anomaly: [] },
  { id: 'selfie',  name: '自拍大头',   emoji: '🤳', dur: 5, c1: '#d7c4ff', c2: '#b79cff', good: [1.0, 3.2], bad: [2.0], anomaly: [] },
  { id: 'dance',   name: '鬼畜舞步',   emoji: '🕺', dur: 4, c1: '#c7ffc7', c2: '#8fe38f', good: [0.8, 2.2], bad: [1.4], anomaly: [] },
  { id: 'cctv',    name: '监控录像',   emoji: '📹', dur: 7, c1: '#cfcfcf', c2: '#9a9a9a', good: [1.0, 4.6], bad: [3.0], anomaly: [3.2] },
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
];
