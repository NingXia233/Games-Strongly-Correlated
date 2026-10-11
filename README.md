# Games-Strongly-Correlated
vibe games

## 凝聚态玩法馆 / Correlated Playroom

一个中文、无需构建的凝聚态物理小游戏集合。当前首页提供两张桌子：**环面暗战（Toric Code）**和保留原有八关内容与存档的**夜航实验室**。全部计算在浏览器本地执行，无需账号、后端、API 密钥或第三方运行库。

### 开始运行

```sh
npm run dev
# 打开 http://localhost:4173
npm test
```

开发服务器使用 Python 3；自动测试使用 Node.js 20+。无需 npm install 或打包。静态托管直接发布 `dist/`。其中的 HTML、CSS、JS 是可直接审阅的规范源码，不是压缩构建产物。

- `/`：玩法馆首页
- `/toric.html`：环面暗战
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

### 文件与验证

- `dist/index.html`、`arcade.css`、`arcade.js`：玩法馆与共用视觉/动态效果控制
- `dist/toric-model.js`：纯状态机、GF(2) 链、综合征、同调与公开视图
- `dist/toric-ai.js`：合法候选链枚举与仅用公开信息的防守策略
- `dist/toric-ui.js`、`toric.html`：棋盘、护屏、模式、教学、系列赛和复盘
- `dist/lab/`：保留的夜航实验室；根目录旧实验模型/界面文件继续用于兼容和原测试
- `tests/`：实验室数值/存档回归，以及 Toric 规则、AI 公平性、教学与交互回归
- `source/`：实验室的物理与实现说明

本次 Toric 版本通过 49 项自动测试，涵盖周期边端点、全部基本稳定子、四个逻辑环、同调切口不变性、错误预算、探针不可退还、秘密视图隔离、AI 同公开证据不受秘密链影响、六课结果、护屏 DOM 清理及异步 AI 换桌取消。执行 `npm test` 可复现。

Toric 对局只留在当前页面内存，刷新会结束本局。护屏是公平轮换礼仪，无法阻止开发者工具查看内存。实验室存档和动态效果偏好仅存在本机浏览器；无分析追踪或个人数据收集。界面支持键盘、符号区分颜色和减少动态效果。

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
