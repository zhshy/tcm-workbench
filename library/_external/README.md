# 资料库

外部第三方中医资料，取回本地供查阅、检索与课程编写参考。**不是本项目的原创内容**，版权归原作者，见下方「权利状态」。

## 一、来源

| 目录 | 上游 | 取回版本 | 体积 | 文件数 |
|---|---|---|---|---|
| `TCM.Skill/` | [YuanZHAO321/TCM.Skill](https://github.com/YuanZHAO321/TCM.Skill) | `966a88a`（2026-07-07，Release v3.0） | 30 MB | 98 |
| `nihaisha-nishi-tcm/` | [JuneYaooo/nihaisha-nishi-tcm](https://github.com/JuneYaooo/nihaisha-nishi-tcm) | `881c05b`（2026-11-05） | 148 MB | 3107 |

取回时间：2026-11-13。只复制了工作树，未含 `.git`。

## 二、内容

### TCM.Skill —— 教材整编型知识库

作者逐字通读十六部著作后整编，分三层：教材层（中基／中诊／中药学七版／方剂学七版／中医内科学七版／针灸学）、经典层（素问／灵枢／难经／伤寒论／金匮要略）、温病与医家层（温热论／湿热病篇／温病条辨／医学心悟／医学衷中参西录）。

- `references/` —— **50 个主题文件**，真正有用的部分。从 `00-证型直达选方总索引` 到 `48-医家-衷中参西录要义`，另有 `安全-配伍妊娠禁忌与毒性药.md`
- `sources/` —— 16 部著作的**全文 txt**（教材 + 古籍）
- `SKILL.md` / `CHANGELOG.md` / `README.md` —— 工作流程与索引说明

### nihaisha-nishi-tcm —— 倪海厦课程检索型 Skill

- `references/` —— 按课程分主题：黄帝／天纪／伤寒论／金匮／本草／针灸大成／八纲／扶阳／临床案例／易筋经／重楼心法，每类含「正文 + 板书截图证据索引」
- `references/pdf-evidence/` —— 教材 PDF 逐页取证，转成 md 模块 + `evidence-cards.jsonl`（28 MB，全库最大的单文件）
- `references/text-evidence/` —— 文本证据卡与来源清单
- `assets/screenshots/` —— **2986 张板书截图**（webp），11 个课程分类
- `nihaisha_kg/` —— 检索代码（faiss 向量 + rerank + 融合），`scripts/`、`evals/` 配套

## 三、权利状态（务必先看）

- **TCM.Skill**：CC BY-NC 4.0（署名—非商业性使用）。作者自己的整编部分适用此协议，转载需署名且不得商用。但 `sources/` 里的《中医内科学》七版、《中药学》七版等是**人民卫生出版社教材全文**，作者无权用 CC 协议再许可——这层按「仅个人学习使用」对待。
- **nihaisha-nishi-tcm**：**仓库未附任何许可证**（无 LICENSE 文件），法律上默认「保留所有权利」。板书截图源自倪海厦课程视频，权利更不在仓库作者手上。

因此：**这两个目录只作个人学习与检索之用，不得商用、不得再分发**。本项目已按你的要求把它们同步进仓库，若日后要对外分享或商用，请先自行取得授权。

## 四、使用边界

本项目工作台有一条自定的红线：**不开方、不荐药、不记剂量、不扎针**。这两个资料库里恰好方剂、药物剂量、针刺手法俱全，措辞也比工作台激进（TCM.Skill 直接给剂量上限与按穴艾灸指导，nihaisha 有针刺深度安全篇）。

把它当**索引与出处**用——查某证型见于哪部书、某条文的原话是怎么说的——而不是当结论直接搬进课程。编写课程时凡涉药物与针刺，仍按工作台原有红线处理。

## 五、与本仓库的关系

本目录同时是 `tcm-workbench/library/_external/`（目录联接，不是副本），所以磁盘上只有**一份** 178 MB 内容：

- 在本目录改文件 → 仓库侧立刻可见，`git add` 即纳入版本控制
- `git clone` 到别处 → 得到的是普通目录，真实文件，无需联接
- 若联接被删（例如在资源管理器里移动了本目录），重建：
  `mklink /J <仓库>\library\_external <本目录>`（PowerShell 用 `New-Item -ItemType Junction`）

## 六、更新

```bash
# 重新取回（浅克隆，走代理）
cd /path/to/资料库
git -c http.proxy=http://127.0.0.1:7890 clone --depth 1 \
  https://github.com/YuanZHAO321/TCM.Skill TCM.Skill.new
# 核对差异后替换目录
```

上游若更新，`references/` 的编号可能变动，替换前先 diff。
