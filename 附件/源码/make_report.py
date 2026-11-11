# -*- coding: utf-8 -*-
"""回声 Echo —— 按福州大学《用户体验设计》实验报告模板生成

模板规范（从 .doc 精确提取）：
- 页面：A4，上下边距 72pt，左右 90pt，正文页加边框
- 字体：宋体，小四（12pt）
- 行距：1.2 倍
- 首行缩进：2 字符（24pt）
- 章节：一、/ 1.1 / 3.2.1，一级标题居中
- 字数：1000 字以上
"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

PROJ = r"D:\dsh-workspace\人因工程作业\回声Echo_用户体验设计"
ASSETS = os.path.join(PROJ, "assets")
FIGDIR = os.path.join(ASSETS, "figures")
SHOTDIR = os.path.join(ASSETS, "screenshots")
OUT = os.path.join(PROJ, "回声Echo_用户体验设计报告.docx")

SONG = "宋体"
SZ = 12.0          # 小四
LINE = 1.2         # 1.2 倍行距
INDENT = Pt(24)    # 2 字符 @12pt

doc = Document()

# ============================================================
# 页面设置：A4，上下 72pt，左右 90pt（对齐模板）
# ============================================================
sec = doc.sections[0]
sec.page_width = Pt(595.3)
sec.page_height = Pt(841.9)
sec.top_margin = Pt(72)
sec.bottom_margin = Pt(72)
sec.left_margin = Pt(90)
sec.right_margin = Pt(90)


def add_page_border(section):
    """给页面加边框（模板特征）"""
    sectPr = section._sectPr
    pgBorders = OxmlElement("w:pgBorders")
    pgBorders.set(qn("w:offsetFrom"), "page")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "6")
        el.set(qn("w:space"), "24")
        el.set(qn("w:color"), "000000")
        pgBorders.append(el)
    sectPr.append(pgBorders)


# ---------- 默认样式 ----------
st = doc.styles["Normal"]
st.font.name = SONG
st.font.size = Pt(SZ)
st._element.rPr.rFonts.set(qn("w:eastAsia"), SONG)
st._element.rPr.rFonts.set(qn("w:ascii"), SONG)
st._element.rPr.rFonts.set(qn("w:hAnsi"), SONG)
pf = st.paragraph_format
pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
pf.line_spacing = LINE
pf.space_before = Pt(0)
pf.space_after = Pt(0)


def run_fmt(r, size=SZ, bold=False, color=None, cn=SONG, en=SONG):
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = en
    r._element.rPr.rFonts.set(qn("w:eastAsia"), cn)
    r._element.rPr.rFonts.set(qn("w:ascii"), en)
    r._element.rPr.rFonts.set(qn("w:hAnsi"), en)
    if color:
        r.font.color.rgb = color
    return r


def p(text="", size=SZ, bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
      indent=None, before=0, after=0, line=LINE):
    para = doc.add_paragraph()
    para.alignment = align
    f = para.paragraph_format
    f.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    f.line_spacing = line
    f.space_before = Pt(before)
    f.space_after = Pt(after)
    if indent is not None:
        f.first_line_indent = indent
    if text:
        run_fmt(para.add_run(text), size, bold)
    return para


def body(text):
    """正文段落：首行缩进 2 字符，两端对齐"""
    return p(text, SZ, False, WD_ALIGN_PARAGRAPH.JUSTIFY, INDENT)


def listitem(text):
    """条目段落：首行缩进 2 字符（模板里条目也缩进）"""
    return p(text, SZ, False, WD_ALIGN_PARAGRAPH.JUSTIFY, INDENT)


def h1(text):
    """一级标题：居中，一、"""
    return p(text, SZ, True, WD_ALIGN_PARAGRAPH.CENTER, None, before=6, after=6)


def h2(text):
    """二级标题：左对齐，1.1"""
    return p(text, SZ, True, WD_ALIGN_PARAGRAPH.LEFT, None, before=4, after=0)


def h3(text):
    """三级标题：左对齐，3.2.1"""
    return p(text, SZ, True, WD_ALIGN_PARAGRAPH.LEFT, None, before=2, after=0)


def fig(path, width_pt, caption_text=None):
    if not os.path.exists(path):
        print("  [缺图]", path)
        return
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f = para.paragraph_format
    f.space_before = Pt(4); f.space_after = Pt(2)
    f.line_spacing_rule = WD_LINE_SPACING.SINGLE
    para.add_run().add_picture(path, width=Pt(width_pt))
    if caption_text:
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(4)
        c.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        run_fmt(c.add_run(caption_text), 10.5)


# ============================================================
# 封面页（对齐模板：校名 logo + 标题 + 信息栏 + 日期）
# ============================================================
for _ in range(2):
    doc.add_paragraph()

logo = os.path.join(ASSETS, "fzu_logo.png")
if os.path.exists(logo):
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.add_run().add_picture(logo, width=Pt(254))

for _ in range(3):
    doc.add_paragraph()

p("《用户体验设计》", 26, True, WD_ALIGN_PARAGRAPH.CENTER, line=1.0)
p("实验报告", 26, True, WD_ALIGN_PARAGRAPH.CENTER, line=1.0)

for _ in range(2):
    doc.add_paragraph()

# 信息栏：用下划线表格对齐
info = [
    ("姓    名：", "＿＿＿＿＿＿＿＿＿＿＿＿"),
    ("学    号：", "＿＿＿＿＿＿＿＿＿＿＿＿"),
    ("学    院：", "＿＿＿＿＿＿＿＿＿＿＿＿"),
    ("专    业：", "＿＿＿＿＿＿＿＿＿＿＿＿"),
    ("任课教师：", "＿＿＿＿＿＿李琦＿＿＿＿"),
]
for k, v in info:
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.line_spacing = 1.8
    run_fmt(para.add_run(k), 16)
    run_fmt(para.add_run(v), 16)

for _ in range(2):
    doc.add_paragraph()

p("2026 年 11 月", 16, False, WD_ALIGN_PARAGRAPH.CENTER)

doc.add_page_break()

# ============================================================
# 附件1：评分表页（对齐模板）
# ============================================================
p("附件1：", 16, False, WD_ALIGN_PARAGRAPH.LEFT, line=1.0)

p("《用户体验设计》期末报告", 16.5, True, WD_ALIGN_PARAGRAPH.CENTER, before=6, after=6)

# 表格：学生信息 + 作业题目 + 评分
tbl = doc.add_table(rows=2, cols=6)
tbl.style = "Table Grid"
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

def set_cell(cell, text, bold=False, size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER):
    cell.text = ""
    para = cell.paragraphs[0]
    para.alignment = align
    para.paragraph_format.line_spacing = 1.0
    para.paragraph_format.space_before = Pt(2)
    para.paragraph_format.space_after = Pt(2)
    run_fmt(para.add_run(text), size, bold)

# 第 1 行
set_cell(tbl.rows[0].cells[0], "学生姓名", True)
set_cell(tbl.rows[0].cells[1], "", False)
set_cell(tbl.rows[0].cells[2], "学号", True)
set_cell(tbl.rows[0].cells[3], "", False)
tbl.rows[0].cells[4].merge(tbl.rows[0].cells[5])
set_cell(tbl.rows[0].cells[4], "", False)

# 第 2 行
set_cell(tbl.rows[1].cells[0], "任课老师", True)
set_cell(tbl.rows[1].cells[1], "李琦", False)
set_cell(tbl.rows[1].cells[2], "班级", True)
set_cell(tbl.rows[1].cells[3], "", False)
set_cell(tbl.rows[1].cells[4], "成绩", True)
set_cell(tbl.rows[1].cells[5], "", False)

# 作业题目 / 内容要求 / 评语 / 正文容器
tbl2 = doc.add_table(rows=4, cols=1)
tbl2.style = "Table Grid"
tbl2.alignment = WD_TABLE_ALIGNMENT.CENTER

set_cell(tbl2.rows[0].cells[0], "作业内容要求及完成情况", True, 10.5)

# 第 2 格：评分要点
c2 = tbl2.rows[1].cells[0]
c2.text = ""
pp = c2.paragraphs[0]
pp.paragraph_format.line_spacing = 1.3
pp.paragraph_format.space_before = Pt(4)
run_fmt(pp.add_run("评分要点如下："), 10.5, True, RGBColor(0xC0, 0x00, 0x00))
for _ in range(2):
    lp = c2.add_paragraph()
    lp.paragraph_format.line_spacing = 1.3

# 第 3 格：教师评语
c3 = tbl2.rows[2].cells[0]
c3.text = ""
pp = c3.paragraphs[0]
pp.paragraph_format.line_spacing = 1.3
pp.paragraph_format.space_before = Pt(4)
run_fmt(pp.add_run("教师评语："), 10.5, True)
for _ in range(5):
    lp = c3.add_paragraph()
    lp.paragraph_format.line_spacing = 1.3

# 第 4 格：正文起始提示（正文主体放在表格之外，保证跨页正常）
c4 = tbl2.rows[3].cells[0]
c4.text = ""
first = c4.paragraphs[0]
first.paragraph_format.line_spacing = 1.3
first.paragraph_format.space_before = Pt(4)
run_fmt(first.add_run(
    "期末作业报告（含完整的思维过程与结果）（宋体小四，1.2倍行距，1000字以上，"
    "重点讲制作过程，怎么想到的，怎么实现的）："
), 10.5, True, RGBColor(0x00, 0x70, 0xC0))

# ============================================================
# 正文：直接写在文档流中（表格之外），确保跨页与图片正常
# ============================================================


def bp(text="", bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=None,
       before=0, after=0, size=SZ):
    para = doc.add_paragraph()
    para.alignment = align
    f = para.paragraph_format
    f.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    f.line_spacing = LINE
    f.space_before = Pt(before)
    f.space_after = Pt(after)
    if indent is not None:
        f.first_line_indent = indent
    if text:
        run_fmt(para.add_run(text), size, bold)
    return para


def bbody(t):
    return bp(t, False, WD_ALIGN_PARAGRAPH.JUSTIFY, INDENT)


def bh1(t):
    return bp(t, True, WD_ALIGN_PARAGRAPH.CENTER, None, before=8, after=6)


def bh2(t):
    return bp(t, True, WD_ALIGN_PARAGRAPH.LEFT, None, before=6, after=0)


def bh3(t):
    return bp(t, True, WD_ALIGN_PARAGRAPH.LEFT, None, before=3, after=0)


def bfig(path, width_pt, cap=None):
    if not os.path.exists(path):
        print("  [缺图]", path)
        return
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.space_before = Pt(4)
    para.paragraph_format.space_after = Pt(2)
    para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    para.paragraph_format.keep_with_next = True
    para.add_run().add_picture(path, width=Pt(width_pt))
    if cap:
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(6)
        c.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        run_fmt(c.add_run(cap), 10.5)


# ============================================================
# 正文：按模板七章骨架
# ============================================================

bh1("“回声 Echo”移动端情绪疗愈应用")

# ---------- 一 ----------
bh1("一、背景与市场洞察")
bh2("1.1 背景分析")
bbody(
    "当代青年的情绪困扰呈现出“持续性低强度”的特征：不是临床意义上的抑郁，而是长期疲惫、"
    "焦虑与孤独感的叠加。这种状态的一个共同表现是——愿意倾诉，但不希望被熟悉的人看见。"
    "人们更倾向在陌生场域宣泄，而面对熟人时反而沉默。"
)
bbody(
    "与此同时，市面上的情绪类产品大多要求用户“先付出”：冥想应用要打卡，情绪日记要每日记录，"
    "AI 陪伴要持续对话。而在情绪最低落的时刻，用户最缺的恰恰是付出的能力。"
    "这一错位构成了本设计的出发点：能否做一个不需要用户努力的疗愈产品。"
)

bh2("1.2 竞品矩阵与机会缺口")
bbody("现有市场竞品主要分为三类，均存在明显短板：")
bp("① 冥想类应用（如潮汐、Now）：内容体系完整、白噪音成熟，但任务重、需每日打卡，"
   "对“此刻只想喘口气”的场景而言过重；", False, indent=INDENT)
bp("② 情绪日记类（如 Daylio）：记录结构化、便于回顾，但纯工具属性、情感反馈薄弱，"
   "用户记录完仍得不到回应；", False, indent=INDENT)
bp("③ AI 陪伴类：回应即时、有陪伴感，但存在过度依赖与伦理风险，且要求用户持续输出内容。",
   False, indent=INDENT)
bp("④ 产品机会点：三者的共同缺口在于都要求用户“先付出”。若能把用户的动作成本压到"
   "一次选择与一句话，并用声音与呼吸提供不需回应的陪伴，就能填补这一空白。"
   "由此确立设计方向：以呼吸调节为生理入口，以一句话回声为情感出口，"
   "做一款三分钟内完成、无需注册的轻量疗愈应用。", False, indent=INDENT)

# ---------- 二 ----------
bh1("二、用户洞察与需求分析")

bh2("2.1 目标用户分析")
bbody("根据用户对情绪出口的需求差异，将目标用户分为四类：")
bp("① 高压求职者：面临面试、毕业论文等多重压力，需要不费力就能缓解焦虑的方式，"
   "理想陪伴：打开即用、不需学习成本；", False, indent=INDENT)
bp("② 独居青年：独自在城市生活，深夜情绪无处安放，理想陪伴：安静、不追问、不索取回应；",
   False, indent=INDENT)
bp("③ 情绪内耗者：习惯把情绪咽下去，不愿向熟人解释，理想陪伴：一个不会评判的出口；",
   False, indent=INDENT)
bp("④ 声触敏感者：对声音和视觉反馈敏感，需要温和、有节律的感官刺激，"
   "理想陪伴：可调节的音量与环境音。", False, indent=INDENT)

bh2("2.2 用户画像")
bbody("核心目标用户为 18–28 岁的在校学生与初入职场青年。研究阶段深度访谈了 2 名符合情境的"
      "真实用户：P1 为在校本科生，22 岁，近一月有三次以上因学业焦虑失眠；P2 为入职半年的"
      "职场新人，25 岁，独自租房。访谈遵循“只问最近一次具体事件”的原则，避免“你愿不愿意"
      "倾诉”这类会诱发社会赞许偏差的提问。")

bh2("2.3 用户需求分析")
bbody("采用 Kano 模型，从“情绪接纳度”与“体验完成度”两个维度划分需求：")
bp("（1）基础需求（Must-be Quality）—— 安全与无负担", True, indent=None)
bp("① 全程无需注册登录，不索取任何个人信息；", False, indent=INDENT)
bp("② 页面明示“不留痕、随时可以离开”，把隐私承诺写进界面而非藏在条款；", False, indent=INDENT)
bp("③ 任何一步都能跳过或回退，不制造任务压力。", False, indent=INDENT)
bp("（2）期望需求（One-dimensional Quality）—— 引导与回应", True, indent=None)
bp("① 情绪选择项覆盖常见状态，且能一眼扫读、快速决策；", False, indent=INDENT)
bp("② 呼吸引导有明确的视觉与时间提示，用户无需学习即可跟随；", False, indent=INDENT)
bp("③ 书写的门槛足够低，提供示例文案作为提示。", False, indent=INDENT)
bp("（3）兴奋需求（Attractive Quality）—— 沉浸与留存", True, indent=None)
bp("① 配乐随情绪切换而改变明暗，形成声音与心情的呼应；", False, indent=INDENT)
bp("② 回响文案逐字浮现，模拟“被回应”的时序感；", False, indent=INDENT)
bp("③ 生成可保存的回声卡，把一次短体验转化为可留存的物件。", False, indent=INDENT)

# ---------- 三 ----------
bh1("三、任务分析")

bh2("3.1 设计原理确立")
bbody("核心原则是：以生理调节降低情绪唤醒水平，再以语言外化完成认知整理，"
      "形成“感知—调节—表达—确认”的情绪闭环。呼吸环节采用 4-2-6 节律（吸气 4 秒、"
      "屏息 2 秒、呼气 6 秒），呼气长于吸气，符合自主神经调节的放松规律；"
      "回声环节采用逐字浮现而非整段呈现，让用户产生被逐句回应的感受。")

bh2("3.2 核心行为流设计")

bh3("3.2.1 情绪定位流")
bbody("用户进入后首先面对 6 张情绪卡（疲惫、焦虑、孤独、低落、平静、麻木）。"
      "每张卡配有独立的情绪色点与英文标签，两列网格排布以便快速扫读。"
      "选择的结果不仅用于后续文案匹配，也会改变呼吸球与配乐的音色："
      "例如选择“焦虑”时，配乐的低通截止频率会提高，声音更明亮、更具支撑感；"
      "选择“麻木”时则降低至最暗，避免刺激。")
bfig(os.path.join(SHOTDIR, "mobile_mood.png"), 170, "图 1  情绪选择页（移动端）")

bh3("3.2.2 呼吸引导流")
bbody("选择情绪后进入呼吸页。屏幕上是一个通透的光球，配合倒计时数字与阶段文字提示。"
      "光球在吸气时放大、屏息时定格、呼气时收缩，共 4 轮。每个阶段切换时，"
      "音频引擎会触发一个低沉引导音（吸气 220Hz、呼气 165Hz），让节奏可听可视。"
      "用户可随时点击“直接写一句话”跳过。")
bfig(os.path.join(SHOTDIR, "mobile_breathe.png"), 170, "图 2  呼吸引导页")

bh3("3.2.3 回声生成流")
bbody("用户写下一句话（最多 60 字），或选择跳过。提交后，系统从该情绪的预设文案库中"
      "随机抽取一句作为回响，与用户的话一起逐字浮现。若用户跳过书写，则直接呈现预设回响。"
      "最后提供“生成我的回声卡”按钮，用 Canvas 在本地绘制一张 1080×1440 的图片，"
      "可直接保存。整个过程不联网，不采集任何数据。")
bfig(os.path.join(SHOTDIR, "mobile_final.png"), 170, "图 3  回响完成页")

# ---------- 四 ----------
bh1("四、概念生成与结构设计")

bh2("4.1 设计目标")
bbody("满足安全与无负担、引导与回应、沉浸与留存三大核心需求，实现情绪定位、呼吸引导、"
      "回声生成三类行为流，做一款“一屏、一次呼吸、三分钟”的轻量情绪疗愈产品。")

bh2("4.2 概念方案提出")
bbody("“回声 Echo”：以呼吸为生理入口、以一句话回声为情感出口的移动端轻应用。"
      "它不是社交产品，不做匹配、不做评论、不做好友；也不是记录工具，不积累数据、"
      "不生成报告。它只做一件事——在用户情绪最需要落脚的时候，接住它，然后还一句回应。")

bh2("4.3 核心凝练")
bbody("核心概念为“情绪回声（Emotional Echo）”，包含两层含义：")
bp("① 呼应：产品不解决问题，只完成一次确认——你的情绪被听见了。"
   "因此全程不出现“治疗”“诊断”“评估”等临床词汇，避免把用户问题化；", False, indent=INDENT)
bp("② 消散：回声卡可以保存，但内容不留在服务器。写完即散，压力归零。"
   "“这段回声已被风带走”既是文案，也是真实的技术承诺。", False, indent=INDENT)

bh2("4.4 三层耦合架构")
bbody("采用三层耦合架构，确保体验的层次与连贯：")
bp("① 感知层：情绪选择卡与呼吸光球，负责把抽象的情绪转化为可操作的选择与可跟随的节奏；",
   False, indent=INDENT)
bp("② 交互层：单页多场景切换，每屏只问一个问题、只给一个主按钮，任意步骤可跳过可回退；",
   False, indent=INDENT)
bp("③ 情感层：实时合成配乐与逐字浮现的回响，负责在体验的高点与终点留下记忆锚点。",
   False, indent=INDENT)

# ---------- 五 ----------
bh1("五、模块化设计")

bh2("5.1 功能模块规划")
bbody("产品拆分为五个功能模块，对应五个场景：")
bp("① 入口模块：单屏单主张，只呈现一句主张、一个主按钮与一个说明入口；", False, indent=INDENT)
bp("② 情绪选择模块：6 张卡片，输出情绪类型供后续模块调用；", False, indent=INDENT)
bp("③ 呼吸引导模块：4 轮节律动画 + 倒计时 + 音频引导；", False, indent=INDENT)
bp("④ 回声生成模块：文本输入 + 预设文案库随机匹配 + 逐字呈现；", False, indent=INDENT)
bp("⑤ 卡片生成模块：Canvas 本地绘制，支持保存为图片。", False, indent=INDENT)

bh2("5.2 造型设计")
bbody("视觉语言以“深空蓝 × 暖金”为核心。底色为 #05070D 的深空蓝，"
      "主色为 #C8A96A 的暖金，形成“夜色中的一点温度”的隐喻。"
      "背景由三层极光以不同周期缓慢漂移，并叠加 SVG 噪点模拟胶片颗粒，"
      "避免大面积深色带来的数字冷感。标题使用衬线字体，正文使用无衬线字体，"
      "形成情绪化与功能性的分层。")
bfig(os.path.join(SHOTDIR, "desktop_intro.png"), 330, "图 4  桌面端入口页视觉")

bh2("5.3 情感化体验设计")
bbody("依据诺曼的情感三层次理论逐层落地：")
bp("① 本能层：深空蓝与暖金的配色、极光缓动、衬线字体、通透的呼吸光球，以及无音频文件"
   "的实时合成音色；", False, indent=INDENT)
bp("② 行为层：全流程 4 步可达完成，所有按钮在移动端全宽排列、最小高度 52 像素，"
   "满足单手持握的拇指热区；输入框字号 17 像素，规避 iOS 聚焦时的自动放大；", False, indent=INDENT)
bp("③ 反思层：全程不做评判、不把用户问题化，回声卡作为可留存的个人物件，延长情感余韵。",
   False, indent=INDENT)
bfig(os.path.join(FIGDIR, "fig5_emotional.png"), 330, "图 5  情感化设计三层次")

bh2("5.4 人体工学设计")
bbody("移动端适配是本次设计的重点。针对手机使用场景，做了以下处理：")
bp("① 视口：以 100dvh 替代百分比高度，解决 iOS Safari 地址栏伸缩导致的页面跳动；",
   False, indent=INDENT)
bp("② 热区：所有可点击元素不小于 44 像素，主按钮 52 像素，保证拇指可及；", False, indent=INDENT)
bp("③ 键盘：监听 visualViewport 变化，键盘弹起时自动将输入框滚入可视区；", False, indent=INDENT)
bp("④ 横屏：针对高度 ≤620 像素的横屏场景单独定义紧凑布局，避免主按钮被推出视口；",
   False, indent=INDENT)
bp("⑤ 触屏：以 @media (hover:none) 移除 hover 粘滞效果，改用按下态反馈。", False, indent=INDENT)

# ---------- 六 ----------
bh1("六、原型设计")

bh2("6.1 概念草图与方案筛选")
bbody("初期曾提出三个方案并做取舍：方案 A 社交连接型，以匿名匹配促成陌生人倾诉；"
      "方案 B 记录分析型，以情绪日记积累数据并生成趋势报告；方案 C 自我回应型，"
      "以呼吸调节配合一句话回声完成闭环。")
bbody("用卡诺模型评估后，方案 A 虽满足社交需求，却引入了冷启动与人际风险，"
      "且与“不愿被看见”的核心洞察相悖；方案 B 的反馈周期以周计，无法匹配三分钟的场景。"
      "最终选择方案 C，并将兴奋型体验（实时配乐、回声卡）作为差异化重点。"
      "一期边界明确划出“不做”清单：不做账号体系、不做社交广场、不做 UGC 内容池、"
      "不做积分排行、不做真实支付。")
bfig(os.path.join(FIGDIR, "fig2_kano.png"), 330, "图 6  Kano 模型需求分类与一期边界")

bh2("6.2 高保真与可交互原型")
bbody("作品最终以可交互的网页形式实现，而非静态稿。技术上采用纯静态 HTML/CSS/JavaScript，"
      "三个文件合计约 68 KB，无框架、无构建、无后端。配乐不使用任何音频文件，"
      "而由 Web Audio API 实时合成：三个微失谐的正弦波构成低频垫，"
      "D 大调五声音阶随机取音形成旋律，程序生成的 3.6 秒脉冲响应提供混响。"
      "这一选择的收益是双重的——既免除音频文件的带宽与存储开销，也使音乐永不循环重复。")
bbody("作品已部署于服务器，可通过以下地址访问，或扫描二维码直接在手机上体验：")
bfig(os.path.join(ASSETS, "qr_card.png"), 150, "图 7  在线原型访问二维码")

# ---------- 七 ----------
bh1("七、测试与迭代")

bh2("7.1 用户体验流程")
bbody("由于本作品的主要使用场景为手机，测试重心从功能可用性转向移动端适配质量。"
      "测试采用程序化自动验证：在浏览器中通过 DevTools 协议模拟 5 类设备"
      "（iPhone SE 375×667、iPhone 13 390×844、iPhone 14 Pro Max 430×932、"
      "Android 412×915 与 844×390 横屏），对 5 个场景逐一检测横向溢出、"
      "触摸热区尺寸与主按钮可见性，并截取关键帧人工复核。"
      "同时以离线渲染方式验证音频引擎确实产生信号，排除“看似在播、实际静音”的伪实现。")

bh2("7.2 测试结果")
bbody("首轮测试共 25 项，暴露出 5 项缺陷，归为三类：")
bp("① 可行性：呼吸球光晕层以 inset:-22% 向外扩张，溢出容器造成页面横向滚动，"
   "在 4 类竖屏设备上均出现；", False, indent=INDENT)
bp("② 价值认可：文字类按钮原高度 42 像素，低于 44 像素的可用性下限；"
   "横屏场景下纵向空间被压缩，主按钮被推出视口；", False, indent=INDENT)
bp("③ 音频验证：离线渲染抽样结果为峰值 0.2582、RMS 0.0719、有效采样点占比 99.9%，"
   "判定确有输出，排除静音伪实现。", False, indent=INDENT)
bbody("修改后复测，25 项全部通过，失败数为 0。")
bfig(os.path.join(FIGDIR, "fig4_test.png"), 330, "图 8  多设备适配结果与问题修复对照")

bh2("7.3 改进方向")
bbody("针对测试中暴露的问题与待补环节，确定四项改进：")
bp("① 修正横向溢出：将光晕收敛至容器内部，并以径向遮罩渐隐边缘，"
   "在保留柔和度的同时消除溢出；", False, indent=INDENT)
bp("② 提升触摸热区：文字类按钮统一提升至 46 像素以上，主按钮 52 像素，"
   "保证点击区与视觉区一致；", False, indent=INDENT)
bp("③ 优化横屏布局：为高度 ≤620 像素的场景单独定义紧凑布局，"
   "压缩呼吸球尺寸与垂直留白，并将弹层由贴底改为居中；", False, indent=INDENT)
bp("④ 补充真实用户测试：本次测试以自动化适配为主，尚未组织真实用户完成可用性任务，"
   "“三分钟完成率”与“情绪改善”两项指标待补测。后续拟招募 5 名符合门槛的用户，"
   "以任务脚本与 SUS 量表补足这一环节。", False, indent=INDENT)

bbody("本设计仍有明显局限：用户样本仅 2 人，属便利抽样，所归纳的发现应视为方向性假设"
      "而非定论；未施测 SUS 量表，缺少与其他产品的横向可比数据。这些是后续工作的优先事项。")

# ============================================================
# 页码
# ============================================================
def add_footer(section):
    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run()
    run_fmt(r, 9)
    fld1 = OxmlElement("w:fldChar"); fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar"); fld2.set(qn("w:fldCharType"), "end")
    r._r.append(fld1); r._r.append(instr); r._r.append(fld2)


add_page_border(sec)
add_footer(sec)

doc.save(OUT)
print("saved:", OUT)
