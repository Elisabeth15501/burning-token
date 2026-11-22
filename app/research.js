/* 调研常量表 — 完整论证与来源见 research.md，禁止在此填入无来源数字 */
window.BT_RESEARCH = {
  updated: '2026-11-21',
  disclaimer: '能量按 tokens × J/token × PUE 估算。J/token 无权威常数，结果为推理边际电耗量级参考，不含模型训练、硬件制造、终端与网络能耗。',

  energyPresets: [
    {id:'mlenergy-low', label:'ML.ENERGY 实测下限', short:'0.0284 J/token', j:0.0284, kind:'实测',
      note:'仅 GPU、vLLM、B200/H100、饱和 batch、能效最优点', src:'ML.ENERGY Leaderboard v3.0', url:'https://ml.energy/leaderboard', year:'2026'},
    {id:'ms', label:'微软 Joule 反推', short:'0.31 Wh ÷ 800 token', j:1.4, kind:'推算',
      note:'8×H100 10.2 kW、continuous batching、PUE 1.05–1.40', src:'arXiv:2509.20241', url:'https://arxiv.org/pdf/2509.20241', year:'2026'},
    {id:'paper', label:'预印本中值（默认）', short:'5×10⁻⁴ Wh/token', j:1.8, kind:'推算',
      note:'0.0001–0.002 Wh/output token 取中值 × 3600；输出 token、不含 PUE/训练', src:'arXiv:2603.06630v1', url:'https://arxiv.org/html/2603.06630v1', year:'2026'},
    {id:'epoch', label:'Epoch AI 反推', short:'0.3 Wh ÷ 500 token', j:2.16, kind:'推算',
      note:'GPT-4o / H100、自下而上估算、含服务器+DC 开销', src:'Epoch AI', url:'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use', year:'2025'},
    {id:'mlenergy-high', label:'ML.ENERGY 实测上限', short:'2.3762 J/token', j:2.3762, kind:'实测',
      note:'DeepSeek R1 fp8 / 8×B200；与下限相差约 84 倍', src:'ML.ENERGY Leaderboard v3.0', url:'https://ml.energy/leaderboard', year:'2026'}
  ],

  pueOptions: [
    {v:1.09, label:'1.09 · Google fleet', src:'Google Data Centers', url:'https://datacenters.google/efficiency/'},
    {v:1.41, label:'1.41 · IEA 全球加权（默认）', src:'IEA Energy and AI', url:'https://www.iea.org/files/de9dea13-b07d-42c5-a398-d1b3ae17d866/EnergyandAI.pdf'},
    {v:1.56, label:'1.56 · Uptime 行业均值', src:'Uptime Institute 2024', url:'http://datacenter.uptimeinstitute.com/rs/711-RIA-145/images/2024.GlobalDataCenterSurvey.Report.pdf'}
  ],

  /* 类比单位：wh = 固定瓦时基准；tokens = token 基准（随 J/token、PUE 预设联动，分子分母约掉） */
  analogies: [
    {id:'session', label:'一次会话', unit:'次', tokens:3330000, caveat:true,
      src:'arXiv:2608.00101，44.9T prompt tokens ÷ 13.5M sessions；中位会话 3 轮 / 15 次调用。按 token 基准换算（与 J/token、PUE 预设无关）；仅计 prompt tokens，不含输出',
      url:'https://arxiv.org/abs/2608.00101'},
    {id:'led', label:'9 W LED 灯泡点亮', unit:'小时', wh:9, src:'ENERGY STAR 认证 60W 等效 LED 实测 9.0 W', url:'https://www.energystar.gov/productfinder/product/certified-light-bulbs/details/2301718'},
    {id:'phone', label:'智能手机充满', unit:'次', wh:19, src:'US EPA 2024-10 更新值 0.019 kWh', url:'https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references'},
    {id:'water', label:'烧开 1 L 水', unit:'升', wh:93, src:'NIST 水比热 4.184 kJ/(kg·K) 推得理论下限 0.093 kWh；实际电水壶约 100–115 Wh', url:'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Units=SI&Mask=203&Type=JANAFL&Table=on'},
    {id:'bmr', label:'成人每日基础代谢', unit:'天', wh:1750, caveat:true, src:'FAO/WHO/UNU BMR 1.50–2.03 kWh/日（食物化学能，不是电力）', url:'https://www.fao.org/4/y5686e/y5686e07.htm'}
  ],

  /* 玩梗类比 — 第二幕用。
     kind:'physics' = 有真实能量基准，必须带 src+url；
     kind:'fiction' = 纯文学梗，没有物理依据，必须显式标注，禁止伪装成测量值。 */
  jokeAnalogies: [
    {id:'movie', kind:'physics', label:'够电影院放映', unit:'场《牛来》', wh:17000*86/90,
      src:'一场中等规模影厅放映用电约 17 kWh（北京通州供电公司统计，按 90 min 计，含放映机/中央空调/影厅照明），按《牛来》真实片长 86 min 折算为 16.2 kWh；不含大堂与卖品公摊。高规格 IMAX 单场约 56.5 kWh（国网南京供电公司科普，2 h）是上限而非标准厅值',
      url:'https://m.bilibili.com/opus/415772505206385079'},
    {id:'frog', kind:'physics', label:'能生成', unit:'张奶蛙图片', wh:2282/3600,
      src:'MIT Technology Review 2025-05 实测：Stable Diffusion 3 Medium 生成标准 1024×1024 图像（25 步）耗 GPU 1141 J，按芯片能耗翻倍计入数据中心其余开销 ≈ 2282 J ≈ 0.63 Wh。图像能耗与提示词内容无关，生成奶蛙与生成任何图像同价；不含模型训练',
      url:'https://www.technologyreview.com/2025/05/20/1116327/ai-energy-usage-climate-footprint-big-tech/'},
    {id:'kangaroo', kind:'physics', label:'够肥嘟嘟袋鼠跳', unit:'次', wh:90*9.8*1.9/3600,
      src:'以真红袋鼠为力学模型（主语边界：梗里的「肥嘟嘟袋鼠」是美团外卖黄色袋鼠吉祥物被「你胆子真是肥嘟嘟的」二创出的迷因，不是真袋鼠；此处只借真红袋鼠体型做能量基准）：雄性 90 kg（Australian Museum 给上限 92 kg）× 重力 9.8 m/s² × 平均跳高 1.9 m（Wikipedia 给平均 1.2–1.9 m）= 1676 J ≈ 0.47 Wh。仅把质量垂直抬升的机械能下限，不含水平动能、肌效率与代谢',
      url:'https://australianmuseum.net.au/red-kangaroo'},
    {id:'rocket', kind:'physics', label:'让马斯克发射火箭', unit:'枚', wh:5.0e12/3600,
      src:'推算：Falcon 9 Block 5 一级 RP-1 箱容量 123,500 kg（约 124 t）× 热值 43.2 MJ/kg ≈ 5.3×10¹² J，量级取 5×10¹² J；仅燃料化学能，不含液氧/制造/发射，非官方公布',
      url:'https://en.wikipedia.org/wiki/Falcon_9_Block_5'},
    {id:'ban', kind:'physics', label:'发送申诉邮件（然后被已读不回）', unit:'封', wh:0.006,
      src:'100 KB × 0.06 kWh/GB = 0.006 Wh；0.06 kWh/GB 为 2017 年 JIE 论文 (doi:10.1111/jiec.12630) 对 2015 年固网传输强度的估计，论文称该强度约每 2 年减半，此值已偏旧、属保守口径',
      url:'https://doi.org/10.1111/jiec.12630'},
    {id:'earth', kind:'physics', label:'让全球海洋升温', unit:'℃', wh:5.2e24/3600,
      src:'按全球海洋热容约 5.2×10²⁴ J/K 估算（海洋质量 1.3×10²¹ kg × 海水比热 4.0×10³ J/kg·K，IPCC 2013 口径）。注意：此量级是海洋而非整个地球——大气热容仅约 5×10²¹ J/K',
      url:'https://scienceinschool.org/wp-content/uploads/2017/03/issue39_oceans.pdf'}
  ],

  /* 平均每个项目 / 任务消耗多少 token：统计对象互不相同，严禁相加或互推 */
  projectBenchmarks: [
    {id:'turn', label:'一个用户轮次（prompt tokens）', tokens:227600, kind:'实测 · 中位',
      src:'arXiv:2608.00101，2026-06 一周 GitHub Copilot 匿名采样；均值 582.5K', url:'https://arxiv.org/abs/2608.00101'},
    {id:'session', label:'一个会话（prompt tokens）', tokens:3330000, kind:'全样本推算',
      src:'arXiv:2608.00101，44.9T ÷ 13.5M sessions；中位会话为 3 轮 / 15 次调用', url:'https://arxiv.org/abs/2608.00101'},
    {id:'aider', label:'aider 一道基准小题', tokens:23551, kind:'实测',
      src:'Aider LLM Leaderboards，225 题全量平均（gpt-5 high，$0.129/题）', url:'https://www.aider.chat/docs/leaderboards/'},
    {id:'project', label:'一个完整小项目', tokens:1000000, range:'50 万 – 150 万', kind:'第三方实测',
      src:'Marmelab 2026，9 功能 admin 应用／约 3,000 行／3 个 agent 会话；单一样本', url:'https://marmelab.com/blog/2026/07/13/save-open-source.html'},
    {id:'swe', label:'一个 SWE-bench Verified 任务', tokens:4170000, kind:'实测（预印本）',
      src:'arXiv:2604.22750，8 模型 × 500 题 × 4 次，平均 $1.857/任务', url:'https://arxiv.org/abs/2604.22750'},
    {id:'monthly', label:'每位开发者每月', tokens:null, kind:'未找到权威公开统计',
      src:'Anthropic 官方仅给 $13/活跃日、$150–250/开发者/月（美元，非 token）', url:'https://code.claude.com/docs/en/costs'}
  ],

  gifPresets: [
    {id:'wechat', label:'微信表情', w:240, h:240, fps:10, seconds:2, colors:64, limitKB:500,
      note:'240×240 为腾讯官方明文；≤500 KB 为第三方转述，官方 ver1 投稿 PDF 写的是 ≤60 KB',
      src:'WeChat Emoticons Design Specifications / GIF 中文网', url:'https://support.weixin.qq.com/zh_CN/htmledition/docs/emotion_contributions/WeChat_Emoticons_design_Specifications_EN_ver1.pdf'},
    {id:'qq', label:'QQ / 聊天', w:320, h:320, fps:12, seconds:2.5, colors:128, limitKB:5000,
      note:'腾讯云企点文档声明与个人 QQ 会话同步：单张图片 ≤5 MB、支持 GIF；聊天 GIF 官方单列上限未找到明文',
      src:'腾讯云企点文档', url:'https://cloud.tencent.com/document/product/1695/101399'}
  ],

  bgmPlan: [
    {name:'Suno', commercial:'免费档无商用权，任意付费档可商用', length:'官方未公布最大时长', url:'https://suno.com/pricing'},
    {name:'Mubert', commercial:'付费档含商用许可；禁 Content ID 与流媒体发行', length:'B2C 最长 25 min / API 15 s–2 h', url:'https://mubert.com/'},
    {name:'Soundraw', commercial:'官方称输出可商用、可下载 WAV/STEMS', length:'最长约 5 min', url:'https://soundraw.io'},
    {name:'Stable Audio', commercial:'付费档含商用授权；年营收 >$1M 需企业授权', length:'定价页动态加载，未取到一手时长', url:'https://stableaudio.com/pricing'},
    {name:'MusicGen（避坑）', commercial:'不可商用：代码 MIT，但权重 CC-BY-NC 4.0', length:'短片段', url:'https://github.com/facebookresearch/audiocraft'}
  ]
};
