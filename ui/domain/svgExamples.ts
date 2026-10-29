import digital from '../examples/speed-digital.svg?raw';
import capsule from '../examples/speed-capsule.svg?raw';
import elevation from '../examples/elevation-profile.svg?raw';
import coordinates from '../examples/coordinates-bracket.svg?raw';
import compass from '../examples/minecraft-compass.svg?raw';
import gauge from '../examples/speed-gauge.svg?raw';
import bar from '../examples/speed-bar.svg?raw';
import ring from '../examples/journey-ring.svg?raw';
export const SVG_EXAMPLES = [
  { key: 'digital', category: 'motion', label: '数字时速', source: digital, width: 0.2 },
  { key: 'capsule', category: 'motion', label: '胶囊时速', source: capsule, width: 0.25 },
  { key: 'elevation', category: 'motion', label: '山形海拔', source: elevation, width: 0.25 },
  { key: 'coordinatesBracket', category: 'navigation', label: '方括号经纬度', source: coordinates, width: 0.3 },
  { key: 'minecraftCompass', category: 'navigation', label: 'Minecraft 指南针', source: compass, width: 0.1 },
  { key: 'gauge', category: 'motion', label: '指针时速表', source: gauge, width: 0.22 },
  { key: 'bar', category: 'motion', label: '速度进度条', source: bar, width: 0.28 },
  { key: 'ring', category: 'journey', label: '行程进度环', source: ring, width: 0.18 },
];
