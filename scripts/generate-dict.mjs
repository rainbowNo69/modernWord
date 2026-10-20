#!/usr/bin/env node
/**
 * Generate compact dictionary data for the vocab collector.
 * Creates dict.json and lemma.json from a curated word list.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Compact format: word|phonetic|translation|tags|frq
// Tags: g=中考, 4=四级, 6=六级, k=考研, i=雅思, t=托福, r=GRE
const raw = `abandon|/əˈbændən/|v. 放弃；抛弃|46|3500
ability|/əˈbɪləti/|n. 能力；才能|g4|1200
abroad|/əˈbrɔːd/|ad. 在国外|g4|2800
absence|/ˈæbsəns/|n. 缺席；缺乏|46|3200
absolute|/ˈæbsəluːt/|a. 绝对的|46|2900
absorb|/əbˈzɔːrb/|v. 吸收；吸引|46k|3800
abstract|/ˈæbstrækt/|a. 抽象的 n. 摘要|6kit|4500
abundant|/əˈbʌndənt/|a. 丰富的|46i|4200
academic|/ˌækəˈdemɪk/|a. 学术的|46|2500
accelerate|/əkˈseləreɪt/|v. 加速|6kt|5200
accept|/əkˈsept/|v. 接受|g4|800
access|/ˈækses/|n. 通道；访问|46|1800
accommodate|/əˈkɒmədeɪt/|v. 容纳；适应|6ki|6500
accompany|/əˈkʌmpəni/|v. 陪伴|46|3600
accomplish|/əˈkʌmplɪʃ/|v. 完成；实现|46k|4100
account|/əˈkaʊnt/|n. 账户；描述|g4|1100
accumulate|/əˈkjuːmjəleɪt/|v. 积累|6kt|5500
accurate|/ˈækjərət/|a. 准确的|46|2600
achieve|/əˈtʃiːv/|v. 达到；实现|g4|1400
acknowledge|/əkˈnɒlɪdʒ/|v. 承认；确认|6ki|4800
acquire|/əˈkwaɪər/|v. 获得；学到|46k|3100
adapt|/əˈdæpt/|v. 适应；改编|46i|3900
adequate|/ˈædɪkwət/|a. 足够的|46k|3700
adjust|/əˈdʒʌst/|v. 调整|46|3300
administration|/ədˌmɪnɪˈstreɪʃn/|n. 管理；行政|46|2200
admire|/ədˈmaɪər/|v. 钦佩|g4|4100
adopt|/əˈdɒpt/|v. 采用；收养|46k|3000
advance|/ədˈvɑːns/|v. 前进 n. 进展|g4|1900
advantage|/ədˈvɑːntɪdʒ/|n. 优势|g4|1600
adventure|/ədˈventʃər/|n. 冒险|g4|3800
afford|/əˈfɔːrd/|v. 负担得起|g4|2400
aggressive|/əˈɡresɪv/|a. 侵略的；积极的|6ki|4600
allocate|/ˈæləkeɪt/|v. 分配|6kt|5100
alternative|/ɔːlˈtɜːrnətɪv/|n. 替代品 a. 替代的|46k|3400
ambitious|/æmˈbɪʃəs/|a. 有雄心的|6i|5300
analyze|/ˈænəlaɪz/|v. 分析|46|2700
annual|/ˈænjuəl/|a. 每年的|46|2800
anticipate|/ænˈtɪsɪpeɪt/|v. 预期|6kt|4900
anxiety|/æŋˈzaɪəti/|n. 焦虑|46k|4200
apparent|/əˈpærənt/|a. 明显的|46k|3500
appeal|/əˈpiːl/|v. 呼吁；吸引|46|2900
appetite|/ˈæpɪtaɪt/|n. 食欲；欲望|6i|5800
application|/ˌæplɪˈkeɪʃn/|n. 应用；申请|g4|1500
appreciate|/əˈpriːʃieɪt/|v. 欣赏；感激|46|2800
approach|/əˈprəʊtʃ/|v. 接近 n. 方法|46|2100
appropriate|/əˈprəʊpriət/|a. 适当的|46|2500
approve|/əˈpruːv/|v. 批准；赞成|46|3100
arise|/əˈraɪz/|v. 出现；产生|46k|3600
arrange|/əˈreɪndʒ/|v. 安排|g4|2300
artificial|/ˌɑːrtɪˈfɪʃl/|a. 人工的|46i|4400
aspect|/ˈæspekt/|n. 方面|46|2600
assemble|/əˈsembl/|v. 集合；组装|6kt|5600
assess|/əˈses/|v. 评估|46k|3200
assign|/əˈsaɪn/|v. 分配；指派|46|3000
assist|/əˈsɪst/|v. 帮助|46|2700
associate|/əˈsəʊʃieɪt/|v. 联想 n. 同事|46|2900
assume|/əˈsjuːm/|v. 假设；承担|46|2400
assure|/əˈʃʊər/|v. 保证|46k|3800
atmosphere|/ˈætməsfɪər/|n. 大气；气氛|g4|3200
attach|/əˈtætʃ/|v. 附上；依附|46|3500
attain|/əˈteɪn/|v. 达到；获得|6kt|4700
attempt|/əˈtempt/|v./n. 尝试|46|2200
attribute|/əˈtrɪbjuːt/|v. 归因于 n. 属性|6ki|3900
authority|/ɔːˈθɒrəti/|n. 权威；当局|46|2600
available|/əˈveɪləbl/|a. 可用的|46|1800
average|/ˈævərɪdʒ/|a. 平均的|g4|1700
aware|/əˈweər/|a. 意识到的|46|2000
awkward|/ˈɔːkwəd/|a. 笨拙的；尴尬的|6i|5400
balance|/ˈbæləns/|n. 平衡|g4|2100
barrier|/ˈbæriər/|n. 障碍|6ki|4300
benefit|/ˈbenɪfɪt/|n. 利益 v. 有益于|g4|1500
blame|/bleɪm/|v./n. 责备|g4|3100
bond|/bɒnd/|n. 纽带；债券|6ki|4100
boost|/buːst/|v./n. 促进|6i|4500
boundary|/ˈbaʊndri/|n. 边界|6ki|4800
brief|/briːf/|a. 简短的|46|2800
brilliant|/ˈbrɪliənt/|a. 杰出的|46|3900
budget|/ˈbʌdʒɪt/|n. 预算|46|3200
burden|/ˈbɜːdn/|n. 负担|46k|3600
campaign|/kæmˈpeɪn/|n. 运动；战役|46|3100
capable|/ˈkeɪpəbl/|a. 有能力的|46|2900
capture|/ˈkæptʃər/|v. 捕获|46|3400
career|/kəˈrɪər/|n. 职业|g4|1900
casual|/ˈkæʒuəl/|a. 随意的|6i|4900
category|/ˈkætəɡəri/|n. 种类|46|3000
challenge|/ˈtʃælɪndʒ/|n./v. 挑战|g4|1800
character|/ˈkærəktər/|n. 性格；角色|g4|1400
circumstance|/ˈsɜːkəmstəns/|n. 环境；情况|46|3500
climate|/ˈklaɪmət/|n. 气候|g4|3100
collapse|/kəˈlæps/|v./n. 倒塌；崩溃|6ki|4600
combine|/kəmˈbaɪn/|v. 结合|46|2300
comfort|/ˈkʌmfət/|n. 舒适 v. 安慰|g4|3000
command|/kəˈmɑːnd/|v./n. 命令|46|2600
communicate|/kəˈmjuːnɪkeɪt/|v. 交流|g4|2100
community|/kəˈmjuːnəti/|n. 社区|g4|1600
companion|/kəmˈpæniən/|n. 同伴|46i|4200
compare|/kəmˈpeər/|v. 比较|g4|1500
compete|/kəmˈpiːt/|v. 竞争|g4|2400
complex|/ˈkɒmpleks/|a. 复杂的|46|2200
complicate|/ˈkɒmplɪkeɪt/|v. 使复杂化|6k|5200
component|/kəmˈpəʊnənt/|n. 组成部分|6kt|4100
concentrate|/ˈkɒnsntreɪt/|v. 集中|46|2800
concept|/ˈkɒnsept/|n. 概念|46|2500
concern|/kənˈsɜːn/|v. 涉及 n. 担忧|46|2000
conclude|/kənˈkluːd/|v. 结束；得出结论|46|2600
concrete|/ˈkɒŋkriːt/|a. 具体的|6ki|3800
conduct|/ˈkɒndʌkt/|v. 进行 n. 行为|46|2700
confident|/ˈkɒnfɪdənt/|a. 自信的|g4|2900
confirm|/kənˈfɜːm/|v. 确认|46|2800
conflict|/ˈkɒnflɪkt/|n. 冲突|46k|3100
confuse|/kənˈfjuːz/|v. 使困惑|46|3500
conscious|/ˈkɒnʃəs/|a. 有意识的|6ki|4000
consequence|/ˈkɒnsɪkwəns/|n. 结果；后果|46|2900
conservative|/kənˈsɜːvətɪv/|a. 保守的|6ki|4500
consider|/kənˈsɪdər/|v. 考虑|g4|1200
consistent|/kənˈsɪstənt/|a. 一致的|6ki|3900
constant|/ˈkɒnstənt/|a. 不断的|46|3000
construct|/kənˈstrʌkt/|v. 建造|46|2900
consult|/kənˈsʌlt/|v. 咨询|6ki|4300
consumer|/kənˈsjuːmər/|n. 消费者|46|2700
contemporary|/kənˈtemprəri/|a. 当代的|6kit|4800
context|/ˈkɒntekst/|n. 语境；背景|46|2600
contribute|/kənˈtrɪbjuːt/|v. 贡献|46|2200
controversial|/ˌkɒntrəˈvɜːʃl/|a. 有争议的|6ki|5500
convenient|/kənˈviːniənt/|a. 方便的|g4|2800
convince|/kənˈvɪns/|v. 说服|46|3200
cooperate|/kəʊˈɒpəreɪt/|v. 合作|46|3600
correspond|/ˌkɒrɪˈspɒnd/|v. 符合；通信|6kt|4700
creative|/kriˈeɪtɪv/|a. 创造性的|46|2500
critical|/ˈkrɪtɪkl/|a. 批评的；关键的|46|2300
cultivate|/ˈkʌltɪveɪt/|v. 培养|6ki|5300
curiosity|/ˌkjʊəriˈɒsəti/|n. 好奇心|6i|4900
current|/ˈkʌrənt/|a. 当前的|g4|1800
database|/ˈdeɪtəbeɪs/|n. 数据库|46|3100
decline|/dɪˈklaɪn/|v. 下降；拒绝|46|2800
deliberate|/dɪˈlɪbərət/|a. 故意的|6kt|5000
deliver|/dɪˈlɪvər/|v. 递送；发表|46|2600
demand|/dɪˈmɑːnd/|v./n. 要求|g4|1900
demonstrate|/ˈdemənstreɪt/|v. 证明；演示|46|2900
depression|/dɪˈpreʃn/|n. 抑郁；萧条|6ki|4600
derive|/dɪˈraɪv/|v. 源于|6kt|4200
desperate|/ˈdespərət/|a. 绝望的|6ki|4400
despite|/dɪˈspaɪt/|prep. 尽管|46|2500
destruction|/dɪˈstrʌkʃn/|n. 毁灭|46|3500
determine|/dɪˈtɜːmɪn/|v. 决定|46|2100
device|/dɪˈvaɪs/|n. 设备|46|2400
devote|/dɪˈvəʊt/|v. 奉献|46k|3800
dignity|/ˈdɪɡnəti/|n. 尊严|6kr|5800
dilemma|/dɪˈlemə/|n. 困境；两难|6ki|5600
dimension|/daɪˈmenʃn/|n. 维度|6kt|3900
discipline|/ˈdɪsɪplɪn/|n. 纪律；学科|46k|3600
distinguish|/dɪˈstɪŋɡwɪʃ/|v. 区分|46k|3700
distribute|/dɪˈstrɪbjuːt/|v. 分配|46|3000
diverse|/daɪˈvɜːs/|a. 多样的|6ki|4100
domestic|/dəˈmestɪk/|a. 国内的；家庭的|46k|3300
dominate|/ˈdɒmɪneɪt/|v. 支配|6ki|4000
dramatic|/drəˈmætɪk/|a. 戏剧性的|6ki|3800
duration|/djuˈreɪʃn/|n. 持续时间|6kt|4500
dynamic|/daɪˈnæmɪk/|a. 动态的|6ki|3900
economic|/ˌiːkəˈnɒmɪk/|a. 经济的|g4|1600
efficient|/ɪˈfɪʃnt/|a. 高效的|46|2700
elaborate|/ɪˈlæbərət/|a. 精心的 v. 详述|6kt|4700
eliminate|/ɪˈlɪmɪneɪt/|v. 消除|6ki|3800
embrace|/ɪmˈbreɪs/|v. 拥抱；接受|6ki|4300
emerge|/ɪˈmɜːdʒ/|v. 出现|46k|3200
emission|/ɪˈmɪʃn/|n. 排放|6ki|4800
emotion|/ɪˈməʊʃn/|n. 情感|46|2800
emphasis|/ˈemfəsɪs/|n. 强调|46k|3100
encounter|/ɪnˈkaʊntər/|v. 遇到|6ki|4000
engage|/ɪnˈɡeɪdʒ/|v. 从事；吸引|6ki|3400
enhance|/ɪnˈhɑːns/|v. 增强|6ki|3200
enormous|/ɪˈnɔːməs/|a. 巨大的|46|3500
enterprise|/ˈentəpraɪz/|n. 企业|46|3200
enthusiasm|/ɪnˈθjuːziæzəm/|n. 热情|6ki|4600
environment|/ɪnˈvaɪrənmənt/|n. 环境|g4|1400
establish|/ɪˈstæblɪʃ/|v. 建立|46|2300
evaluate|/ɪˈvæljueɪt/|v. 评估|46k|3100
evidence|/ˈevɪdəns/|n. 证据|46|2000
evolve|/ɪˈvɒlv/|v. 进化|6kt|3900
exaggerate|/ɪɡˈzædʒəreɪt/|v. 夸张|6ki|5400
exceed|/ɪkˈsiːd/|v. 超过|6ki|3700
exception|/ɪkˈsepʃn/|n. 例外|46|2900
excessive|/ɪkˈsesɪv/|a. 过度的|6ki|4500
exclude|/ɪkˈskluːd/|v. 排除|6kt|4000
executive|/ɪɡˈzekjətɪv/|n. 主管|46|2800
exhibit|/ɪɡˈzɪbɪt/|v. 展览|6ki|4200
expand|/ɪkˈspænd/|v. 扩大|46|2700
expense|/ɪkˈspens/|n. 费用|g4|2300
exploit|/ɪkˈsplɔɪt/|v. 开发；利用|6kt|4400
expose|/ɪkˈspəʊz/|v. 暴露；揭露|46|2900
extend|/ɪkˈstend/|v. 延伸|46|2400
external|/ɪkˈstɜːnl/|a. 外部的|46k|3100
extraordinary|/ɪkˈstrɔːdnri/|a. 非凡的|46|3800
extreme|/ɪkˈstriːm/|a. 极端的|46|2600
facilitate|/fəˈsɪlɪteɪt/|v. 促进|6kt|4900
factor|/ˈfæktər/|n. 因素|46|2000
failure|/ˈfeɪliər/|n. 失败|g4|2100
fascinate|/ˈfæsɪneɪt/|v. 使着迷|6i|5200
feature|/ˈfiːtʃər/|n. 特征|46|1800
financial|/faɪˈnænʃl/|a. 金融的|46|2200
flexible|/ˈfleksəbl/|a. 灵活的|46|3400
fluent|/ˈfluːənt/|a. 流利的|46i|4800
focus|/ˈfəʊkəs/|v. 集中 n. 焦点|46|1700
forbid|/fəˈbɪd/|v. 禁止|g4|4200
forecast|/ˈfɔːkɑːst/|v./n. 预测|46|4000
formal|/ˈfɔːml/|a. 正式的|46|2800
formula|/ˈfɔːmjələ/|n. 公式|6kt|4300
fortune|/ˈfɔːtʃuːn/|n. 财富；运气|46|3300
foundation|/faʊnˈdeɪʃn/|n. 基础|46|2600
fundamental|/ˌfʌndəˈmentl/|a. 基本的|46k|3100
generate|/ˈdʒenəreɪt/|v. 产生|46|2600
generous|/ˈdʒenərəs/|a. 慷慨的|46|3600
genuine|/ˈdʒenjuɪn/|a. 真正的|6ki|4100
global|/ˈɡləʊbl/|a. 全球的|46|2000
govern|/ˈɡʌvn/|v. 统治；管理|46|2500
gradual|/ˈɡrædʒuəl/|a. 逐渐的|46k|4200
guarantee|/ˌɡærənˈtiː/|v./n. 保证|46|3100
harmony|/ˈhɑːməni/|n. 和谐|6i|4700
hesitate|/ˈhezɪteɪt/|v. 犹豫|46|4100
highlight|/ˈhaɪlaɪt/|v. 强调 n. 亮点|46|3400
horizon|/həˈraɪzn/|n. 地平线；视野|6i|4500
humble|/ˈhʌmbl/|a. 谦虚的|6ki|5000
identical|/aɪˈdentɪkl/|a. 完全相同的|6kt|4600
identify|/aɪˈdentɪfaɪ/|v. 识别|46|2300
ignore|/ɪɡˈnɔːr/|v. 忽视|46|2500
illustrate|/ˈɪləstreɪt/|v. 说明|6ki|4100
immediate|/ɪˈmiːdiət/|a. 立即的|46|2300
impact|/ˈɪmpækt/|n. 影响|46|2100
implement|/ˈɪmplɪment/|v. 实施|6kt|3500
implication|/ˌɪmplɪˈkeɪʃn/|n. 含义|6ki|3800
impose|/ɪmˈpəʊz/|v. 强加|6kt|4000
impressive|/ɪmˈpresɪv/|a. 令人印象深刻的|46|3200
incident|/ˈɪnsɪdənt/|n. 事件|46k|3500
indicate|/ˈɪndɪkeɪt/|v. 表明|46|2400
individual|/ˌɪndɪˈvɪdʒuəl/|a. 个人的|46|1800
inevitable|/ɪnˈevɪtəbl/|a. 不可避免的|6ki|4200
influence|/ˈɪnfluəns/|n./v. 影响|g4|1600
initial|/ɪˈnɪʃl/|a. 最初的|46|2700
innocent|/ˈɪnəsnt/|a. 无辜的|46|3900
innovation|/ˌɪnəˈveɪʃn/|n. 创新|6ki|3400
insight|/ˈɪnsaɪt/|n. 洞察力|6ki|3600
inspect|/ɪnˈspekt/|v. 检查|6ki|4400
instance|/ˈɪnstəns/|n. 实例|46|2800
institute|/ˈɪnstɪtjuːt/|n. 学院|46|3000
integrate|/ˈɪntɪɡreɪt/|v. 整合|6kt|3700
intelligent|/ɪnˈtelɪdʒənt/|a. 聪明的|g4|2600
intense|/ɪnˈtens/|a. 强烈的|6ki|3800
intention|/ɪnˈtenʃn/|n. 意图|46|2900
interact|/ˌɪntərˈækt/|v. 互动|6ki|3500
interpret|/ɪnˈtɜːprɪt/|v. 解释；口译|46k|3400
investigate|/ɪnˈvestɪɡeɪt/|v. 调查|46|3200
involve|/ɪnˈvɒlv/|v. 涉及|46|2000
isolate|/ˈaɪsəleɪt/|v. 隔离|6ki|4300
issue|/ˈɪʃuː/|n. 问题|46|1700
justify|/ˈdʒʌstɪfaɪ/|v. 证明...正当|6ki|4100
label|/ˈleɪbl/|n. 标签|46|3200
launch|/lɔːntʃ/|v. 发射；发起|46|2600
layer|/ˈleɪər/|n. 层|46|3100
lecture|/ˈlektʃər/|n./v. 讲座|g4|3000
legislation|/ˌledʒɪsˈleɪʃn/|n. 立法|6kt|4500
liberal|/ˈlɪbərəl/|a. 自由的|6ki|4200
limitation|/ˌlɪmɪˈteɪʃn/|n. 限制|46|3300
literary|/ˈlɪtərəri/|a. 文学的|6ki|4600
literature|/ˈlɪtrətʃər/|n. 文学|g4|2800
maintain|/meɪnˈteɪn/|v. 维持|46|2000
major|/ˈmeɪdʒər/|a. 主要的|g4|1400
manufacture|/ˌmænjuˈfæktʃər/|v./n. 制造|46|3400
margin|/ˈmɑːdʒɪn/|n. 边缘；利润|6kt|3800
massive|/ˈmæsɪv/|a. 大量的|6ki|3200
mature|/məˈtʃʊər/|a. 成熟的|46k|3900
maximum|/ˈmæksɪməm/|a. 最大的|46|3100
measure|/ˈmeʒər/|v. 测量 n. 措施|g4|1600
mechanism|/ˈmekənɪzəm/|n. 机制|6kt|3900
medium|/ˈmiːdiəm/|n. 媒介 a. 中等的|46|2800
mental|/ˈmentl/|a. 精神的|46|2600
method|/ˈmeθəd/|n. 方法|g4|1700
military|/ˈmɪlɪtri/|a. 军事的|46|2400
minimum|/ˈmɪnɪməm/|a. 最小的|46|3200
minor|/ˈmaɪnər/|a. 次要的|46|2700
modify|/ˈmɒdɪfaɪ/|v. 修改|6ki|4100
monitor|/ˈmɒnɪtər/|v. 监控|46|3300
motive|/ˈməʊtɪv/|n. 动机|6kr|5200
mutual|/ˈmjuːtʃuəl/|a. 相互的|6ki|4000
negotiate|/nɪˈɡəʊʃieɪt/|v. 谈判|6ki|4200
nevertheless|/ˌnevəðəˈles/|ad. 然而|6ki|4500
notion|/ˈnəʊʃn/|n. 概念|6kt|4300
nuclear|/ˈnjuːkliər/|a. 核的|46|3800
objective|/əbˈdʒektɪv/|n. 目标 a. 客观的|46|2600
obligation|/ˌɒblɪˈɡeɪʃn/|n. 义务|6kt|4400
obstacle|/ˈɒbstəkl/|n. 障碍|6ki|4300
obtain|/əbˈteɪn/|v. 获得|46|2800
obvious|/ˈɒbviəs/|a. 明显的|46|2600
occupy|/ˈɒkjupaɪ/|v. 占据|46|3200
offend|/əˈfend/|v. 冒犯|6ki|5100
operate|/ˈɒpəreɪt/|v. 操作；运营|g4|1900
opponent|/əˈpəʊnənt/|n. 对手|6ki|4200
opportunity|/ˌɒpəˈtjuːnəti/|n. 机会|g4|1500
optimistic|/ˌɒptɪˈmɪstɪk/|a. 乐观的|6i|4800
origin|/ˈɒrɪdʒɪn/|n. 起源|46|2700
outcome|/ˈaʊtkʌm/|n. 结果|46k|3100
outline|/ˈaʊtlaɪn/|n. 轮廓；大纲|46|3500
output|/ˈaʊtpʊt/|n. 产量；输出|46|2900
overcome|/ˌəʊvəˈkʌm/|v. 克服|46|3400
overlook|/ˌəʊvəˈlʊk/|v. 忽视|6ki|4300
overwhelming|/ˌəʊvəˈwelmɪŋ/|a. 压倒性的|6ki|4600
participate|/pɑːˈtɪsɪpeɪt/|v. 参加|g4|2200
particular|/pəˈtɪkjələr/|a. 特定的|46|2000
passion|/ˈpæʃn/|n. 热情|46|3100
perceive|/pəˈsiːv/|v. 感知|6kt|3900
permanent|/ˈpɜːmənənt/|a. 永久的|46k|3500
permit|/pəˈmɪt/|v. 允许|46|2900
perspective|/pəˈspektɪv/|n. 观点|6ki|3500
phenomenon|/fəˈnɒmɪnən/|n. 现象|6kt|4100
philosophy|/fəˈlɒsəfi/|n. 哲学|6kr|4300
physical|/ˈfɪzɪkl/|a. 身体的；物理的|g4|1800
platform|/ˈplætfɔːm/|n. 平台|46|3200
plunge|/plʌndʒ/|v. 投入；暴跌|6kr|5400
portion|/ˈpɔːʃn/|n. 部分|6kt|3900
positive|/ˈpɒzətɪv/|a. 积极的|46|2100
possess|/pəˈzes/|v. 拥有|46k|3400
potential|/pəˈtenʃl/|a. 潜在的|46|2400
poverty|/ˈpɒvəti/|n. 贫穷|46k|3800
practical|/ˈpræktɪkl/|a. 实际的|46|2300
precisely|/prɪˈsaɪsli/|ad. 精确地|6ki|4200
predict|/prɪˈdɪkt/|v. 预测|46|3000
preliminary|/prɪˈlɪmɪnəri/|a. 初步的|6kt|5100
preserve|/prɪˈzɜːv/|v. 保存|46k|3200
previous|/ˈpriːviəs/|a. 以前的|46|2200
primary|/ˈpraɪməri/|a. 主要的|g4|1900
principal|/ˈprɪnsəpl/|a. 主要的 n. 校长|46|2800
principle|/ˈprɪnsəpl/|n. 原则|46|2400
priority|/praɪˈɒrəti/|n. 优先权|46|2900
procedure|/prəˈsiːdʒər/|n. 程序|6kt|3600
process|/ˈprəʊses/|n. 过程 v. 处理|g4|1300
produce|/prəˈdjuːs/|v. 生产|g4|1400
profession|/prəˈfeʃn/|n. 职业|46|2700
profit|/ˈprɒfɪt/|n. 利润|46|2500
profound|/prəˈfaʊnd/|a. 深刻的|6kr|4500
prohibit|/prəˈhɪbɪt/|v. 禁止|6ki|4700
project|/ˈprɒdʒekt/|n. 项目|g4|1500
promote|/prəˈməʊt/|v. 促进；晋升|46|2500
proportion|/prəˈpɔːʃn/|n. 比例|46k|3200
propose|/prəˈpəʊz/|v. 提议|46|2700
prospect|/ˈprɒspekt/|n. 前景|6ki|3800
prosper|/ˈprɒspər/|v. 繁荣|6kr|5600
provision|/prəˈvɪʒn/|n. 供应；条款|6kt|3700
psychology|/saɪˈkɒlədʒi/|n. 心理学|46|3400
pursue|/pəˈsjuː/|v. 追求|6ki|3500
qualify|/ˈkwɒlɪfaɪ/|v. 使合格|46|3600
random|/ˈrændəm/|a. 随机的|6ki|3900
rational|/ˈræʃnl/|a. 理性的|6kr|4400
reaction|/riˈækʃn/|n. 反应|46|2300
reasonable|/ˈriːznəbl/|a. 合理的|46|2700
reckon|/ˈrekən/|v. 认为；估计|6i|5500
recognize|/ˈrekəɡnaɪz/|v. 认出；承认|46|2100
recommend|/ˌrekəˈmend/|v. 推荐|g4|2600
recover|/rɪˈkʌvər/|v. 恢复|46|2800
reform|/rɪˈfɔːm/|v./n. 改革|46|3100
region|/ˈriːdʒən/|n. 地区|46|2200
register|/ˈredʒɪstər/|v. 登记|46|3200
regulate|/ˈreɡjuleɪt/|v. 调节；管理|6kt|3800
reinforce|/ˌriːɪnˈfɔːs/|v. 加强|6kt|4500
reject|/rɪˈdʒekt/|v. 拒绝|46|2800
relevant|/ˈreləvənt/|a. 相关的|46k|2900
relieve|/rɪˈliːv/|v. 减轻|46|3500
reluctant|/rɪˈlʌktənt/|a. 不情愿的|6ki|4800
remark|/rɪˈmɑːk/|v./n. 评论|46|3100
render|/ˈrendər/|v. 使成为|6kt|4200
represent|/ˌreprɪˈzent/|v. 代表|46|2100
reproduce|/ˌriːprəˈdjuːs/|v. 繁殖；复制|6kt|4400
reputation|/ˌrepjuˈteɪʃn/|n. 名声|46|3300
require|/rɪˈkwaɪər/|v. 需要|g4|1500
research|/rɪˈsɜːtʃ/|n./v. 研究|g4|1500
reserve|/rɪˈzɜːv/|v. 预订；保留|46|2900
resident|/ˈrezɪdənt/|n. 居民|46k|3400
resist|/rɪˈzɪst/|v. 抵抗|46|3200
resolve|/rɪˈzɒlv/|v. 解决|46k|2900
resource|/rɪˈsɔːs/|n. 资源|g4|1800
respond|/rɪˈspɒnd/|v. 回答|46|2100
restore|/rɪˈstɔːr/|v. 恢复|46k|3400
restrain|/rɪˈstreɪn/|v. 抑制|6kt|4500
restrict|/rɪˈstrɪkt/|v. 限制|46|3200
retain|/rɪˈteɪn/|v. 保持|6kt|3600
retreat|/rɪˈtriːt/|v./n. 撤退|6ki|4600
reveal|/rɪˈviːl/|v. 揭示；透露|46|2800
revenue|/ˈrevənjuː/|n. 收入；税收|46k|3300
reverse|/rɪˈvɜːs/|v. 颠倒 a. 相反的|46|3100
revolution|/ˌrevəˈluːʃn/|n. 革命|46|2700
rival|/ˈraɪvl/|n. 对手 a. 竞争的|6ki|4400
routine|/ruːˈtiːn/|n. 常规 a. 日常的|46|3200
sacrifice|/ˈsækrɪfaɪs/|n./v. 牺牲|46k|3700
sample|/ˈsɑːmpl/|n. 样本|g4|2400
satellite|/ˈsætəlaɪt/|n. 卫星|46|4100
schedule|/ˈʃedjuːl/|n. 时间表|g4|2600
scheme|/skiːm/|n. 计划；方案|46|3300
scholar|/ˈskɒlər/|n. 学者|46|3800
scope|/skəʊp/|n. 范围|6ki|3600
security|/sɪˈkjʊərəti/|n. 安全|g4|2000
seek|/siːk/|v. 寻求|g4|2200
select|/sɪˈlekt/|v. 选择|g4|2100
sequence|/ˈsiːkwəns/|n. 顺序|6kt|3900
session|/ˈseʃn/|n. 会议；一段时间|46|2700
settle|/ˈsetl/|v. 解决；定居|g4|2500
severe|/sɪˈvɪər/|a. 严重的|46k|3400
shift|/ʃɪft/|v. 转变 n. 转变|46|2800
significance|/sɪɡˈnɪfɪkəns/|n. 重要性|46k|3200
similar|/ˈsɪmɪlər/|a. 相似的|g4|1700
simulate|/ˈsɪmjuleɪt/|v. 模拟|6kt|4800
slight|/slaɪt/|a. 轻微的|46|3100
solar|/ˈsəʊlər/|a. 太阳的|46|3900
somehow|/ˈsʌmhaʊ/|ad. 以某种方式|g4|3000
sophisticated|/səˈfɪstɪkeɪtɪd/|a. 复杂的；精密的|6ki|4700
source|/sɔːs/|n. 来源|g4|1600
specific|/spəˈsɪfɪk/|a. 具体的|46|2000
sponsor|/ˈspɒnsər/|n. 赞助者 v. 赞助|6ki|4300
stable|/ˈsteɪbl/|a. 稳定的|46|2900
standard|/ˈstændəd/|n. 标准|g4|1700
statistic|/stəˈtɪstɪk/|n. 统计|46|3500
status|/ˈsteɪtəs/|n. 地位；状态|46|2200
steady|/ˈstedi/|a. 稳定的|46|3300
stimulate|/ˈstɪmjuleɪt/|v. 刺激|6kt|4200
strategy|/ˈstrætədʒi/|n. 策略|46|2300
stress|/stres/|n. 压力 v. 强调|g4|2100
structure|/ˈstrʌktʃər/|n. 结构|46|2000
submit|/səbˈmɪt/|v. 提交；服从|46|2900
subsequent|/ˈsʌbsɪkwənt/|a. 随后的|6ki|3800
substance|/ˈsʌbstəns/|n. 物质|46k|3100
substantial|/səbˈstænʃl/|a. 大量的|6kt|3600
substitute|/ˈsʌbstɪtjuːt/|n. 替代品 v. 替代|6ki|4100
subtle|/ˈsʌtl/|a. 微妙的|6ki|4500
sufficient|/səˈfɪʃnt/|a. 足够的|46k|3400
summarize|/ˈsʌməraɪz/|v. 总结|46|3700
superior|/suːˈpɪəriər/|a. 优越的|46k|3500
supplement|/ˈsʌplɪment/|n. 补充 v. 补充|6ki|4200
suppose|/səˈpəʊz/|v. 假设|g4|2000
surrender|/səˈrendər/|v. 投降；放弃|6ki|4900
survey|/ˈsɜːveɪ/|n./v. 调查|46|2600
survive|/səˈvaɪv/|v. 幸存|g4|2400
suspect|/səˈspekt/|v. 怀疑 n. 嫌疑犯|46|3000
suspend|/səˈspend/|v. 暂停；悬挂|6ki|4400
sustain|/səˈsteɪn/|v. 维持；支撑|6kt|3500
symbol|/ˈsɪmbl/|n. 象征|46|3100
sympathy|/ˈsɪmpəθi/|n. 同情|6ki|4600
target|/ˈtɑːɡɪt/|n. 目标|g4|1900
technical|/ˈteknɪkl/|a. 技术的|g4|2200
technique|/tekˈniːk/|n. 技术|g4|2300
technology|/tekˈnɒlədʒi/|n. 技术|g4|1500
temporary|/ˈtemprəri/|a. 暂时的|46|3000
tendency|/ˈtendənsi/|n. 趋势|46k|3600
territory|/ˈterɪtəri/|n. 领土|46k|3800
theory|/ˈθɪəri/|n. 理论|g4|1800
threat|/θret/|n. 威胁|46|2600
threaten|/ˈθretn/|v. 威胁|46|2800
tolerance|/ˈtɒlərəns/|n. 容忍|6ki|4700
trace|/treɪs/|v. 追踪 n. 痕迹|46|2900
tradition|/trəˈdɪʃn/|n. 传统|g4|2100
transform|/trænsˈfɔːm/|v. 转变|46|2700
transmit|/trænsˈmɪt/|v. 传播；传输|6kt|3900
transparent|/trænsˈpærənt/|a. 透明的|6ki|4500
trigger|/ˈtrɪɡər/|v. 触发 n. 触发器|6ki|3800
triumph|/ˈtraɪʌmf/|n. 胜利|6kr|5000
tropical|/ˈtrɒpɪkl/|a. 热带的|46|4200
ultimate|/ˈʌltɪmət/|a. 最终的|6ki|3400
undergo|/ˌʌndəˈɡəʊ/|v. 经历|46k|3500
undermine|/ˌʌndəˈmaɪn/|v. 破坏；削弱|6kr|5100
uniform|/ˈjuːnɪfɔːm/|n. 制服 a. 统一的|46|3300
unique|/juˈniːk/|a. 独特的|46|2600
utilize|/ˈjuːtəlaɪz/|v. 利用|6kt|3900
valid|/ˈvælɪd/|a. 有效的|6ki|3800
value|/ˈvæljuː/|n. 价值|g4|1200
vanish|/ˈvænɪʃ/|v. 消失|46|3900
variable|/ˈveəriəbl/|n. 变量 a. 可变的|6kt|3700
venture|/ˈventʃər/|n. 冒险 v. 敢于|6ki|4400
version|/ˈvɜːʃn/|n. 版本|46|2500
viable|/ˈvaɪəbl/|a. 可行的|6kt|5200
victim|/ˈvɪktɪm/|n. 受害者|46|3100
violate|/ˈvaɪəleɪt/|v. 违反|6kt|4500
violence|/ˈvaɪələns/|n. 暴力|46|2800
virtual|/ˈvɜːtʃuəl/|a. 虚拟的|6ki|3600
visible|/ˈvɪzəbl/|a. 可见的|46|2900
vision|/ˈvɪʒn/|n. 视力；愿景|46|2500
vital|/ˈvaɪtl/|a. 至关重要的|6ki|3400
vivid|/ˈvɪvɪd/|a. 生动的|6i|4600
volume|/ˈvɒljuːm/|n. 体积；卷；音量|46|2700
voluntary|/ˈvɒləntri/|a. 自愿的|6ki|4300
vulnerable|/ˈvʌlnərəbl/|a. 脆弱的|6ki|4100
wealth|/welθ/|n. 财富|g4|2600
welfare|/ˈwelfeər/|n. 福利|46k|3700
whereas|/weərˈæz/|conj. 然而|6ki|4200
witness|/ˈwɪtnəs/|n. 证人 v. 目睹|46|3000
worthwhile|/ˌwɜːθˈwaɪl/|a. 值得的|46|4500
yield|/jiːld/|v. 产生；屈服|6kt|3800
zone|/zəʊn/|n. 地区；地带|g4|2800`;

// Tag mapping
const tagMap = { g: 'gk', '4': 'cet4', '6': 'cet6', k: 'ky', i: 'ielts', t: 'toefl', r: 'gre' };

function expandTags(short) {
  return short.split('').map(c => tagMap[c] || c).join(',');
}

// Build dictionary
const dict = {};
const lemmaMap = {};

// Common irregular forms
const irregulars = {
  // be
  'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be',
  // have
  'has': 'have', 'had': 'have', 'having': 'have',
  // do
  'does': 'do', 'did': 'do', 'doing': 'do', 'done': 'do',
  // go
  'goes': 'go', 'went': 'go', 'going': 'go', 'gone': 'go',
  // common -s/-ed/-ing patterns are handled algorithmically below
};

// Add irregular forms to lemma map
for (const [form, base] of Object.entries(irregulars)) {
  lemmaMap[form] = base;
}

// Parse word list
const lines = raw.trim().split('\n');
for (const line of lines) {
  const [word, phonetic, translation, tagShort, frqStr] = line.split('|');
  if (!word) continue;
  
  dict[word] = {
    p: phonetic,
    t: translation,
    tag: expandTags(tagShort),
    frq: parseInt(frqStr, 10),
  };
  
  // Generate common inflected forms for lemma map
  // -s/-es (plurals, third person)
  if (word.endsWith('e')) {
    lemmaMap[word + 's'] = word;
    lemmaMap[word + 'd'] = word;
  } else {
    lemmaMap[word + 's'] = word;
    lemmaMap[word + 'es'] = word;
  }
  
  // -ed (past tense)
  if (word.endsWith('e')) {
    lemmaMap[word + 'd'] = word;
  } else if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2])) {
    lemmaMap[word.slice(0, -1) + 'ied'] = word;
  } else {
    lemmaMap[word + 'ed'] = word;
  }
  
  // -ing
  if (word.endsWith('e') && !word.endsWith('ee')) {
    lemmaMap[word.slice(0, -1) + 'ing'] = word;
  } else {
    lemmaMap[word + 'ing'] = word;
  }
  
  // -er (comparative)
  if (word.endsWith('e')) {
    lemmaMap[word + 'r'] = word;
  } else if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2])) {
    lemmaMap[word.slice(0, -1) + 'ier'] = word;
  } else {
    lemmaMap[word + 'er'] = word;
  }
  
  // -est (superlative)
  if (word.endsWith('e')) {
    lemmaMap[word + 'st'] = word;
  } else if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2])) {
    lemmaMap[word.slice(0, -1) + 'iest'] = word;
  } else {
    lemmaMap[word + 'est'] = word;
  }
  
  // -ly (adverb)
  if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2])) {
    lemmaMap[word.slice(0, -1) + 'ily'] = word;
  } else if (word.endsWith('le')) {
    lemmaMap[word.slice(0, -2) + 'ly'] = word;
  } else {
    lemmaMap[word + 'ly'] = word;
  }
  
  // -ness
  lemmaMap[word + 'ness'] = word;
  
  // -ment
  if (word.endsWith('e')) {
    lemmaMap[word + 'ment'] = word;
    lemmaMap[word.slice(0, -1) + 'ment'] = word;
  } else {
    lemmaMap[word + 'ment'] = word;
  }
  
  // -tion/-ation
  if (word.endsWith('e') && word.length > 3) {
    lemmaMap[word.slice(0, -1) + 'ation'] = word;
  }
}

// Write output
const dictPath = path.join(DATA_DIR, 'dict.json');
const lemmaPath = path.join(DATA_DIR, 'lemma.json');

fs.writeFileSync(dictPath, JSON.stringify(dict));
fs.writeFileSync(lemmaPath, JSON.stringify(lemmaMap));

const dictSize = (fs.statSync(dictPath).size / 1024).toFixed(1);
const lemmaSize = (fs.statSync(lemmaPath).size / 1024).toFixed(1);

console.log('Dictionary generated:');
console.log(`  dict.json: ${dictSize} KB (${Object.keys(dict).length} words)`);
console.log(`  lemma.json: ${lemmaSize} KB (${Object.keys(lemmaMap).length} mappings)`);
