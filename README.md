# Games-Strongly-Correlated
vibe games

## 凝聚态玩法馆 / Correlated Playroom

一个中文、无需构建的凝聚态物理小游戏集合。当前首页主推 **空穴贪吃蛇（t–Jz）**：无界探索冲分与八关限能聚团；另有 **环面暗战（Toric Code）**，保留 **磁弦路径实验室**、**一维量子对照**，以及原有八关内容与存档的 **夜航实验室**入口。全部计算在浏览器本地执行，无需账号、后端、API 密钥或第三方运行库。

### 开始运行

```sh
npm run dev
# 打开 http://localhost:4173
npm test
```

开发服务器使用 Python 3；自动测试使用 Node.js 20+。无需 npm install 或打包。静态托管直接发布 `dist/`。其中的 HTML、CSS、JS 是可直接审阅的规范源码，不是压缩构建产物。

- `/`：玩法馆首页
- `/toric.html`：环面暗战
- `/snake.html`：空穴贪吃蛇，无限冲分 / 八关限能聚团
- `/snake-lab.html`：保留的磁弦接力，守恒空穴与自旋的二维路径实验
- `/quantum.html`：一维精确量子对照实验（磁弦玩法的科学对照，不是另一款对抗游戏）
- `/lab/index.html`：夜航实验室，保留旧版 `correlated-escape-v1` 存档

### 环面暗战：秘密链、侦察与全局记忆

在 5×5 周期方格上，攻击者秘密布置 X/Z 错误链；守方根据可见的任意子端点，选择纠错路径。Z 作用于顶点上的 e，X 作用于面心的 m。同种端点可以移动、成对创建和融合，e 与 m 不会相互湮灭。同边 X+Z 对应 Y，按两个错误分量计费。

- 每种错误分量最多 4 条边，X/Z 合计最多 6；布错提交时必须保留非零综合征。
- 探针查看一条边的**原始经典外部错误日志**（I/X/Z/Y）；纠错不会改变日志，撤销草稿不会退回探针或已知信息。它不是量子态测量。
- 任意子全部融合后才能提交恢复。最终判断错误链与纠错链的异或：残余闭合且四个绕行奇偶位全零，守方获胜；非零则发生逻辑错误，攻击者获胜。这里实际计算的是模 2 同调类，不能只凭端点消失或视觉上出现一条环判断胜负。
- 单人可选攻方或守方，对战本机 AI。入门使用短链；标准按合法候选链均匀先验选择策略；进阶采用近似极小极大混合策略。AI 守方只接收公开综合征、预算和侦察日志，不读取隐藏链，也不保证总能获胜。
- 本地双人采用同屏热座和护屏交接，并非联网对战。六局系列赛轮换攻守；每人 3 枚探针分配到自己的三次防守，每局最多用 2 枚，允许平局。
- 六课可操作教学依次介绍创建/移动/融合、对偶格 m、可收缩绕路、逻辑绕行、Y 与不同任意子、经典侦察日志。另有明牌自由练习。
- 揭晓后可分别查看原始错误、纠错草稿、残余链与绕行位。

这是借用理想 Toric Code 的 Pauli 链、稳定子综合征、Abelian 任意子融合和环面同调结构设计的**经典策略游戏**，不是完整量子模拟。没有哈密顿量实时演化、编织相位测量、非 Abelian 量子门或量子硬件仿真。错误预算、角色、探针、回合与计分都是游戏规则。

物理来源：[Kitaev, Fault-tolerant quantum computation by anyons](https://arxiv.org/abs/quant-ph/9707021)；[Error Correction Zoo · Toric code](https://errorcorrectionzoo.org/c/toric)。八关实验室的模型约定和来源另见 [source/PHYSICS.md](source/PHYSICS.md)。

### 主推玩法：空穴贪吃蛇

`/snake.html` 默认进入无限冲分待开始画面。蛇身是真实空穴构成的有序连通路径；靠近已有空穴只扩大控制集合，不删除空穴、不补入电子。R 换头只反转控制顺序。进入相邻尾端可旋转闭环的控制次序；蛇身内部因没有电子可交换而阻挡。

- 整条蛇前进拆成多个最近邻洞–电子交换；每个中间态都检查精确键能。画面连接各个真实空穴，亮环区分活动头端，移动光点表示被逐步搬运的电子。画面用于说明动作顺序，不是量子传播速度。
- 无限模式为确定种子的按需生成晶格，无固定屏幕围墙；镜头跟随头部。初始背景由坐标和种子确定，修改用稀疏覆盖保存；走出视区不会刷新自旋。没有宣称内存或机器坐标范围无限，也不给整个无限背景编造有限总粒子数。
- 显示有限控制长度，以及相对初态有限支持的 ΔN↑、ΔN↓、ΔNₕ、ΔSᶻ 守恒。相对交换能通过每一步受影响的真实键累积，并可独立重算有限支持差值。
- 每次首次纳入一个空穴得 100 分，重复经过、换头或控制旋转不得分。电池初始 100、上限 160，每个新空穴补充 35；宏步消耗为所有微观交换的 `1 + max(0, δE)` 之和除以链长。这个平均仅是游戏控制资源折扣，绝不归一化物理交换能。
- 自动前进间隔为 `max(180, 420 − 12 × min(已收集洞数, 20))` 毫秒。方向键 / WASD、触屏方向键或轻扫控制，空格暂停、R 换头。受阻自动暂停，提供失焦检测；离开页面前请手动暂停。新局取消旧计时器。“专注棋盘”是无需浏览器全屏权限的纯布局模式，收起页头与说明，将棋盘、暂停和方向控制留在视口内；随时退出返回普通版。两端均无可负担的前进或收集动作才判负。
- 本机最佳只记录正式无限冲分。切入步进练习会使本局失去纪录资格；无限模式没有撤销。收集连击只作节奏反馈，不重复奖励，也不改变物理能量。
- 八关限能解谜，从换端聚团、搬运、峰值能垒到双端绕行和反相墙；每关有明确有限空穴总数、中间态能量上限与“全部聚团”目标。允许撤销、重置和下一关。关卡解法经过模型测试；难度仍属于初版设计，没有宣称已完成广泛玩家平衡测试。

所有输入选择的是经典合法构型路径。收集、顺序、积分、电池、加速和预算都是游戏规则，不是量子束缚机制；游戏不演化二维量子态，不声称一般二维 t–Jz 可积。完整量子体系的交换能可与动能交换，构型交换能变化不能被解释成闭合体系总能量不守恒。

### 保留实验：磁弦接力 / t–Jz 守恒路径挑战

玩家选择空穴在二维开边界晶格上的合法路径，每一步只交换空穴与相邻电子，不凭格点位置翻转自旋。棋盘逐键精确计算 Ising 交换项 E_J = J_z Σ(SᶻᵢSᶻⱼ − nᵢnⱼ/4)：反平行占据键为 −J_z/2，同向或含空穴的键为 0。

- 三个教学关：三步拉弦与原路回溯、六步 Trugman 回路、沿反相域墙的低能路径。
- 多洞接力可选单域 Néel、直线反相墙和折弯反相墙三种背景。空穴数、N↑、N↓ 与总 Sᶻ 在每一步都保持不变；相邻洞仅交接控制权，不吞洞、不补电子。
- 允许回头、重走与穿越尾迹。尾迹只记录路径，积分、接力、自动前进、步数和交换能预算属于游戏层，均不是 t–Jz 的额外物理作用。
- 显示精确当前交换能、每步能差、四方向预测能差与守恒检查。默认离散步进，支持方向键、WASD、方向按钮和轻扫。
- 这是**合法构型路径与精确构型交换能**的经典交互实验，不是二维量子波函数演化，也不声称二维 t–Jz 一般可积。域墙是准备的非平衡背景，不会自动恢复或凭过墙获得能量奖励。

旧路径实验物理说明与论文来源在 `/snake-lab.html#physics`；新聚团游戏说明在 `/snake.html#physics`。完整量子模型中交换能可与动能交换；仅看构型交换能，不应声称闭合系统总能量不守恒。

### 一维量子对照：真实有限扇区精确对角化

`/quantum.html` 是磁弦路径的科学对照页。系统为 **8 格一维开链、2 个洞、6 个电子**；删去空穴后的自旋次序固定为 ↑↓↑↓↑↓。这个完整守恒扇区的维数为 C(8,2) = **28**，不是整个 t–Jz Hilbert 空间。

- 构造全部 28 个配置的实对称 Hamiltonian：合法相邻洞–电子交换矩阵元为 −t，交换对角项使用包含 −nᵢnⱼ/4 的标准约定，仅求和七条开放边界键。
- 用 Jacobi 算法完整对角化，再按 exp(−iHτ) 传播全部复振幅；不用经典随机游走或欧拉积分假装量子动力学。
- 展示各格空穴密度、全程能量曲线、最高概率配置与两洞相邻概率。交换能和动能可以变化，有符号的总和 ⟨H⟩ 守恒；归一、总空穴数、总 Sᶻ 与固定挤压自旋序列也保持不变。
- 参数或初始洞位置变化会暂停并重新制备 τ=0 初态，不是演化途中淬火。t=0 时初始配置只积累相位，概率不扩散；时间滑条可逆回看，不执行测量坍缩。
- “精确”指完整有限扇区求解，仍受浮点舍入误差影响。不把两洞相邻概率解释为束缚态或相分离的证明，也不把有限短时结果当作热力学相图；一维特定扇区的可积映射不推广到一般二维体系。

能量使用固定单位 E★，时间使用 ℏ/E★，不会除以可以设为零的 t。文献与交换项约定差异在页面科学说明中明确标注。

### 文件与验证

- `dist/index.html`、`arcade.css`、`arcade.js`：玩法馆与共用视觉/动态效果控制
- `dist/toric-model.js`：纯状态机、GF(2) 链、综合征、同调与公开视图
- `dist/toric-ai.js`：合法候选链枚举与仅用公开信息的防守策略
- `dist/toric-ui.js`、`toric.html`：棋盘、护屏、模式、教学、系列赛和复盘
- `dist/cluster-model.js`、`cluster-ui.js`、`snake.html`、`cluster.css`：聚团空穴蛇模型、无限世界、八关解谜与新主玩法界面
- `dist/snake-model.js`、`snake-ui.js`、`snake-lab.html`、`snake.css`：保留的守恒磁弦路径实验模型和界面
- `dist/quantum-model.js`、`quantum-ui.js`、`quantum.html`、`quantum.css`：28 维守恒扇区精确对角化与量子对照界面
- `dist/lab/`：保留的夜航实验室；根目录旧实验模型/界面文件继续用于兼容和原测试
- `tests/`：实验室数值/存档回归，Toric 规则、AI 公平性、教学与交互回归，以及磁弦逐步守恒、键能、回溯、Trugman、域墙与量子模型 Hermiticity、谱残差、幺正守恒回归
- `source/`：实验室的物理与实现说明

本次 Toric 版本通过 49 项自动测试，涵盖周期边端点、全部基本稳定子、四个逻辑环、同调切口不变性、错误预算、探针不可退还、秘密视图隔离、AI 同公开证据不受秘密链影响、六课结果、护屏 DOM 清理及异步 AI 换桌取消。第二玩法另外验证了守恒、合法路径、精确键能、300 局接力可解性，以及全部 28 个量子初态的归一、能量、洞数与时间反演。原磁弦与量子版本通过 70 项自动测试；新增聚团模型与界面后，以 `npm test` 的当前完整输出为准。桌面浏览器已验证主要玩法、护屏、系列赛、实验互链与量子演化；手机样式有响应式设计，但本轮未完成真实手机浏览器验证。

本轮空穴蛇新增后完整自动测试通过 101 项，包含聚团物理不变量、8 关可解性、控制器计时器、练习纪录隔离、专注布局切换、漏失焦事件的逐步守卫与 BFCache 返回。实际云端 Chromium 的原生切页测试没有可靠报告页面失焦，返回时仍观察到自动前进，因此该环境的真实切页自动暂停未通过；事件与逐 tick 守卫单测通过不等于实际浏览器测试通过。必要时应先手动暂停再切页。

空穴蛇局面只存在当前页面内存；种子可复玩，本机最佳和已完成关卡标记存于 localStorage，刷新不会恢复正在进行的局。Toric 对局只留在当前页面内存，刷新会结束本局。护屏是公平轮换礼仪，无法阻止开发者工具查看内存。实验室存档和动态效果偏好仅存在本机浏览器；无分析追踪或个人数据收集。界面支持键盘、符号区分颜色和减少动态效果。

未选择开源许可证；由仓库所有者另行决定。外部论文只链接，不随源码转载。

## 夜航实验室：原版说明

## 夜航实验室 / Correlated Escape

A Chinese, buildless interactive condensed-matter physics escape game. Six main rooms restore a deep-space station, followed by two research bonus rooms. All computation runs in the browser; no account, backend, API keys, analytics, or personal data collection.

### Run

```sh
npm run dev
## Open http://localhost:4173
npm test
```

Node 20+ is required only for the tests. Python 3 is required only for the convenience development server. Hosting serves `dist/` as-is; no build or install is needed.

### Architecture

- `dist/index.html` — semantic shell, dialogs and accessibility landmarks
- `dist/style.css` — responsive laboratory visual system, diagrams, reduced-motion behavior
- `dist/app.js` — interface, keyboard-compatible buttons, pointer controls, optional synthesized audio, local progress and file import/export
- `dist/game-models.js` — pure independent models, Jacobi eigensolver, state validation and serialization
- `dist/content.js` — Chinese goals, three-level hints, explanations, validity limits and primary sources
- `tests/models.test.js` — exhaustive numerical and state-machine regression suite
- `source/PHYSICS.md` — documented physical conventions and known solutions
- `source/ARCHITECTURE.md` — implementation notes and save contract

The files under `dist/` are the canonical source, not generated/minified output. This avoids redundant copies and enables direct review. A clean checkout is directly deployable.

### Rooms

1. Weighted antiferromagnetic Ising triangle: frustration and global energy optimization.
2. Strong-coupling Hubbard charge-blocking toy: distinguish Pauli exclusion from interaction cost; move a hole.
3. Eight-site SSH chain: arrange bonds, inspect exact near-zero eigenstates and edge probabilities.
4. Independent Schmidt compression modules: meet individual fidelity targets with a shared rank budget.
5. MPS representation ordering: reduce cut ranks in a product of three Bell pairs.
6. Static Z₂ gauge link puzzle: distinguish gauge transformations from physical flux insertion.
7. Hubbard dimer superexchange: trade charge fluctuation against the exact singlet–triplet gap.
8. Jordan–Wigner parity string: predict fixed-basis matrix elements across all eight intermediate occupations.

Each room exposes model boundaries and references. The game does not claim to simulate a thermodynamic phase transition or a full material.

### Progress, privacy and accessibility

Progress is stored only in this browser under `correlated-escape-v1`. JSON export/import is available in “存档”; malformed, oversized, unsupported, duplicate, out-of-order and physically unreachable saves are rejected before replacing current progress. Room reset preserves earned completion and supports undo. Full restart asks for confirmation.

Controls use native buttons, range inputs and checkboxes. MPS drag exchange also works by selecting two buttons with keyboard Enter/Space. The interface retains focus across updates, identifies signs using symbols as well as color, labels diagrams and uses a live status readout. Sound defaults off. Reduced-motion preferences disable moving stars, particles and transitions. Layout adapts to phones.

The interface uses system-font fallbacks and makes no third-party font or runtime-library requests. All diagrams and effects are authored locally; external references open only when clicked.

### Tests

The automated suite enumerates all 8 Ising configurations, all 128 SSH bond patterns, all 1,024 Schmidt allocations, all 720 MPS orders and all parity-ring/sample combinations. Eigenvectors are checked for orthonormality and `Hψ = Eψ`; all room initial states are unsolved. Hole transport, both gauge rounds, exact dimer thresholds, reducer purity and corrupted saves are covered.

### Original content and references

Game code, diagrams and explanations are original to this project. No third-party code or private user documents were copied. Referenced external publications retain their respective copyright; they are linked, not redistributed. No open-source license has been selected; the repository owner may choose one separately.
