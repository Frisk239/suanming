// src/config/cities.ts
// 中国主要城市经纬度表（省/直辖市 → 市 → 经纬度），用于 BirthForm 省市级联下拉。
//
// 数据来源：公开地理坐标（国家标准 GB/T 2260 行政区 + 各市政府驻地标定）。
// 覆盖 bazi-core cityCache 支持的中国主要城市（约 90+），选城市后自动带经纬度，
// 绕过 bazi-core cityCache 查找，真太阳时校正稳定可靠。
//
// 经度东经、纬度北纬，保留 2 位小数。新增城市直接往对应省数组加即可。

export interface CityCoord {
  /** 城市名（如「北京」「上海」「漳州」） */
  name: string;
  /** 东经 °E */
  lng: number;
  /** 北纬 °N */
  lat: number;
}

/** 省/直辖市 → 下辖市列表 */
export const CITIES: Record<string, CityCoord[]> = {
  直辖市: [
    { name: '北京', lng: 116.41, lat: 39.9 },
    { name: '天津', lng: 117.2, lat: 39.13 },
    { name: '上海', lng: 121.47, lat: 31.23 },
    { name: '重庆', lng: 106.55, lat: 29.56 },
  ],
  河北: [
    { name: '石家庄', lng: 114.51, lat: 38.04 },
    { name: '唐山', lng: 118.18, lat: 39.63 },
    { name: '保定', lng: 115.47, lat: 38.87 },
    { name: '邯郸', lng: 114.54, lat: 36.62 },
    { name: '秦皇岛', lng: 119.6, lat: 39.93 },
    { name: '张家口', lng: 114.88, lat: 40.82 },
    { name: '承德', lng: 117.94, lat: 40.99 },
    { name: '廊坊', lng: 116.68, lat: 39.54 },
    { name: '沧州', lng: 116.84, lat: 38.31 },
    { name: '衡水', lng: 115.67, lat: 37.73 },
    { name: '邢台', lng: 114.5, lat: 37.07 },
  ],
  山西: [
    { name: '太原', lng: 112.55, lat: 37.87 },
    { name: '大同', lng: 113.3, lat: 40.08 },
    { name: '临汾', lng: 111.52, lat: 36.08 },
    { name: '运城', lng: 111.01, lat: 35.03 },
    { name: '长治', lng: 113.12, lat: 36.2 },
    { name: '阳泉', lng: 113.58, lat: 37.86 },
  ],
  内蒙古: [
    { name: '呼和浩特', lng: 111.75, lat: 40.84 },
    { name: '包头', lng: 109.84, lat: 40.66 },
    { name: '赤峰', lng: 118.89, lat: 42.26 },
    { name: '鄂尔多斯', lng: 109.99, lat: 39.82 },
  ],
  辽宁: [
    { name: '沈阳', lng: 123.43, lat: 41.81 },
    { name: '大连', lng: 121.61, lat: 38.91 },
    { name: '鞍山', lng: 122.99, lat: 41.11 },
    { name: '抚顺', lng: 123.96, lat: 41.88 },
    { name: '锦州', lng: 121.13, lat: 41.1 },
  ],
  吉林: [
    { name: '长春', lng: 125.32, lat: 43.82 },
    { name: '吉林', lng: 126.55, lat: 43.84 },
    { name: '延吉', lng: 129.51, lat: 42.91 },
  ],
  黑龙江: [
    { name: '哈尔滨', lng: 126.64, lat: 45.75 },
    { name: '齐齐哈尔', lng: 123.95, lat: 47.35 },
    { name: '大庆', lng: 125.1, lat: 46.59 },
    { name: '牡丹江', lng: 129.63, lat: 44.55 },
  ],
  江苏: [
    { name: '南京', lng: 118.78, lat: 32.07 },
    { name: '苏州', lng: 120.62, lat: 31.3 },
    { name: '无锡', lng: 120.3, lat: 31.57 },
    { name: '常州', lng: 119.97, lat: 31.78 },
    { name: '徐州', lng: 117.28, lat: 34.21 },
    { name: '南通', lng: 120.86, lat: 32.01 },
    { name: '扬州', lng: 119.42, lat: 32.39 },
    { name: '盐城', lng: 120.16, lat: 33.35 },
    { name: '连云港', lng: 119.22, lat: 34.6 },
  ],
  浙江: [
    { name: '杭州', lng: 120.16, lat: 30.27 },
    { name: '宁波', lng: 121.55, lat: 29.87 },
    { name: '温州', lng: 120.7, lat: 27.99 },
    { name: '绍兴', lng: 120.58, lat: 30.03 },
    { name: '嘉兴', lng: 120.75, lat: 30.75 },
    { name: '金华', lng: 119.65, lat: 29.09 },
    { name: '台州', lng: 121.42, lat: 28.66 },
  ],
  安徽: [
    { name: '合肥', lng: 117.27, lat: 31.86 },
    { name: '芜湖', lng: 118.38, lat: 31.33 },
    { name: '蚌埠', lng: 117.36, lat: 32.92 },
    { name: '黄山', lng: 118.31, lat: 29.73 },
  ],
  福建: [
    { name: '福州', lng: 119.3, lat: 26.08 },
    { name: '厦门', lng: 118.09, lat: 24.48 },
    { name: '泉州', lng: 118.67, lat: 24.88 },
    { name: '漳州', lng: 117.65, lat: 24.51 },
    { name: '莆田', lng: 119.0, lat: 25.43 },
    { name: '宁德', lng: 119.53, lat: 26.66 },
    { name: '龙岩', lng: 117.01, lat: 25.1 },
    { name: '三明', lng: 117.64, lat: 26.27 },
  ],
  江西: [
    { name: '南昌', lng: 115.86, lat: 28.68 },
    { name: '九江', lng: 116.0, lat: 29.71 },
    { name: '赣州', lng: 114.93, lat: 25.83 },
    { name: '景德镇', lng: 117.18, lat: 29.27 },
  ],
  山东: [
    { name: '济南', lng: 117.0, lat: 36.65 },
    { name: '青岛', lng: 120.38, lat: 36.07 },
    { name: '烟台', lng: 121.39, lat: 37.54 },
    { name: '潍坊', lng: 119.16, lat: 36.7 },
    { name: '临沂', lng: 118.35, lat: 35.05 },
    { name: '淄博', lng: 118.05, lat: 36.79 },
    { name: '威海', lng: 122.12, lat: 37.51 },
    { name: '日照', lng: 119.53, lat: 35.42 },
  ],
  河南: [
    { name: '郑州', lng: 113.62, lat: 34.75 },
    { name: '洛阳', lng: 112.45, lat: 34.62 },
    { name: '开封', lng: 114.3, lat: 34.8 },
    { name: '南阳', lng: 112.53, lat: 32.99 },
    { name: '安阳', lng: 114.4, lat: 36.1 },
  ],
  湖北: [
    { name: '武汉', lng: 114.31, lat: 30.6 },
    { name: '宜昌', lng: 111.28, lat: 30.69 },
    { name: '襄阳', lng: 112.14, lat: 32.04 },
    { name: '荆州', lng: 112.24, lat: 30.33 },
  ],
  湖南: [
    { name: '长沙', lng: 112.94, lat: 28.23 },
    { name: '株洲', lng: 113.13, lat: 27.83 },
    { name: '湘潭', lng: 112.94, lat: 27.83 },
    { name: '衡阳', lng: 112.57, lat: 26.89 },
    { name: '岳阳', lng: 113.13, lat: 29.36 },
    { name: '常德', lng: 111.69, lat: 29.04 },
  ],
  广东: [
    { name: '广州', lng: 113.27, lat: 23.13 },
    { name: '深圳', lng: 114.06, lat: 22.55 },
    { name: '珠海', lng: 113.58, lat: 22.27 },
    { name: '佛山', lng: 113.12, lat: 23.02 },
    { name: '东莞', lng: 113.74, lat: 23.05 },
    { name: '中山', lng: 113.38, lat: 22.52 },
    { name: '惠州', lng: 114.41, lat: 23.11 },
    { name: '汕头', lng: 116.68, lat: 23.35 },
    { name: '湛江', lng: 110.36, lat: 21.27 },
    { name: '茂名', lng: 110.93, lat: 21.66 },
    { name: '江门', lng: 113.08, lat: 22.58 },
  ],
  广西: [
    { name: '南宁', lng: 108.37, lat: 22.82 },
    { name: '柳州', lng: 109.43, lat: 24.33 },
    { name: '桂林', lng: 110.3, lat: 25.27 },
    { name: '北海', lng: 109.12, lat: 21.48 },
  ],
  海南: [
    { name: '海口', lng: 110.2, lat: 20.04 },
    { name: '三亚', lng: 109.5, lat: 18.25 },
  ],
  四川: [
    { name: '成都', lng: 104.07, lat: 30.67 },
    { name: '绵阳', lng: 104.74, lat: 31.46 },
    { name: '自贡', lng: 104.78, lat: 29.35 },
    { name: '南充', lng: 106.11, lat: 30.84 },
    { name: '宜宾', lng: 104.64, lat: 28.75 },
    { name: '乐山', lng: 103.77, lat: 29.55 },
  ],
  贵州: [
    { name: '贵阳', lng: 106.63, lat: 26.65 },
    { name: '遵义', lng: 106.91, lat: 27.7 },
    { name: '六盘水', lng: 104.83, lat: 26.6 },
  ],
  云南: [
    { name: '昆明', lng: 102.83, lat: 24.88 },
    { name: '曲靖', lng: 103.8, lat: 25.5 },
    { name: '大理', lng: 100.24, lat: 25.6 },
    { name: '丽江', lng: 100.23, lat: 26.86 },
  ],
  西藏: [
    { name: '拉萨', lng: 91.13, lat: 29.65 },
    { name: '日喀则', lng: 88.88, lat: 29.27 },
  ],
  陕西: [
    { name: '西安', lng: 108.94, lat: 34.34 },
    { name: '宝鸡', lng: 107.24, lat: 34.36 },
    { name: '咸阳', lng: 108.71, lat: 34.33 },
    { name: '延安', lng: 109.49, lat: 36.6 },
  ],
  甘肃: [
    { name: '兰州', lng: 103.84, lat: 36.06 },
    { name: '天水', lng: 105.72, lat: 34.58 },
    { name: '酒泉', lng: 98.49, lat: 39.73 },
  ],
  青海: [{ name: '西宁', lng: 101.78, lat: 36.62 }],
  宁夏: [
    { name: '银川', lng: 106.23, lat: 38.49 },
    { name: '石嘴山', lng: 106.38, lat: 39.02 },
  ],
  新疆: [
    { name: '乌鲁木齐', lng: 87.62, lat: 43.83 },
    { name: '喀什', lng: 75.99, lat: 39.47 },
    { name: '伊宁', lng: 81.32, lat: 43.92 },
  ],
  香港: [{ name: '香港', lng: 114.17, lat: 22.32 }],
  澳门: [{ name: '澳门', lng: 113.55, lat: 22.2 }],
  台湾: [
    { name: '台北', lng: 121.55, lat: 25.03 },
    { name: '高雄', lng: 120.3, lat: 22.62 },
    { name: '台中', lng: 120.67, lat: 24.15 },
  ],
};

/** 省份列表（下拉第一级用） */
export const PROVINCES = Object.keys(CITIES);

/** 按城市名查经纬度（跨省查，选不到返回 undefined） */
export function findCity(name: string): CityCoord | undefined {
  for (const province of PROVINCES) {
    const found = CITIES[province].find((c) => c.name === name);
    if (found) return found;
  }
  return undefined;
}
