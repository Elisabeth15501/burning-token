# 《燃烧的 Token》调研结论

> 调研日期：2026-11-12 · 用途：为网页里的「能量估算 / 数值类比 / 分享出口 / BGM 方案」提供可核查依据
> 原则：**每条数字都标注统计口径与来源**；实测、推算、示例值分开写；查不到权威数据就写「未找到」，不补数。

---

## 一、Token → 能量：没有权威常数，只有可复现口径

### 1.1 结论先行

**政府/标准机构（IEA / EPA / NIST / IEC）没有发布「1 token = X 焦耳」的常数。** 能找到的是模型级实测区间与几条可复现的生产口径推导，彼此差 1–2 个数量级。网页里因此采用「可切换口径 + 显示公式与来源」的做法，而不是写死一个数。

### 1.2 可用口径对照

| 口径 | J/token | 性质 | 边界 | 来源 |
|---|---|---|---|---|
| ML.ENERGY Leaderboard v3.0 实测区间 | **0.0284 – 2.3762** | 实测 | 仅 GPU；vLLM；B200/H100；饱和 batch；能效最优点 | [ML.ENERGY Leaderboard \| https://ml.energy/leaderboard \| 2026-09-23] |
| 预印本中值 | **1.8** | 推算 | 0.0001–0.002 Wh/output token，取中值 5×10⁻⁴ Wh × 3600；输出 token；不含 PUE/训练 | [Photons = Tokens, arXiv:2603.06630v1 \| https://arxiv.org/html/2603.06630v1 \| 2026] |
| Epoch AI 反推 | **2.16** | 推算 | 0.3 Wh ÷ 500 输出 token；GPT-4o / H100；含服务器+DC 开销；不含训练 | [Epoch AI \| https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use \| 2025] |
| 微软 Joule 2026 反推 | **1.4** | 推算 | 0.31 Wh ÷ (500 输入+300 输出) token；8×H100 10.2 kW；PUE 1.05–1.40；生产 batching 假设 | [arXiv:2509.20241 \| https://arxiv.org/pdf/2509.20241 \| 2026] |
| IEA 2026 分任务档 | 0.05 / 0.31 / 1.14 / 7.6 **Wh/次** | 榜单+推导 | 仅 GPU；Medium LM / Large MoE / Agentic / 推理 Agentic；「数量级指示而非精确值」 | [IEA, Key Questions on Energy and AI, Fig 2.1 \| https://www.iea.org/files/3179f7f8-01f6-4dd6-bffa-c9f7b73f1dc9/KeyQuestionsonEnergyandAI.pdf \| 2026] |
| Google 2025 全栈实测 | **0.24 Wh/中位提示** | 厂商一手实测 | Gemini Apps 文本提示中位；含加速器 0.14 + CPU/DRAM 0.06 + 空闲 0.02 + DC 开销 0.02 Wh；PUE 1.09；排除训练与终端 | [Google, arXiv:2508.15734 \| https://arxiv.org/html/2508.15734v1 \| 2025] |
| Sam Altman 0.34 Wh/查询 | — | 无方法论 | 常被误挂为「Google 2023」，实为 OpenAI 博客；未披露模型与边界 | [The Gentle Singularity \| https://blog.samaltman.com/the-gentle-singularity \| 2025] |
| de Vries / IEA 2.9 Wh/请求 | — | 2023 上界 | 原文为 "at most"；IEA《Electricity 2024》p.34 转写为 average，后续媒体层层转引丢失假设 | [Joule 2023 \| https://www.cell.com/joule/fulltext/S2542-4351(23)00365-3 \| 2023]；[IEA Electricity 2024 p.34 \| https://iea.blob.core.windows.net/assets/6b2fd954-2017-408e-bf08-952fdd62118a/Electricity2024-Analysisandforecastto2026.pdf \| 2024] |

### 1.3 网页采用的估算式

```
E (J)   = tokens × J_PER_TOKEN × PUE
E (Wh)  = E / 3600
E (kWh) = E / 3_600_000
```

- 默认 `J_PER_TOKEN = 1.8`（预印本中值）、`PUE = 1.41`（IEA 2025 全球加权平均）
- 可在页面上切换为 ML.ENERGY 低/高实测、Epoch 反推、微软反推
- 结果一律标注为**推理边际电耗估算**，不含模型训练、硬件制造、终端设备、外部网络传输

### 1.4 PUE 公开取值（不可互换）

| 值 | 含义 | 来源 |
|---|---|---|
| 1.56 | Uptime Institute 2024 行业平均（n=526，运营商自报） | [Uptime 2024 Global Data Center Survey \| http://datacenter.uptimeinstitute.com/rs/711-RIA-145/images/2024.GlobalDataCenterSurvey.Report.pdf \| 2024] |
| 1.41 → 1.29 | IEA 全球加权平均（2023 → Base Case 2035） | [IEA Energy and AI \| https://www.iea.org/files/de9dea13-b07d-42c5-a398-d1b3ae17d866/EnergyandAI.pdf \| 2025] |
| 1.09 | Google 自有 fleet 平均 | [Google Data Centers \| https://datacenters.google/efficiency/ \| 2025] |
| 1.05 – 1.40 | 微软建模 P5–P95 | [arXiv:2509.20241 \| https://arxiv.org/pdf/2509.20241 \| 2026] |

### 1.5 口径风险（必须随估算一起展示）

1. 0.24 / 0.31 / 0.34 Wh 与 2.9–3 Wh 差约 10 倍，主因是边界（GPU-only vs 全栈）、token 长度、batch、年份，不是「谁对谁错」。
2. IEA 2025 中型 LM 约 4–5 Wh 与 IEA 2026 Medium LM 0.05 Wh 相差约 80–100 倍——基准模型与测量边界变了，**引用必须写年份与图号**。
3. 「AI 查询是搜索的 10 倍」不成立：Hennessy 2023 谈的是美元成本，Google 2009 的 0.3 Wh 是搜索且含建索引摊销，而 AI per-query 数字不含训练。
4. 不能把 per-query 数字线性外推到 token：Google 明确用**日中位数**且长尾均值远高于中位；prefill 随上下文近似平方增长（Epoch：100k 输入 ≈40 Wh）；推理/agentic 不成比例（微软：15× 长度 → 13× 能耗）。
5. Google 一年内单位提示能耗降 **33×**，同类估算会快速过期。
6. 给 GPU-only 数字简单乘 PUE **补不齐** idle 预留容量、主机 CPU/DRAM 与网络（Google 全栈比仅加速器高 2.4×）。

---

## 二、直观类比基准（可换算、带来源）

| 类比 | 单位能量 | 口径 | 来源 |
|---|---|---|---|
| 9 W LED 灯泡点亮 1 小时 | **9 Wh** | ENERGY STAR 认证 60W 等效 LED 实测 9.0 W / 800 lm | [ENERGY STAR Certified Light Bulbs \| https://www.energystar.gov/productfinder/product/certified-light-bulbs/details/2301718 \| 2017] |
| 智能手机充满一次 | **19 Wh** | EPA 2024-10 更新值 0.019 kWh（旧版 2019 为 11 Wh；IEA 报告用约 15 Wh） | [US EPA GHG Equivalencies — Calculations and References \| https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references \| 2024] |
| 烧开 1 L 水（理论下限） | **93 Wh = 0.093 kWh** | 1 kg 水 20→100 °C，c_p 4.184 kJ/(kg·K)；实际电水壶按 80–90% 效率约 100–115 Wh | [NIST Chemistry WebBook — Water \| https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Units=SI&Mask=203&Type=JANAFL&Table=on \| 1998/持续更新] |
| 电动车行驶 1 km | **约 155 Wh = 0.155 kWh** | EPA 综合工况 2026 Model 3 约 25 kWh/100 mi ÷ 160.934 km | [US DOE/EPA fueleconomy.gov \| https://fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2026&year2=2026&make=Tesla&baseModel=Model%203&srchtyp=ymm \| 2026] |
| 成人每日基础代谢 | **1.50 – 2.03 kWh** | FAO/WHO/UNU BMR 示例（女 55 kg 5.40 MJ/日；男 70 kg 7.30 MJ/日）。**食物化学能，不是电力**，网页须标注 | [FAO/WHO/UNU, Human energy requirements Ch.5 \| https://www.fao.org/4/y5686e/y5686e07.htm \| 2001] |
| SWE-bench 一个 agentic 任务 | **4,170,000 tokens** | 见第三节 | [arXiv:2604.22750 \| https://arxiv.org/abs/2604.22750 \| 2026] |

**未找到权威数据**：「一杯咖啡 / 一份外卖 = X kWh」没有统一折算口径（不同机构给的是碳足迹或食物热量，且无标准份量）。最接近的替代：USDA 现煮黑咖啡 8 fl oz ≈ 2 kcal ≈ 0.0023 kWh 化学能；泡一杯按 0.25 L 水加热约 0.023–0.028 kWh 电力。**kcal 不得与数据中心电力 kWh 直接画等号**，网页不采用这类比。

---

## 三、平均每个项目消耗多少 Token

### 3.1 分口径统计（严禁混用）

| 统计对象 | 数值 | 性质 | 来源 |
|---|---|---|---|
| 单次 LLM 调用 | 中位 **68K prompt + 247 output**；88% 输出 <1,000 | 实测（生产遥测） | [Agentic Coding in the Wild, arXiv:2608.00101 \| https://arxiv.org/abs/2608.00101 \| 2026；2026-06 一周、GitHub Copilot 匿名采样] |
| 一个用户轮次 | 中位 **227.6K prompt**（均值 582.5K）；中位 4.5 次调用 | 实测 | 同上 |
| 一个会话 | 中位 3 轮 / 15 次调用 / 4.2 分钟；全样本推算约 **3.33M prompt tokens/会话** | 中位为实测，M 级为推算 | 同上（44.9T ÷ 13.5M sessions） |
| 一个基准小题 | **23,551 tokens/题**（gpt-5 high，225 题，$0.129/题） | 实测 | [Aider LLM Leaderboards \| https://www.aider.chat/docs/leaderboards/ \| 2025] |
| 一个 SWE-bench Verified 任务 | **平均 4,170,000 tokens、$1.857**；8 模型 × 500 题 × 4 次；同任务四次运行最多差 30×；输入:输出 = 153.85 | 实测（预印本，一手最硬） | [arXiv:2604.22750 \| https://arxiv.org/abs/2604.22750 \| 2026]；交叉印证 [CSDN 2026-11-11 \| https://www.csdn.net/article/2026-11-11/170498930 \| 2026] |
| 一个完整项目 | **50 万 – 150 万 tokens**（9 功能 admin 应用，约 3,000 行，3 个 agent 会话，175 分钟） | 第三方实测（非官方统计，作者为 react-admin 维护方，有利益倾向） | [Marmelab, Open Source Is Rocket Fuel for AI Agents \| https://marmelab.com/blog/2026/07/13/save-open-source.html \| 2026] |
| 每月每人 | 官方仅给 **$150–250/开发者/月**、$13/活跃日；**token 数未找到权威公开统计** | 官方（美元） | [Claude Code Docs — Manage costs effectively \| https://code.claude.com/docs/en/costs \| 检索于 2026-11] |

### 3.2 给网页用的保守表述

> **「一个完整项目约 50 万–150 万 tokens」**（第三方实测，样本为单个 9 功能应用）。
> 若换成 agentic 基准任务口径，则是 **约 417 万 tokens/任务**（SWE-bench Verified 实测）。
> 两者不是同一个「项目」，网页里作为两把独立标尺展示，不相加、不互推。

### 3.3 明确「未找到权威公开统计」的项

OpenAI 每任务/项目 token、GitHub 官方每请求 token 聚合数值、Anthropic 每人每月 token 数、METR 每任务 token 消耗（METR 2025 RCT 只公布时间，246 个任务平均约 2 小时，未公布 token）。
另：网上流传的「完整项目 5M–50M」「重度开发者月 20M–50M」均为无一手来源的示例值，网页不采用。

---

## 四、微信 / QQ 的 GIF 规格

| 项 | 结论 | 依据 |
|---|---|---|
| 微信表情投稿（官方明文） | **240×240 px、GIF、透明背景、每张 ≤60 KB** | [WeChat Emoticons Design Specifications EN ver1 \| https://support.weixin.qq.com/zh_CN/htmledition/docs/emotion_contributions/WeChat_Emoticons_design_Specifications_EN_ver1.pdf \| 早期版本] |
| 微信表情商店投稿指南 | 常规 **100 KB**，截屏/真人表情放宽到 **400 KB**；一套 16 或 24 个 | [微信表情商店投稿指南 \| https://sticker.weixin.qq.com/cgi-bin/mmemoticon-bin/readtemplate?t=guide/real \| 页面未标年份] |
| 「240×240 ≤500 KB」 | **第三方高可信转述**，非本次可核验的官方原文；官方现行规范需登录后台 | [GIF 中文网 \| https://www.gif.cn/help/8652 \| 页面未标年份]；[腾讯网创作者 \| https://view.inews.qq.com/k/20250619A08O7G00 \| 2025] |
| 微信聊天发送 GIF 体积上限 | **未找到腾讯官方明文**。官方帮助中心只规定照片 ≤10MB / 1000×1000 / JPEG·PNG，不覆盖 GIF | [WeChat Help Center \| https://help.wechat.com/cgi-bin/micromsg-bin/oshelpcenter?Channel=helpce&id=160115izf2ay160115mmay7f&lang=en&opcode=2&plat=android \| 页面未标年份] |
| 微信聊天第三方经验值 | 表情 240 宽/300KB、聊天动图 320 宽/500KB、公众号 480 宽/1MB | [GIF 中文网 \| https://www.gif.cn/help/8652 \| 页面未标年份] |
| QQ 聊天图片 | 官方最接近口径：**单张 ≤5 MB**，支持 gif；文档声明「与个人 QQ 会话同步」 | [腾讯云企点文档 \| https://cloud.tencent.com/document/product/1695/101399 \| 页面未标年份] |
| QQ 开放平台机器人素材 | 10 MB（**不同口径，不可当聊天上限**） | [QQ 开放平台 \| https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/material-management.html \| 页面未标年份] |
| 帧数/时长 | **未找到官方明文**，第三方互相矛盾（≤24 帧 / ≤300 帧 / 2–15 帧） | 见调研原始记录 |
| 通用导出参数 | 8–15 fps、2–3 秒、64–128 色、永久循环；减体积优先级：缩尺寸 > 抽帧 > 降色数 | [Adobe HelpX \| https://helpx.adobe.com/sk/photoshop/desktop/save-and-export/export-files-to-different-formats/enhance-animation-frames.html \| 页面未标年份]；[Online Tech Tips \| https://www.online-tech-tips.com/create-gif-from-video-using-photoshop/ \| 2026] |

**导出器据此做两档预设**：

- `微信表情` 240×240 / 10 fps / 2 s / 64 色 / 永久循环，目标 ≤500 KB（界面同时提示官方 ver1 为 60 KB）
- `QQ / 聊天` 320×320 / 12 fps / 2.5 s / 128 色 / 永久循环，硬上限 5 MB

---

## 五、BGM 的 AI 生成方案（规划，未生成音频）

页面上「BGM」开关只做状态与规划展示，默认关闭、不加载任何外部音频。正式接入按以下方案：

| 工具 | 商用 | 时长 | 官方 |
|---|---|---|---|
| Suno | **免费档无商用权**，任意付费档可商用 | 官方未公布最大时长；完整歌曲约 1 分钟生成 | https://suno.com/pricing · https://suno.com/legal/terms |
| Mubert | 付费档含商用许可 + license certificate；**禁 Content ID 注册与流媒体发行**；免费档需署名且不可商用 | B2C 最长 25 min，API 15 s–2 h | https://mubert.com/ |
| Soundraw | 官方称仅用自有音乐训练、输出可商用可下载 WAV/STEMS | 最长约 5 min | https://soundraw.io |
| Stable Audio | 付费档含完整商业授权，年营收 >$1M 需 Enterprise；取消订阅后按原许可证延续 | 官方定价页动态加载，未取到一手时长 | https://stableaudio.com/pricing |
| MusicGen / AudioCraft | **不可商用**：代码 MIT，但权重 **CC-BY-NC 4.0**，模型卡注明主要用于研究 | 短片段 | https://github.com/facebookresearch/audiocraft |

**规划**：3 条 30–60 s 无缝 loop（dark ambient / 8-bit chiptune / 篝火环境音），48 kHz WAV → 网页用 OGG/AAC，随场景切换；懒加载、默认静音、开关独立记忆。**避坑**：不用免费档素材参赛或商用；不用 MusicGen 权重；每次使用前复核当日条款（2025–2026 Suno/UMG、Udio/UMG 相关调整频繁）。

---

## 六、玩梗类比的基准与虚构声明

第二幕的五个「玩梗」类比里，三个能算出真实量级，一个纯属文学，一个只能算量级不能算精确值。区分标准直接写在每张卡片的角标上：`PHYSICS` / `JOKE` / `PURE JOKE`。

换算沿用第一节口径：`E = tokens × J/token × PUE`。默认 1.8 J/token、PUE 1.41，T = 1,234,567 时 **E ≈ 3.13 MJ ≈ 870 Wh**。

| 类比 | 当前数值 | 基准 | 性质 |
|---|---|---|---|
| 用电看完一遍《牛来》 | 4.35 遍 | 100 W 电视 × 2 h 片长 = 0.2 kWh；功率取 ENERGY STAR 认证电视典型值 | physics |
| 奶蛙同时大笑 | 313.33 万只 | **虚构**：一只奶蛙笑一声记 1 J | fiction |
| 让马斯克发射火箭 | 1/1,595,746 枚 | 推算：Falcon 9 一级 RP-1 约 124 t × 43 MJ/kg ≈ 5×10¹² J | physics |
| 发送申诉邮件（然后被已读不回） | 14.51 万封 | 100 KB × 0.06 kWh/GB 网络传输强度 | physics |
| 让整个地球升温 | 5.7×10⁻¹⁹ ℃ | 地球热容约 5.5×10²⁴ J/K | physics |

**必须写清的三件事**：

1. **《牛来》是虚构片名**，按你给的文案原样保留。片长按 120 min 计；若换成真实片名，只改 `app/research.js` 的 `jokeAnalogies` 里那一项，全站数值自动重算。
2. **火箭项是推算，不是官方数字**。SpaceX 未公布推进剂质量，「5×10¹² J」由「一级 RP-1 质量 × 航空煤油热值」得出，**量级可信、精确值不可引用**。所以页面同时给倒数表述「1/1,595,746 枚」，而不是假装知道小数后几位。
3. **奶蛙项没有任何物理依据**，角标直接写「PURE JOKE · 无物理依据」，结算清单里标「纯梗」。

**为什么不把「被封账号」「地球重生」直接写成能量等价**：能量和数据之间没有换算关系，硬凑只会得到一串经不起追问的数字。所以改成两条可算的同款梗——「封号」换成「申诉邮件的网络传输能耗」（有据可查），「地球重生」换成「把整个地球升温多少度」（有热容可算）。**给虚构类比打上「虚构」标签，本身就是这个作品要开的玩笑**：先用数据装模作样，再自己承认。

---

## 七、给页面脚注的一句话版本

> 本页能量按 `tokens × J/token × PUE` 估算，J/token 无权威常数；数值与类比均为特定口径下的量级参考，不是精确计量，不含训练与终端能耗。所有来源见 `research.md`。

---

*本文档随源码托管于 [github.com/Elisabeth15501/burning-token](https://github.com/Elisabeth15501/burning-token)。页面本身仍在浏览器内离线运行：不发任何网络请求、不加载 CDN、不读取远端数据。*
