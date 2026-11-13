# 中医相关 GitHub 开源项目清单

> 核实时间：2026-11-13。star 数为当日读数，仅作热度参考——学术项目常常只有几十星却最值得读。
> 检索方式：GitHub topic（`chinese-medicine`、`traditional-chinese-medicine`）+ 仓库接口逐个核验；全站关键词搜索噪声很大（`中医` 命中 3000+ 仓库，按 star 排序前排多为无关项目）。

## 一、总入口

| 项目 | star | 说明 |
| --- | --- | --- |
| [tyang816/Awesome-TCM-LLM](https://github.com/tyang816/Awesome-TCM-LLM) | 138 | 中医大模型、数据集、论文、专利、导师合集，wiki 有数据集专页 |
| [GanjinZero/awesome_Chinese_medical_NLP](https://github.com/GanjinZero/awesome_Chinese_medical_NLP) | 2,661 | 中文医学 NLP 资源总表：术语集、语料、词向量、图谱、NER、QA |

## 二、数据层 · 古籍语料与数据集

| 项目 | star | 说明 |
| --- | --- | --- |
| [xiaopangxia/TCM-Ancient-Books](https://github.com/xiaopangxia/TCM-Ancient-Books) | 1,542 | 近 700 部中医药古籍文本 |
| [lab99x/tcmoc](https://github.com/lab99x/tcmoc) | 75 | 中医开源医典，纯文本古籍语料 |
| [Toyhom/Chinese-medical-dialogue-data](https://github.com/Toyhom/Chinese-medical-dialogue-data) | 1,779 | 中文医疗对话数据集 |
| [CBLUEbenchmark/CBLUE](https://github.com/CBLUEbenchmark/CBLUE) | 862 | 中文医疗信息处理评测基准 |
| [z814081807/DeepNER](https://github.com/z814081807/DeepNER) | 966 | 天池「中药说明书实体识别」冠军方案 |
| [Renhuai123/nihai-renji-corpus](https://github.com/Renhuai123/nihai-renji-corpus) | 约 49 | 讲稿逐条结构化，每条带精确到秒的视频出处 |

## 三、知识层 · 图谱、检索与问答

| 项目 | star | 说明 |
| --- | --- | --- |
| [liuhuanyong/QASystemOnMedicalKG](https://github.com/liuhuanyong/QASystemOnMedicalKG) | 7,411 | 医疗知识图谱问答教程（通用医疗，被中医项目广泛复用） |
| [Real-TomHy/ChineseMedicalQA](https://github.com/Real-TomHy/ChineseMedicalQA) | 199 | 基于中医药知识图谱的智能问答 |
| [zjz-Beiming/Knowlegde_Graph_TCM](https://github.com/zjz-Beiming/Knowlegde_Graph_TCM) | 0 | 中药 / 方剂知识图谱 demo，含数据与可视化 |
| [OpenTCM01/OpenTCM](https://github.com/OpenTCM01/OpenTCM) | 49 | 古籍 + 现代文献 GraphRAG，答案带出处 |
| [ZENGJingqi/GraphAI-for-TCM](https://github.com/ZENGJingqi/GraphAI-for-TCM) | 45 | 图注意力网络量化方剂配伍，有论文配套 |
| [2020MEAI/PresRecST](https://github.com/2020MEAI/PresRecST) | 21 | 方剂推荐任务源码与数据（JAMIA） |

## 四、模型层 · 中医专用大模型

| 项目 | star | 说明 |
| --- | --- | --- |
| [pariskang/CMLM-ZhongJing](https://github.com/pariskang/CMLM-ZhongJing) | 约 535 | 「仲景」，早期中医专用大模型 |
| [michael-wzhu/ShenNong-TCM-LLM](https://github.com/michael-wzhu/ShenNong-TCM-LLM) | 514 | 首个中医药中文大模型，确立「知识图谱 + 自指令 + LoRA」范式 |
| [SCIR-HI/Huatuo-Llama-Med-Chinese](https://github.com/SCIR-HI/Huatuo-Llama-Med-Chinese) | 5,000 | 本草（原华驼）中文医学指令微调 |
| [2020MEAI/TCMLLM](https://github.com/2020MEAI/TCMLLM) | 274 | 中医药大模型 |
| [ZJUFanLab/TCMChat](https://github.com/ZJUFanLab/TCMChat) | 82 | 浙大，60 万条中医指令数据 |
| [FreedomIntelligence/ShizhenGPT](https://github.com/FreedomIntelligence/ShizhenGPT) | 157 | 多模态方向，望闻问切与舌象 |
| [MediaBrain-SJTU/MING](https://github.com/MediaBrain-SJTU/MING) | 1,192 | 明医，中文医疗问诊大模型 |

## 五、应用层 · Agent Skill 与工具（2026 年最活跃）

| 项目 | star | 说明 |
| --- | --- | --- |
| [jangviktor-web/nihaixia](https://github.com/jangviktor-web/nihaixia) | 4,086 | 倪海厦视角的知识库型 Skill |
| [JuneYaooo/nihaisha-nishi-tcm](https://github.com/JuneYaooo/nihaisha-nishi-tcm) | 2,246 | 课程检索 + 板书截图证据索引（包体 145 MB，见审计文档） |
| [jangviktor-web/nihaixia-app](https://github.com/jangviktor-web/nihaixia-app) | 294 | Flutter 离线安卓客户端 |
| [YuanZHAO321/TCM.Skill](https://github.com/YuanZHAO321/TCM.Skill) | 177 | 六部规划教材 + 五部经典整编，本仓库的课程内容来源之一 |
| [jangviktor-web/ye-tianshi-skill](https://github.com/jangviktor-web/ye-tianshi-skill) | 10 | 叶天士温病与医案，引文逐字可核 |
| [JICio/tcm-3d](https://github.com/JICio/tcm-3d) | 14 | 3D 穴位人体教学模拟 |
| [luthepath/TCM-Input-Method](https://github.com/luthepath/TCM-Input-Method) | 4 | 中医术语输入法 |

## 两个观察

1. **star 与学术价值常倒挂**：领域模型项目普遍几百星，而 2026 年的 Skill 类项目轻松数千星。多数人要的不是「微调一个 7B 模型」，而是「能查到原文、能引经据典」。
2. **合规几乎空白**：以上项目绝大多数标注「仅供研究与学习」，无明确商业许可，也没有医疗器械合规路径。

## 使用边界

以上资源仅用于中医学习与古籍研读，不构成诊断、处方、用药或剂量建议。身体不适请就诊于执业中医师。
