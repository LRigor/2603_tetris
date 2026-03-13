# 2603 Tetris — H5 单机 Demo

React + PixiJS 的俄罗斯方块小游戏，纯前端单机可玩，适合作为 H5 小游戏模板，后续可用 Cursor/AI 扩展更多玩法。

## 技术栈

- **React 19** + **TypeScript** + **Vite**
- **PixiJS v8**：2D WebGL 渲染
- **@pixi/react**：在 React 里用 JSX 写 Pixi 场景（`<pixiContainer>`, `<pixiGraphics>`）

## 运行

```bash
npm install
npm run dev
```

浏览器打开控制台给出的地址（如 `http://localhost:5173`）即可玩。

## 操作

| 按键 | 作用 |
|------|------|
| ← → | 左右移动 |
| ↑ | 旋转 |
| ↓ | 软降（加速下落） |
| 空格 | 硬降（一键落底） |

开始 / 再来一局：点 **Start** 或 **Play Again**；游戏中可点 **Pause** / **Resume**。

## 项目结构

```
src/
  game/
    tetris.ts      # 纯逻辑：棋盘、方块、碰撞、消行、分数
    TetrisStage.tsx # Pixi 画布 + 游戏循环 + 键盘
  App.tsx
  main.tsx
```

- 逻辑与渲染分离：`tetris.ts` 无依赖，方便单测或换渲染方式。
- 渲染：用 PixiJS Graphics 画棋盘和方块，带简单阴影和幽灵块（落点预览）。

## 后续可做

- 加「下一个方块」预览
- 音效与简单动画
- 本地最高分（localStorage）
- 用 Cursor 按需求改规则或加新 H5 小游戏

## 参考

- [PixiJS](https://pixijs.com) — The HTML5 Creation Engine
- [@pixi/react](https://react.pixijs.io) — React 绑定
